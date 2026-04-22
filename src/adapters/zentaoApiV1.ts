import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { resolveHttpBackend } from "../config.js";
import { AuthError, RemoteApiError } from "../errors.js";
import { logger } from "../logger.js";
import { curlRequestJson } from "./curlHttp.js";
import type {
  ActivateBugPayload,
  ResolveBugPayload,
  ZentaoAuthSession,
  ZentaoBug,
  ZentaoBugDetail,
  ZentaoProduct,
} from "../types/zentao.js";
import { isRetriableStatus, sleep } from "../utils/retry.js";

interface ApiClientOptions {
  baseURL: string;
  timeoutMs: number;
  retryCount: number;
}

interface LoginResult {
  token?: string;
  expiresAt?: number;
}

interface PaginatedList<T> {
  page?: number;
  total?: number;
  limit?: number;
  products?: T[];
  bugs?: T[];
}

export class ZentaoApiV1Adapter {
  private readonly client: AxiosInstance;
  private readonly retryCount: number;
  private readonly timeoutMs: number;
  private session?: ZentaoAuthSession;

  constructor(options: ApiClientOptions) {
    this.timeoutMs = options.timeoutMs;
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeoutMs,
      proxy: false,
      httpAgent: new HttpAgent({ keepAlive: false }),
      httpsAgent: new HttpsAgent({ keepAlive: false }),
    });
    this.retryCount = options.retryCount;
  }

  public async login(account: string, password: string): Promise<ZentaoAuthSession> {
    const data = await this.request<LoginResult>({
      method: "POST",
      url: "/tokens",
      data: {
        account,
        password,
      },
    });

    if (!data.token) {
      throw new AuthError("登录失败：禅道未返回 token。");
    }

    this.session = {
      baseUrl: this.client.defaults.baseURL ?? "",
      account,
      token: data.token,
      expiresAt: data.expiresAt,
    };

    return this.session;
  }

  public setToken(account: string, token: string): ZentaoAuthSession {
    this.session = {
      baseUrl: this.client.defaults.baseURL ?? "",
      account,
      token,
    };
    return this.session;
  }

  public setBaseUrl(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  public getSession(): ZentaoAuthSession | undefined {
    return this.session;
  }

  public clearSession(): void {
    this.session = undefined;
  }

  public async getProducts(): Promise<ZentaoProduct[]> {
    return this.withAuthRequest(async () => {
      const data = await this.request<PaginatedList<ZentaoProduct> | ZentaoProduct[]>({
        method: "GET",
        url: "/products",
      });

      if (Array.isArray(data)) {
        return data;
      }

      return data.products ?? [];
    });
  }

  public async getMyBugs(params?: {
    status?: string;
    productId?: number;
  }): Promise<ZentaoBug[]> {
    return this.withAuthRequest(async () => {
      if (params?.productId) {
        return this.getMyBugsByProduct(params.productId, params.status);
      }

      const products = await this.getProducts();
      const allBugs = new Map<number, ZentaoBug>();

      for (const product of products) {
        const bugs = await this.getMyBugsByProduct(product.id, params?.status);
        for (const bug of bugs) {
          allBugs.set(bug.id, bug);
        }
      }

      return Array.from(allBugs.values());
    });
  }

  public async getBugDetail(bugId: number): Promise<ZentaoBugDetail> {
    return this.withAuthRequest(() =>
      this.request<ZentaoBugDetail>({
        method: "GET",
        url: `/bugs/${bugId}`,
      }),
    );
  }

  public async resolveBug(bugId: number, payload: ResolveBugPayload): Promise<ZentaoBugDetail> {
    return this.withAuthRequest(async () => {
      // 禅道 OpenAPI v1：解决 Bug 为 POST /bugs/{id}/resolve（使用 PUT 可能路由不匹配，表现为“成功”但实际未解决）
      const body = this.buildResolveRequestBody(payload);
      const data = await this.request<ZentaoBugDetail>({
        method: "POST",
        url: `/bugs/${bugId}/resolve`,
        data: body,
      });

      if (data?.status === "resolved" || data?.status === "closed") {
        return data;
      }

      const fresh = await this.getBugDetail(bugId);
      if (fresh.status === "resolved" || fresh.status === "closed") {
        return fresh;
      }

      throw new RemoteApiError(
        `禅道接口已返回 200，但 Bug #${bugId} 仍为「${String(fresh.status)}」，未进入 resolved/closed。请检查权限、工作流或必填字段（如解决版本）。`,
        200,
        fresh,
      );
    });
  }

  /** 禅道 OpenAPI v1：激活（重新打开）Bug，POST /bugs/{id}/active */
  public async activateBug(bugId: number, payload: ActivateBugPayload = {}): Promise<ZentaoBugDetail> {
    return this.withAuthRequest(async () => {
      const body = this.buildActivateRequestBody(payload);
      const data = await this.request<ZentaoBugDetail>({
        method: "POST",
        url: `/bugs/${bugId}/active`,
        data: body,
      });

      if (data?.status === "active") {
        return data;
      }

      const fresh = await this.getBugDetail(bugId);
      if (fresh.status === "active") {
        return fresh;
      }

      throw new RemoteApiError(
        `禅道接口已返回 200，但 Bug #${bugId} 仍未激活（当前 status=${String(fresh.status)}）。请检查权限或该 Bug 是否允许激活。`,
        200,
        fresh,
      );
    });
  }

  /** 禅道 v1 文档要求部分字段；缺省时给常见默认值以提高成功率 */
  private buildResolveRequestBody(payload: ResolveBugPayload): Record<string, unknown> {
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const resolvedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 解决方案为 fixed 时固定传 trunk，否则部分禅道版本网页端展示异常
    const resolvedBuild =
      payload.resolution === "fixed"
        ? "trunk"
        : payload.resolvedBuild !== undefined && String(payload.resolvedBuild).trim() !== ""
          ? payload.resolvedBuild
          : "trunk";

    const body: Record<string, unknown> = {
      resolution: payload.resolution,
      resolvedBuild,
      resolvedDate,
    };

    if (payload.duplicateBug !== undefined) {
      body.duplicateBug = payload.duplicateBug;
    }
    if (payload.comment !== undefined && payload.comment !== "") {
      body.comment = payload.comment;
    }

    return body;
  }

  private buildActivateRequestBody(payload: ActivateBugPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (payload.assignedTo !== undefined && payload.assignedTo.trim() !== "") {
      body.assignedTo = payload.assignedTo.trim();
    }

    if (payload.comment !== undefined && payload.comment !== "") {
      body.comment = payload.comment;
    }

    let builds: string[];
    if (payload.openedBuild === undefined) {
      builds = ["trunk"];
    } else if (Array.isArray(payload.openedBuild)) {
      builds = payload.openedBuild.filter((b) => b.trim() !== "");
    } else {
      builds = payload.openedBuild.trim() === "" ? [] : [payload.openedBuild.trim()];
    }
    body.openedBuild = builds.length > 0 ? builds : ["trunk"];

    return body;
  }

  /**
   * 禅道部分接口在 HTTP 200 时仍返回 { "error": "..." }，需要显式判失败。
   */
  private throwIfZentaoBusinessError(data: unknown): void {
    if (!data || typeof data !== "object") {
      return;
    }

    const record = data as Record<string, unknown>;

    if ("error" in record) {
      const message = record.error;
      if (message !== undefined && message !== null && String(message).trim() !== "") {
        throw new RemoteApiError(String(message), 200, data);
      }
    }

    if (record.status === "fail") {
      const message = record.message ?? record.reason ?? "接口返回 status=fail";
      throw new RemoteApiError(String(message), 200, data);
    }
  }

  private async withAuthRequest<T>(runner: () => Promise<T>): Promise<T> {
    if (!this.session?.token) {
      throw new AuthError("尚未登录禅道，请先调用 initZentao。");
    }

    try {
      return await runner();
    } catch (error) {
      if (error instanceof RemoteApiError && error.statusCode === 401) {
        this.clearSession();
        throw new AuthError("禅道会话已过期，请重新调用 initZentao。", error);
      }
      throw error;
    }
  }

  private buildFullUrl(path: string, params?: Record<string, unknown>): string {
    const base = `${(this.client.defaults.baseURL ?? "").replace(/\/+$/, "")}/`;
    const relative = path.replace(/^\/+/, "");
    const url = new URL(relative, base);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private requestOnceCurl<T>(configReq: AxiosRequestConfig): T {
    const method = (configReq.method ?? "GET").toUpperCase();
    const fullUrl = this.buildFullUrl(String(configReq.url ?? ""), configReq.params as Record<string, unknown> | undefined);
    const headers: Record<string, string | undefined> = {
      Accept: "application/json",
    };
    if (this.session?.token) {
      headers.Token = this.session.token;
    }

    const { status, data } = curlRequestJson<T>({
      method,
      url: fullUrl,
      headers,
      body: configReq.data,
      timeoutMs: this.timeoutMs,
    });

    if (status >= 400) {
      throw new RemoteApiError(`禅道 HTTP ${status}`, status, data);
    }

    this.throwIfZentaoBusinessError(data);
    return data;
  }

  private async requestOnceAxios<T>(configReq: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>({
      ...configReq,
      headers: {
        ...(configReq.headers ?? {}),
        ...(this.session?.token ? { Token: this.session.token } : {}),
      },
    });
    this.throwIfZentaoBusinessError(response.data);
    return response.data;
  }

  private async request<T>(configReq: AxiosRequestConfig): Promise<T> {
    let lastError: unknown;
    const backend = resolveHttpBackend();

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      try {
        if (backend === "curl") {
          return this.requestOnceCurl<T>(configReq);
        }
        return await this.requestOnceAxios<T>(configReq);
      } catch (error) {
        lastError = error;
        const parsedError = this.toRemoteApiError(error);
        const canRetry =
          configReq.method?.toUpperCase() === "GET" &&
          attempt < this.retryCount &&
          isRetriableStatus(parsedError.statusCode);

        logger.warn(
          {
            attempt,
            backend,
            method: configReq.method,
            url: configReq.url,
            statusCode: parsedError.statusCode,
            canRetry,
          },
          "禅道 API 请求失败",
        );

        if (!canRetry) {
          throw parsedError;
        }

        await sleep(300 * 2 ** attempt);
      }
    }

    throw this.toRemoteApiError(lastError);
  }

  private toRemoteApiError(error: unknown): RemoteApiError {
    if (error instanceof RemoteApiError) {
      return error;
    }

    if (error instanceof AxiosError) {
      return new RemoteApiError(
        `禅道 API 调用失败：${error.message}`,
        error.response?.status,
        error,
      );
    }

    return new RemoteApiError("禅道 API 调用失败：未知错误。", undefined, error);
  }

  private async getMyBugsByProduct(productId: number, status?: string): Promise<ZentaoBug[]> {
    const pageSize = 100;
    const collected: ZentaoBug[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (collected.length < total) {
      const data = await this.request<PaginatedList<ZentaoBug> | ZentaoBug[]>({
        method: "GET",
        url: "/bugs",
        params: {
          product: productId,
          assignedTo: "me",
          limit: pageSize,
          page,
          ...(status && status !== "all" ? { status } : {}),
        },
      });

      if (Array.isArray(data)) {
        return data;
      }

      const batch = data.bugs ?? [];
      collected.push(...batch);
      total = typeof data.total === "number" ? data.total : collected.length;

      if (batch.length === 0 || batch.length < pageSize) {
        break;
      }
      page += 1;
    }

    return collected;
  }
}

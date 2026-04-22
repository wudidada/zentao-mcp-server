import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RemoteApiError } from "../errors.js";

export interface CurlJsonRequest {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs: number;
}

/**
 * 通过系统 curl 发起 HTTP 请求并解析 JSON。
 * 用于规避部分环境下 Node 内置 HTTP 客户端对禅道 Token 鉴权 GET 请求异常挂起的问题。
 */
export function curlRequestJson<T>(options: CurlJsonRequest): { status: number; data: T } {
  const method = options.method.toUpperCase();
  const seconds = Math.max(1, Math.ceil(options.timeoutMs / 1000));
  const bodyPath = join(tmpdir(), `zentao-mcp-${randomUUID()}.json`);

  const args: string[] = [
    "-sS",
    "-m",
    String(seconds),
    "-X",
    method,
    "-o",
    bodyPath,
    "-w",
    "%{http_code}",
  ];

  for (const [key, value] of Object.entries(options.headers)) {
    if (value === undefined || value === "") {
      continue;
    }
    args.push("-H", `${key}: ${value}`);
  }

  if (options.body !== undefined && ["POST", "PUT", "PATCH"].includes(method)) {
    if (!args.some((a, i) => i > 0 && args[i - 1] === "-H" && a.toLowerCase().startsWith("content-type:"))) {
      args.push("-H", "Content-Type: application/json");
    }
    args.push("--data-binary", JSON.stringify(options.body));
  }

  args.push(options.url);

  let statusText: string;
  try {
    statusText = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 64 }).trim();
  } catch (error) {
    try {
      unlinkSync(bodyPath);
    } catch {
      // ignore
    }
    throw new RemoteApiError(
      `curl 调用失败：${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error,
    );
  }

  const status = Number.parseInt(statusText, 10);
  const raw = readFileSync(bodyPath, "utf8");
  try {
    unlinkSync(bodyPath);
  } catch {
    // ignore
  }

  let data: T;
  try {
    data = raw === "" ? (undefined as T) : (JSON.parse(raw) as T);
  } catch (error) {
    throw new RemoteApiError(
      `禅道返回非 JSON 响应（HTTP ${Number.isFinite(status) ? status : "?"}）。`,
      Number.isFinite(status) ? status : undefined,
      error,
    );
  }

  return { status: Number.isFinite(status) ? status : 0, data };
}

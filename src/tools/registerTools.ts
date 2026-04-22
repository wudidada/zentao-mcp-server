import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthError, ValidationError } from "../errors.js";
import {
  activateBugSchema,
  getBugDetailSchema,
  getMyBugsSchema,
  initZentaoSchema,
  mcpInput,
  resolveBugSchema,
} from "../schemas/toolSchemas.js";
import type { AppContext } from "../server/context.js";
import { runActivateBugTool } from "./activateBug.js";
import { runGetBugDetailTool } from "./getBugDetail.js";
import { runGetMyBugsTool } from "./getMyBugs.js";
import { runInitZentaoTool } from "./initZentao.js";
import { runResolveBugTool } from "./resolveBug.js";
import { failure, success } from "./toolResult.js";

export function registerZentaoTools(server: McpServer, context: AppContext): void {
  server.registerTool(
    "initZentao",
    {
      description: "初始化禅道连接并登录（支持 password 或 token）。",
      inputSchema: mcpInput.initZentao,
    },
    async (input) => {
      try {
        const payload = initZentaoSchema.parse(input);
        const session = await runInitZentaoTool(context, payload);
        return success(
          {
            account: session.account,
            baseUrl: session.baseUrl,
            expiresAt: session.expiresAt,
          },
          "禅道连接初始化成功",
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "getProducts",
    {
      description: "获取禅道产品列表。",
      inputSchema: mcpInput.empty,
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const products = await context.bugService.getProducts();
        return success(products, "产品列表");
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "getMyBugs",
    {
      description: "按状态与产品筛选我的 bug 列表。",
      inputSchema: mcpInput.getMyBugs,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const payload = getMyBugsSchema.parse(input);
        const bugs = await runGetMyBugsTool(context, payload);
        return success(
          {
            total: bugs.length,
            bugs,
          },
          "我的 Bug 列表",
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "getBugDetail",
    {
      description: "查看单个 bug 详情。",
      inputSchema: mcpInput.getBugDetail,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const payload = getBugDetailSchema.parse(input);
        const detail = await runGetBugDetailTool(context, payload);
        return success(detail, `Bug #${payload.bugId} 详情`);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "resolveBug",
    {
      description: "提交 Bug 解决动作（fixed/notrepro/duplicate/...）。",
      inputSchema: mcpInput.resolveBug,
    },
    async (input) => {
      try {
        const payload = resolveBugSchema.parse(input);
        const detail = await runResolveBugTool(context, payload);
        return success(detail, `Bug #${payload.bugId} 已提交解决`);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "activateBug",
    {
      description:
        "激活（重新打开）Bug，对应禅道 API v1：POST /bugs/{id}/active。适用于已解决/已关闭后重新激活。",
      inputSchema: mcpInput.activateBug,
    },
    async (input) => {
      try {
        const payload = activateBugSchema.parse(input);
        const detail = await runActivateBugTool(context, payload);
        return success(detail, `Bug #${payload.bugId} 已激活`);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "healthCheck",
    {
      description: "检查当前会话与服务可用性。",
      inputSchema: mcpInput.empty,
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const session = context.authService.getSession();
        return success({
          service: "zentao-mcp-server",
          initialized: Boolean(session),
          account: session?.account ?? null,
          baseUrl: session?.baseUrl ?? null,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );
}

export function ensureBaseUrl(inputBaseUrl?: string, envBaseUrl?: string): string {
  const baseUrl = inputBaseUrl ?? envBaseUrl;
  if (!baseUrl) {
    throw new ValidationError("缺少禅道地址，请在 initZentao 传入 baseUrl 或配置 ZENTAO_BASE_URL。");
  }
  return baseUrl;
}

export function ensureAuthReady(account?: string): void {
  if (!account) {
    throw new AuthError("请先调用 initZentao 完成认证。");
  }
}

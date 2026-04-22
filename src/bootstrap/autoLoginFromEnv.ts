import { config } from "../config.js";
import { logger } from "../logger.js";
import type { AppContext } from "../server/context.js";

/**
 * 若配置了 ZENTAO_BASE_URL + ZENTAO_ACCOUNT +（ZENTAO_PASSWORD 或 ZENTAO_TOKEN），
 * 在 MCP 进程启动时自动完成登录，便于 Cursor 仅通过 mcp.json 的 env 即可使用工具。
 */
export async function tryAutoLoginFromEnv(context: AppContext): Promise<void> {
  const baseUrl = config.ZENTAO_BASE_URL?.trim();
  const account = config.ZENTAO_ACCOUNT?.trim();
  const password = config.ZENTAO_PASSWORD;
  const token = config.ZENTAO_TOKEN?.trim();

  if (!baseUrl) {
    logger.debug("未配置 ZENTAO_BASE_URL，跳过环境变量自动登录。");
    return;
  }
  if (!account) {
    logger.debug("未配置 ZENTAO_ACCOUNT，跳过环境变量自动登录。");
    return;
  }
  if (!token && (password === undefined || password === "")) {
    logger.debug("未配置 ZENTAO_PASSWORD 或 ZENTAO_TOKEN，跳过环境变量自动登录。");
    return;
  }

  context.adapter.setBaseUrl(baseUrl);

  if (token) {
    await context.authService.initLogin({ account, token });
    logger.info({ account }, "已从环境变量使用 token 完成禅道初始化。");
    return;
  }

  await context.authService.initLogin({ account, password });
  logger.info({ account }, "已从环境变量使用账号密码完成禅道登录。");
}

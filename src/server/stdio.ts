import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "../logger.js";
import { config } from "../config.js";
import { createAppContext } from "./context.js";
import { createMcpServer } from "./createMcpServer.js";
import { tryAutoLoginFromEnv } from "../bootstrap/autoLoginFromEnv.js";

export async function startStdioServer(): Promise<void> {
  const context = createAppContext(config.ZENTAO_BASE_URL);
  await tryAutoLoginFromEnv(context);
  const server = createMcpServer(context);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ZenTao MCP stdio 服务已启动");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startStdioServer().catch((error) => {
    logger.error({ err: error }, "启动 stdio 服务失败");
    process.exit(1);
  });
}

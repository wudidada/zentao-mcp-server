#!/usr/bin/env node
import { logger } from "./logger.js";
import { startHttpServer } from "./server/http.js";
import { startStdioServer } from "./server/stdio.js";

const transport = process.env.MCP_TRANSPORT ?? "stdio";

async function main(): Promise<void> {
  if (transport === "http") {
    await startHttpServer();
    return;
  }

  await startStdioServer();
}

main().catch((error) => {
  logger.error({ err: error, transport }, "启动 ZenTao MCP Server 失败");
  process.exit(1);
});

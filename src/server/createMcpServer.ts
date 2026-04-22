import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerZentaoTools } from "../tools/registerTools.js";
import type { AppContext } from "./context.js";

export function createMcpServer(context: AppContext): McpServer {
  const server = new McpServer(
    {
      name: "zentao-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: { logging: {} },
    },
  );

  registerZentaoTools(server, context);
  return server;
}

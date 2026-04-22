import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import {
  isInitializeRequest,
  JSONRPCMessageSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createMcpServer } from "./createMcpServer.js";
import { createAppContext } from "./context.js";
import { tryAutoLoginFromEnv } from "../bootstrap/autoLoginFromEnv.js";

type SessionState = {
  transport: StreamableHTTPServerTransport;
};

const sessions: Record<string, SessionState> = {};

export async function startHttpServer(): Promise<void> {
  const app = createMcpExpressApp();

  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      service: "zentao-mcp-server",
    });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const message = JSONRPCMessageSchema.parse(req.body);
      const sessionId = req.header("mcp-session-id");

      if (sessionId && sessions[sessionId]) {
        await sessions[sessionId].transport.handleRequest(req, res, message);
        return;
      }

      if (!sessionId && isInitializeRequest(message)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            sessions[newSessionId] = { transport };
            logger.info({ sessionId: newSessionId }, "HTTP 会话初始化成功");
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) {
            delete sessions[sid];
            logger.info({ sessionId: sid }, "HTTP 会话已关闭");
          }
        };

        const context = createAppContext(config.ZENTAO_BASE_URL);
        await tryAutoLoginFromEnv(context);
        const server = createMcpServer(context);
        await server.connect(transport);
        await transport.handleRequest(req, res, message);
        return;
      }

      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "无效会话，请先发送 initialize 请求。",
        },
        id: null,
      });
    } catch (error) {
      logger.error({ err: error }, "处理 MCP HTTP 请求失败");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    if (!sessionId || !sessions[sessionId]) {
      res.status(400).send("Invalid or missing mcp-session-id");
      return;
    }

    await sessions[sessionId].transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    if (!sessionId || !sessions[sessionId]) {
      res.status(400).send("Invalid or missing mcp-session-id");
      return;
    }

    await sessions[sessionId].transport.handleRequest(req, res);
  });

  app.listen(config.HTTP_PORT, (error?: Error) => {
    if (error) {
      logger.error({ err: error }, "HTTP 服务启动失败");
      process.exit(1);
    }
    logger.info({ port: config.HTTP_PORT }, "ZenTao MCP HTTP 服务已启动");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer().catch((error) => {
    logger.error({ err: error }, "HTTP 服务启动失败");
    process.exit(1);
  });
}

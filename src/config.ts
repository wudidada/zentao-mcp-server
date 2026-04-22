import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  ZENTAO_BASE_URL: z.string().url().optional(),
  ZENTAO_ACCOUNT: z.string().optional(),
  ZENTAO_PASSWORD: z.string().optional(),
  ZENTAO_TOKEN: z.string().optional(),
  /** axios：纯 Node 请求；curl：调用系统 curl（默认可规避部分禅道实例对 Node GET+Token 挂起的问题） */
  ZENTAO_HTTP_BACKEND: z.enum(["axios", "curl"]).optional(),
  HTTP_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(10_000),
  RETRY_COUNT: z.coerce.number().int().min(0).max(5).default(2),
});

export type AppConfig = z.infer<typeof envSchema>;

export const config: AppConfig = envSchema.parse(process.env);

export function resolveHttpBackend(): "axios" | "curl" {
  if (config.ZENTAO_HTTP_BACKEND === "axios" || config.ZENTAO_HTTP_BACKEND === "curl") {
    return config.ZENTAO_HTTP_BACKEND;
  }
  return process.platform === "win32" ? "axios" : "curl";
}

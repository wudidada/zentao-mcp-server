import { config } from "../config.js";
import { ZentaoApiV1Adapter } from "../adapters/zentaoApiV1.js";
import { AuthService } from "../services/authService.js";
import { BugService } from "../services/bugService.js";

export interface AppContext {
  adapter: ZentaoApiV1Adapter;
  authService: AuthService;
  bugService: BugService;
}

export function createAppContext(baseUrl?: string): AppContext {
  const adapter = new ZentaoApiV1Adapter({
    baseURL: baseUrl ?? config.ZENTAO_BASE_URL ?? "",
    timeoutMs: config.REQUEST_TIMEOUT_MS,
    retryCount: config.RETRY_COUNT,
  });

  const authService = new AuthService(adapter);
  const bugService = new BugService(adapter);

  return {
    adapter,
    authService,
    bugService,
  };
}

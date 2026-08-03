import { config, type AppConfig } from "../config.js";
import type { AppContext } from "../server/context.js";
import {
  initZentaoSchema,
  type InitZentaoInput,
} from "../schemas/toolSchemas.js";

type InitEnvironment = Pick<
  AppConfig,
  "ZENTAO_BASE_URL" | "ZENTAO_ACCOUNT" | "ZENTAO_PASSWORD" | "ZENTAO_TOKEN"
>;

export function resolveInitZentaoInput(
  input: InitZentaoInput,
  env: InitEnvironment = config,
): InitZentaoInput {
  const hasExplicitCredentials =
    input.password !== undefined || input.token !== undefined;
  const canUseEnvironmentCredentials =
    input.account === undefined || input.account === env.ZENTAO_ACCOUNT;

  return {
    baseUrl: input.baseUrl ?? env.ZENTAO_BASE_URL,
    account: input.account ?? env.ZENTAO_ACCOUNT,
    password:
      input.password ??
      (!hasExplicitCredentials && canUseEnvironmentCredentials
        ? env.ZENTAO_PASSWORD
        : undefined),
    token:
      input.token ??
      (!hasExplicitCredentials && canUseEnvironmentCredentials
        ? env.ZENTAO_TOKEN
        : undefined),
  };
}

export async function runInitZentaoTool(context: AppContext, input: unknown) {
  const payload = resolveInitZentaoInput(initZentaoSchema.parse(input));
  if (payload.baseUrl) {
    context.adapter.setBaseUrl(payload.baseUrl);
  }
  return context.authService.initLogin(payload);
}

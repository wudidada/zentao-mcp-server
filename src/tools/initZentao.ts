import type { AppContext } from "../server/context.js";
import { initZentaoSchema } from "../schemas/toolSchemas.js";

export async function runInitZentaoTool(context: AppContext, input: unknown) {
  const payload = initZentaoSchema.parse(input);
  if (payload.baseUrl) {
    context.adapter.setBaseUrl(payload.baseUrl);
  }
  return context.authService.initLogin(payload);
}

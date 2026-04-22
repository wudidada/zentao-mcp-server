import type { AppContext } from "../server/context.js";
import { resolveBugSchema } from "../schemas/toolSchemas.js";

export async function runResolveBugTool(context: AppContext, input: unknown) {
  const payload = resolveBugSchema.parse(input);
  return context.bugService.resolveBug(payload.bugId, payload.resolution);
}

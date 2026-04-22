import type { AppContext } from "../server/context.js";
import { activateBugSchema } from "../schemas/toolSchemas.js";

export async function runActivateBugTool(context: AppContext, input: unknown) {
  const payload = activateBugSchema.parse(input);
  const { bugId, ...rest } = payload;
  return context.bugService.activateBug(bugId, rest);
}

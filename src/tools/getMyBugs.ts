import type { AppContext } from "../server/context.js";
import { getMyBugsSchema } from "../schemas/toolSchemas.js";

export async function runGetMyBugsTool(context: AppContext, input: unknown) {
  const payload = getMyBugsSchema.parse(input);
  return context.bugService.getMyBugs(payload.status, payload.productId);
}

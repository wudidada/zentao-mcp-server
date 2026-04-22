import type { AppContext } from "../server/context.js";
import { getBugDetailSchema } from "../schemas/toolSchemas.js";

export async function runGetBugDetailTool(context: AppContext, input: unknown) {
  const payload = getBugDetailSchema.parse(input);
  return context.bugService.getBugDetail(payload.bugId);
}

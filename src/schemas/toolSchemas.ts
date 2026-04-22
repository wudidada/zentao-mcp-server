import { z } from "zod";

const bugStatusEnum = z.enum(["active", "resolved", "closed", "all"]);
const bugResolutionEnum = z.enum([
  "fixed",
  "notrepro",
  "duplicate",
  "bydesign",
  "willnotfix",
  "tostory",
  "external",
]);

export const initZentaoSchema = z
  .object({
    baseUrl: z.string().url().optional(),
    account: z.string().min(1, "account 不能为空。").optional(),
    password: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.account), "account 为必填。")
  .refine((data) => Boolean(data.password || data.token), "password 或 token 至少提供一个。");

export const getMyBugsSchema = z.object({
  status: bugStatusEnum.optional().default("active"),
  productId: z.number().int().positive().optional(),
});

export const getBugDetailSchema = z.object({
  bugId: z.number().int().positive(),
});

export const resolveBugSchema = z
  .object({
    bugId: z.number().int().positive(),
    resolution: z.object({
      resolution: bugResolutionEnum,
      resolvedBuild: z.string().optional(),
      duplicateBug: z.number().int().positive().optional(),
      comment: z.string().optional(),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.resolution.resolution === "duplicate" && !value.resolution.duplicateBug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resolution=duplicate 时必须提供 duplicateBug。",
        path: ["resolution", "duplicateBug"],
      });
    }
  });

export const emptySchema = z.object({});

export const activateBugSchema = z.object({
  bugId: z.number().int().positive(),
  assignedTo: z.string().optional(),
  openedBuild: z.union([z.string(), z.array(z.string())]).optional(),
  comment: z.string().optional(),
});

export type InitZentaoInput = z.infer<typeof initZentaoSchema>;
export type GetMyBugsInput = z.infer<typeof getMyBugsSchema>;
export type GetBugDetailInput = z.infer<typeof getBugDetailSchema>;
export type ResolveBugInput = z.infer<typeof resolveBugSchema>;
export type ActivateBugInput = z.infer<typeof activateBugSchema>;

export const mcpInput = {
  initZentao: initZentaoSchema.shape,
  getMyBugs: getMyBugsSchema.shape,
  getBugDetail: getBugDetailSchema.shape,
  resolveBug: resolveBugSchema.shape,
  activateBug: activateBugSchema.shape,
  empty: emptySchema.shape,
};

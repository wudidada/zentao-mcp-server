import { describe, expect, it } from "vitest";
import { resolveBugSchema } from "../src/schemas/toolSchemas.js";

describe("resolveBugSchema", () => {
  it("duplicate 方案必须提供 duplicateBug", () => {
    const result = resolveBugSchema.safeParse({
      bugId: 123,
      resolution: {
        resolution: "duplicate",
      },
    });

    expect(result.success).toBe(false);
  });

  it("fixed 方案可正常通过", () => {
    const result = resolveBugSchema.safeParse({
      bugId: 123,
      resolution: {
        resolution: "fixed",
        comment: "已经修复",
      },
    });

    expect(result.success).toBe(true);
  });
});

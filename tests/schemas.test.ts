import { describe, expect, it } from "vitest";
import {
  initZentaoSchema,
  resolveBugSchema,
} from "../src/schemas/toolSchemas.js";
import { resolveInitZentaoInput } from "../src/tools/initZentao.js";

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

describe("initZentaoSchema", () => {
  it("允许空参数，以便从环境变量完成初始化", () => {
    expect(initZentaoSchema.safeParse({}).success).toBe(true);
  });

  it("空参数会回退使用环境变量中的连接与认证配置", () => {
    const result = resolveInitZentaoInput(
      {},
      {
        ZENTAO_BASE_URL: "https://zentao.example.com/api.php/v1",
        ZENTAO_ACCOUNT: "alice",
        ZENTAO_PASSWORD: "pwd",
        ZENTAO_TOKEN: undefined,
      },
    );

    expect(result).toEqual({
      baseUrl: "https://zentao.example.com/api.php/v1",
      account: "alice",
      password: "pwd",
      token: undefined,
    });
  });

  it("显式指定不同账号但未给凭据时不混用环境密码", () => {
    const result = resolveInitZentaoInput(
      { account: "bob" },
      {
        ZENTAO_BASE_URL: "https://zentao.example.com/api.php/v1",
        ZENTAO_ACCOUNT: "alice",
        ZENTAO_PASSWORD: "alice-password",
        ZENTAO_TOKEN: undefined,
      },
    );

    expect(result.account).toBe("bob");
    expect(result.password).toBeUndefined();
  });
});

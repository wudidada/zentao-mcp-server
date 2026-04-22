import nock from "nock";
import { afterEach, describe, expect, it } from "vitest";
import { ZentaoApiV1Adapter } from "../src/adapters/zentaoApiV1.js";
import { AuthError } from "../src/errors.js";

describe("ZentaoApiV1Adapter", () => {
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("支持登录并查询我的 bug", async () => {
    const scope = nock("https://zentao.example.com")
      .post("/tokens", { account: "alice", password: "pwd" })
      .reply(200, { token: "token-1" })
      .get("/products")
      .matchHeader("token", "token-1")
      .reply(200, {
        page: 1,
        total: 1,
        limit: 100,
        products: [{ id: 1, name: "P1" }],
      })
      .get("/bugs")
      .query(
        (query) =>
          query.assignedTo === "me" &&
          query.status === "active" &&
          query.product === "1",
      )
      .matchHeader("token", "token-1")
      .reply(200, {
        page: 1,
        total: 1,
        limit: 100,
        bugs: [{ id: 1, title: "bug", status: "active" }],
      });

    const adapter = new ZentaoApiV1Adapter({
      baseURL: "https://zentao.example.com",
      timeoutMs: 3_000,
      retryCount: 1,
    });

    await adapter.login("alice", "pwd");
    const bugs = await adapter.getMyBugs({ status: "active" });

    expect(bugs).toHaveLength(1);
    expect(bugs[0]?.id).toBe(1);
    expect(scope.isDone()).toBe(true);
  });

  it("未登录时查询会抛出 AuthError", async () => {
    const adapter = new ZentaoApiV1Adapter({
      baseURL: "https://zentao.example.com",
      timeoutMs: 3_000,
      retryCount: 1,
    });

    await expect(adapter.getProducts()).rejects.toBeInstanceOf(AuthError);
  });

  it("解决 bug 使用 POST /bugs/:id/resolve（禅道 API v1）", async () => {
    const scope = nock("https://zentao.example.com")
      .post("/tokens", { account: "alice", password: "pwd" })
      .reply(200, { token: "token-1" })
      .post("/bugs/9/resolve", (body: Record<string, unknown>) => {
        return (
          body.resolution === "fixed" &&
          body.resolvedBuild === "trunk" &&
          typeof body.resolvedDate === "string" &&
          String(body.resolvedDate).includes(":")
        );
      })
      .reply(200, { id: 9, title: "t", status: "resolved" });

    const adapter = new ZentaoApiV1Adapter({
      baseURL: "https://zentao.example.com",
      timeoutMs: 3_000,
      retryCount: 1,
    });

    await adapter.login("alice", "pwd");
    const bug = await adapter.resolveBug(9, { resolution: "fixed" });
    expect(bug.status).toBe("resolved");
    expect(scope.isDone()).toBe(true);
  });

  it("fixed 方案忽略传入的 resolvedBuild，固定为 trunk", async () => {
    const scope = nock("https://zentao.example.com")
      .post("/tokens", { account: "alice", password: "pwd" })
      .reply(200, { token: "token-1" })
      .post("/bugs/8/resolve", (body: Record<string, unknown>) => {
        return body.resolution === "fixed" && body.resolvedBuild === "trunk";
      })
      .reply(200, { id: 8, title: "t", status: "resolved" });

    const adapter = new ZentaoApiV1Adapter({
      baseURL: "https://zentao.example.com",
      timeoutMs: 3_000,
      retryCount: 1,
    });

    await adapter.login("alice", "pwd");
    await adapter.resolveBug(8, { resolution: "fixed", resolvedBuild: "r1186" });
    expect(scope.isDone()).toBe(true);
  });

  it("激活 bug 使用 POST /bugs/:id/active", async () => {
    const scope = nock("https://zentao.example.com")
      .post("/tokens", { account: "alice", password: "pwd" })
      .reply(200, { token: "token-1" })
      .post("/bugs/11/active", (body: Record<string, unknown>) => {
        return (
          Array.isArray(body.openedBuild) &&
          body.openedBuild[0] === "trunk" &&
          body.comment === "重新打开"
        );
      })
      .reply(200, { id: 11, title: "t", status: "active" });

    const adapter = new ZentaoApiV1Adapter({
      baseURL: "https://zentao.example.com",
      timeoutMs: 3_000,
      retryCount: 1,
    });

    await adapter.login("alice", "pwd");
    const bug = await adapter.activateBug(11, { comment: "重新打开" });
    expect(bug.status).toBe("active");
    expect(scope.isDone()).toBe(true);
  });
});

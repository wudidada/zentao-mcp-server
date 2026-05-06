import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isMainModule } from "../src/utils/isMainModule.js";

const originalArgv = [...process.argv];

afterEach(() => {
  process.argv = [...originalArgv];
});

describe("isMainModule", () => {
  it("matches the current entrypoint across file url and local path formats", () => {
    const entryPoint = path.resolve("src/server/http.ts");
    process.argv[1] = entryPoint;

    expect(isMainModule(pathToFileURL(entryPoint).href)).toBe(true);
  });

  it("returns false for non-entry modules", () => {
    process.argv[1] = path.resolve("src/server/http.ts");
    const otherModule = path.resolve("src/server/stdio.ts");

    expect(isMainModule(pathToFileURL(otherModule).href)).toBe(false);
  });
});

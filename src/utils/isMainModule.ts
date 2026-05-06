import path from "node:path";
import { fileURLToPath } from "node:url";

export function isMainModule(metaUrl: string): boolean {
  const entryPoint = process.argv[1];

  if (!entryPoint) {
    return false;
  }

  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(entryPoint);
}

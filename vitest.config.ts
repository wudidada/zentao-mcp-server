import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      ZENTAO_HTTP_BACKEND: "axios",
    },
  },
});

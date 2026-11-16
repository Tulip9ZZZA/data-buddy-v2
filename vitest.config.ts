import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts",
      "engine/**/*.test.ts",
      "rules/**/test_rule.test.ts",
      "tests/**/*.test.ts",
      "security/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "engine/**/*.ts",
        "rules/**/detector.ts",
        "client/src/lib/**/*.ts",
      ],
      exclude: [
        "client/src/lib/trpc.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "client/src/lib/components.ts",
      ],
    },
  },
});

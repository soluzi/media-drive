import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/config/index.ts",
    "src/core/index.ts",
    "src/storage/index.ts",
    "src/conversions/index.ts",
    "src/queue/index.ts",
    "src/http/index.ts",
    "src/cli/index.ts",
  ],
  format: ["cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ["@prisma/client", "prisma", "sharp", "bullmq", "ioredis"],
});

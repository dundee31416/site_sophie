import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Merges the app's vite config so aliases and plugins apply in tests too.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: false,
      include: ["src/**/*.test.{ts,tsx}"],
    },
  }),
);

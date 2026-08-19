/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "").replace(/\/$/, "");

  return {
    plugins: [
      react(),
      {
        name: "liquidazi-site-url-html",
        transformIndexHtml(html) {
          if (!siteUrl) {
            return html
              .replace(/<link rel="canonical"[^>]*>\s*/i, "")
              .replace(/<meta property="og:url"[^>]*>\s*/i, "")
              .replaceAll("__SITE_URL__", "");
          }
          return html.replaceAll("__SITE_URL__", siteUrl);
        },
      },
      {
        name: "liquidazi-ops-dev",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === "/ops" || req.url === "/ops/") {
              req.url = "/ops.html";
            }
            next();
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(rootDir, "index.html"),
          ops: resolve(rootDir, "ops.html"),
        },
      },
    },
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
    test: {
      environment: "node",
      setupFiles: ["./vitest.setup.ts"],
      exclude: ["**/node_modules/**", "**/.worktrees/**"],
    },
  };
});

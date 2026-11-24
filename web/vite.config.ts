import { cpSync, createReadStream, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

// The app is served at /trip/<tripId> through a hosting rewrite, so its
// files live under /app/. The build writes into public/app and nowhere else:
// emptyOutDir clears that one folder, never public/ with the hype pages.
export default defineConfig({
  base: "/app/",
  plugins: [react(), twemoji()],
  build: {
    outDir: "../public/app",
    emptyOutDir: true,
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});

/**
 * Serves Twemoji's pictures from this site, at /app/twemoji/<codepoints>.svg,
 * so the Feed draws Discord's emoji on every phone without a third-party CDN:
 * the dev server reads them from @twemoji/svg, and the build copies them into
 * the output. The page loads only the ones on screen.
 * Inputs: none. Output: the Vite plugin.
 * Examples (checked in the browser): GET /app/twemoji/1f525.svg → the flame; GET /app/twemoji/../x → 404
 */
function twemoji(): Plugin {
  const dir = resolve(__dirname, "node_modules/@twemoji/svg");
  return {
    name: "twemoji",
    configureServer(server) {
      server.middlewares.use("/app/twemoji/", (req, res) => {
        const name = (req.url ?? "").split("?")[0].replace(/^\//, "");
        const file = join(dir, name);
        if (!/^[0-9a-f-]+\.svg$/.test(name) || !existsSync(file)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "image/svg+xml");
        createReadStream(file).pipe(res);
      });
    },
    writeBundle(options) {
      cpSync(dir, join(options.dir!, "twemoji"), { recursive: true, filter: (source) => source === dir || source.endsWith(".svg") });
    },
  };
}

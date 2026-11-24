import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

const OUT_DIR = resolve(__dirname, "../public/app");

/**
 * Publishes /app/preload.json, the list the splash reads to load the whole
 * app while it plays (public/assets/hype.js): every built script and
 * stylesheet, the app's entry, the prewarm entry (src/prewarm.ts) and the chunks it imports, and the
 * Google Fonts stylesheet the app's index.html links, and every file the code
 * fetches by address (the emoji picker's data). It reads Vite's own
 * manifest, so a chunk added later is listed without a change here.
 *
 * Inputs: none; runs once after the build has written its files.
 * Output: public/app/preload.json, as
 *   { entry, prewarm, shared: [...], scripts: [...], styles: [...], data: [...], fonts: [...] }, every path from the site's root.
 * Examples (checked after `npm run build`):
 *   { "entry": "/app/assets/index-<hash>.js", "prewarm": "/app/assets/prewarm-<hash>.js", "shared": [Firebase chunk],
 *     "scripts": [entry, Firebase chunk, TripMap chunk, …], "styles": [index, TripMap], "data": [the emoji data],
 *     "fonts": [Google Fonts CSS] }
 */
function preloadList(): Plugin {
  return {
    name: "travel-preload-list",
    apply: "build",
    writeBundle() {
      type Entry = { file: string; css?: string[]; assets?: string[]; imports?: string[]; isEntry?: boolean; name?: string; src?: string };
      const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, ".vite/manifest.json"), "utf8")) as Record<string, Entry>;
      const at = (file: string) => `/app/${file}`;
      const entries = Object.values(manifest);
      const entry = entries.find((item) => item.isEntry && item.src === "index.html");
      const prewarm = entries.find((item) => item.isEntry && item.src === "src/prewarm.ts");
      // The chunks the prewarm script imports (the Firebase chunk), so the splash fetches them beside it, not after it.
      const shared = (prewarm?.imports ?? []).map((key) => at(manifest[key].file));
      const scripts = [...new Set(entries.map((item) => item.file).filter((file) => file.endsWith(".js")))].map(at);
      const styles = [...new Set(entries.flatMap((item) => [item.file, ...(item.css ?? [])]).filter((file) => file.endsWith(".css")))].map(at);
      // Files the code fetches by address, such as the emoji picker's data in Activity.
      const data = [...new Set(entries.flatMap((item) => item.assets ?? []))].map(at);
      const fonts = [...readFileSync(resolve(__dirname, "index.html"), "utf8").matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/g)].map((match) =>
        match[1].replace(/&amp;/g, "&"),
      );
      const list = { entry: entry && at(entry.file), prewarm: prewarm && at(prewarm.file), shared, scripts, styles, data, fonts };
      writeFileSync(resolve(OUT_DIR, "preload.json"), JSON.stringify(list, null, 1));
    },
  };
}

// The app is served at /trip/<tripId> through a hosting rewrite, so its
// files live under /app/. The build writes into public/app and nowhere else:
// emptyOutDir clears that one folder, never public/ with the hype pages.
// Two entries: the app, and the splash's prewarm script, which shares the app's Firebase chunk.
export default defineConfig({
  base: "/app/",
  plugins: [react(), preloadList()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: { index: resolve(__dirname, "index.html"), prewarm: resolve(__dirname, "src/prewarm.ts") },
      // The code both entries share, under one plain name.
      output: {
        manualChunks: (id) =>
          /node_modules\/(firebase|@firebase)\//.test(id) || /src\/lib\/(firebase|paths|snapshot)\.ts$/.test(id) ? "firebase" : undefined,
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});

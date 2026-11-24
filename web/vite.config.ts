import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The app is served at /trip/<tripId> through a hosting rewrite, so its
// files live under /app/. The build writes into public/app and nowhere else:
// emptyOutDir clears that one folder, never public/ with the hype pages.
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  build: {
    outDir: "../public/app",
    emptyOutDir: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

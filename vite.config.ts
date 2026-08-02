import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// tanstackRouter: generates src/routeTree.gen.ts from src/routes and handles code-splitting.
// tanstackStart + nitro: required for `createServerFn` (used throughout src/lib/*.functions.ts)
// to be bundled into a working server, and for Nitro to produce output Vercel can deploy
// as Vercel Functions (auto-detected, no extra vercel.json needed).
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tanstackStart(),
    nitro(),
    react(),
  ],
});

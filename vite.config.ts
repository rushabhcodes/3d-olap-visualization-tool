import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@react-three") || id.includes("node_modules/three")) {
            return "three-vendor";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/papaparse")) {
            return "csv-vendor";
          }

          if (id.includes("src/data/")) {
            return "dataset-vendor";
          }

          return undefined;
        },
      },
    },
  },
});

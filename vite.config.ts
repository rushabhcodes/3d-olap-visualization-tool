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
          if (
            id.includes("node_modules/@react-three/drei") ||
            id.includes("node_modules/three-stdlib") ||
            id.includes("node_modules/camera-controls")
          ) {
            return "drei-vendor";
          }

          if (id.includes("node_modules/@react-three/fiber")) {
            return "r3f-vendor";
          }

          if (id.includes("node_modules/three/src/renderers")) {
            return "three-renderers";
          }

          if (id.includes("node_modules/three")) {
            return "three-core";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/papaparse")) {
            return "csv-vendor";
          }
          return undefined;
        },
      },
    },
  },
});

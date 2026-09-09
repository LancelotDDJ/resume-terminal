import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // The workspace sandbox intercepts fs.rmSync on the output directory;
    // dist/ is cleared manually before builds instead of by Vite.
    emptyOutDir: false,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          editor: ["@uiw/react-codemirror", "@codemirror/lang-markdown"],
          markdown: ["markdown-it", "markdown-it-task-lists", "dompurify"],
          react: ["react", "react-dom"]
        }
      }
    }
  }
});

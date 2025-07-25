import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/components": path.resolve(__dirname, "src/components"),
      "@/components/ui": path.resolve(__dirname, "src/components/ui"),
      "@/lib": path.resolve(__dirname, "src/lib"),
    },
  },
  server:{
      host:"0.0.0.0",
      port:5173
    }
});
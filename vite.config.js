import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías grandes para aprovechar la caché del navegador.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("sweetalert2")) return "sweetalert";
          if (id.includes("@tanstack")) return "tanstack";
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|styled-components)\//.test(id))
            return "react";
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
});

import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Pineapple AI — static only, no adapter. All gateway calls client-side.
export default defineConfig({
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});

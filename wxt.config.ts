import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["cookies", "contextMenus"],
    host_permissions: [
      "https://*/*",
      "https://roguelearn.site/*",
      "http://localhost/*",
      "http://localhost:*/**",
       "https://fap.fpt.edu.vn/*",
      "https://flm.fpt.edu.vn/*",
    ],
    name: 'RogueLearn',
    action: {}, 
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"), // or "./src" if using src directory
      },
    },
  }),
});
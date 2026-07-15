import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** Determine the base path for GitHub Pages */
function getBasePath(): string | undefined {
  const repo = process.env.GITHUB_REPOSITORY?.split("/").pop();
  return repo ? `/${repo}/` : undefined;
}

export default defineConfig(() => {
  const base = getBasePath();
  return {
    base,
    plugins: [
      tailwindcss(),
      reactRouter(),
      VitePWA({
        // React Router (SPA mode) は build/client に出力するが、vite-plugin-pwa の
        // デフォルトは dist なので明示的に合わせる。
        outDir: "build/client",
        // GitHub Pages のサブパス配下でも manifest / SW / start_url が正しく解決されるよう、
        // vite の base と同じ値を渡す。
        base,
        registerType: "autoUpdate",
        // SPA(ssr: false)なので index.html へのフォールバックを SW のナビゲーションに効かせる。
        includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "Sinhala Alphabet Trainer",
          short_name: "Sinhala",
          description: "シンハラ文字を、変化の規則ごとに段階を追って学ぶ",
          lang: "ja",
          theme_color: "#2563eb",
          background_color: "#ffffff",
          display: "standalone",
          // start_url / scope は base 相対。base 未設定(ローカル)では "/"。
          start_url: base ?? "/",
          scope: base ?? "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // React Router の client 出力(JS/CSS/HTML)を precache。
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          // SPA: 既知アセット以外のナビゲーションは index.html にフォールバック。
          navigateFallback: base ? `${base}index.html` : "/index.html",
          // Google Fonts(Noto Sans Sinhala)はランタイムキャッシュ。
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-stylesheets" },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./app", import.meta.url)),
      },
    },
  };
});

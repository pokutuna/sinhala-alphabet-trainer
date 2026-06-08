import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { Navigation } from "./components/Navigation";
import "./app.css";

// GitHub Pages のサブパス配下でも正しく解決するよう、PWA 関連の URL は
// vite の base(import.meta.env.BASE_URL)を前置する。末尾スラッシュ込み。
const BASE = import.meta.env.BASE_URL;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Sans+Sinhala:wght@400;600&display=swap",
  },
  // PWA: SPA モードでは VitePWA の HTML 注入が効かないため手動でリンクする。
  { rel: "manifest", href: `${BASE}manifest.webmanifest` },
  { rel: "icon", href: `${BASE}favicon.svg`, type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: `${BASE}apple-touch-icon.png` },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // SPA モードでは VitePWA の自動 SW 登録スクリプトが index.html に注入されない
  // ため、クライアントで明示的に登録する。autoUpdate なので更新は即時反映。
  useEffect(() => {
    let cancelled = false;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (!cancelled) registerSW({ immediate: true });
      })
      .catch(() => {
        // SW 未対応環境や dev(devOptions.enabled=false)では何もしない。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navigation />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

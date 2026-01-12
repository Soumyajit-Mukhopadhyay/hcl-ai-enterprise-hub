import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";

const rootElement = document.getElementById("root");

const showFatal = (title: string, err?: unknown) => {
  const details = err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? "");
  const html = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:ui-sans-serif,system-ui;">
      <div style="max-width:900px;width:100%;border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:20px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;">${title}</h1>
        <pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-size:12px;opacity:.85;">${details}</pre>
      </div>
    </div>
  `;
  if (rootElement) rootElement.innerHTML = html;
  else document.body.innerHTML = html;
};

if (!rootElement) {
  // eslint-disable-next-line no-console
  console.error("Root element not found");
  showFatal("Fatal: root element not found");
} else {
  // Capture errors that would otherwise result in a blank screen.
  window.addEventListener("error", (e) => {
    // eslint-disable-next-line no-console
    console.error("Window error:", e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled promise rejection:", e.reason);
  });

  (async () => {
    try {
      const mod = await import("./App");
      const App = mod.default;

      createRoot(rootElement).render(
        <StrictMode>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </StrictMode>
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to bootstrap app:", error);
      showFatal("Fatal: failed to bootstrap app", error);
    }
  })();
}


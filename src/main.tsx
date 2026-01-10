import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
  document.body.innerHTML = '<div style="display: flex; align-items: center; justify-center; min-height: 100vh; font-family: sans-serif; color: #ef4444;">Error: Root element not found</div>';
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    rootElement.innerHTML = '<div style="display: flex; align-items: center; justify-center; min-height: 100vh; font-family: sans-serif; color: #ef4444;">Error loading application. Check console for details.</div>';
  }
}

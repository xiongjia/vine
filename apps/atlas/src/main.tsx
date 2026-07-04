import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@vine/ui";
import "@vine/ui/globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

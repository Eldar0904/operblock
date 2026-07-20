import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import "./i18n";
import { ClerkProviderWithLocale } from "./ClerkProviderWithLocale";
import { ToastProvider } from "@/components/ui/toast";

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.warn(
    "Missing VITE_CLERK_PUBLISHABLE_KEY — auth routes will not work until .env is configured.",
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProviderWithLocale publishableKey={clerkPubKey ?? ""}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ClerkProviderWithLocale>
  </StrictMode>,
);

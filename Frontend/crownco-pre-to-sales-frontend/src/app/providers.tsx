"use client";

import { Provider } from "react-redux";
import { ReactNode } from "react";
import { store } from "../store/store";
import { Toaster } from "sonner";
import { SidebarProvider } from "../contexts/SidebarContext";
import { LeadProvider } from "../contexts/LeadContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <SidebarProvider>
        <LeadProvider>
          {children}
          <Toaster position="top-right" richColors />
        </LeadProvider>
      </SidebarProvider>
    </Provider>
  );
}


"use client";

import { Provider } from "react-redux";
import { ReactNode } from "react";
import { store } from "../store/store";
import { SidebarProvider } from "../contexts/SidebarContext";
import { Toaster } from "sonner";


interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <SidebarProvider>
        {children}
        <Toaster position="top-right" />
      </SidebarProvider>
    </Provider>
  );
}


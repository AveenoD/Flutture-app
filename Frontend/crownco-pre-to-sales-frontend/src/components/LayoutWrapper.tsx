"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ErrorBoundary } from "./ErrorBoundary";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Don't show Sidebar/Topbar on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show Sidebar/Topbar for all other pages
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-100" role="main">
        <Topbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

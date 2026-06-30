"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { ErrorBoundary } from "./ErrorBoundary";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("authState");
    const hasToken = !!raw && !!JSON.parse(raw).token;

    if (!hasToken && !isLoginPage) {
      router.replace("/login");
    }
  }, [isLoginPage, router]);

  // Don't show Sidebar/Topbar on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show Sidebar/Topbar for all other pages
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 flex flex-col overflow-hidden bg-[#F2F4F7]"
        role="main"
      >
        <Topbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}


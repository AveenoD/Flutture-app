"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    // Simple client-side auth guard
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cc_access_token");
      if (!token) {
        router.replace("/login");
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [isLoginPage, router]);

  // While checking auth, render nothing (or a simple loader)
  if (isCheckingAuth) {
    return null;
  }

  // Don't show Sidebar/Topbar on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show Sidebar/Topbar for all other pages
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
}

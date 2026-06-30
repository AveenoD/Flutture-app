 "use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { apiFetch } from "@/lib/apiClient";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    const token = localStorage.getItem("authToken");

    const clearSession = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      localStorage.removeItem("loginSuccess");
    };

    if (!token) {
      clearSession();
      router.replace("/login");
      return;
    }

    const allowedRoles = new Set(["manager", "general-manager"]);

    const checkAccess = async () => {
      try {
        const storedUserRaw = localStorage.getItem("authUser");
        if (storedUserRaw) {
          const storedUser = JSON.parse(storedUserRaw) as { user_type?: string };
          if (storedUser.user_type && !allowedRoles.has(storedUser.user_type)) {
            clearSession();
            router.replace("/login");
            return;
          }
        }

        const profile = await apiFetch<{
          success: boolean;
          data?: { user_type?: string };
        }>("/api/v1/auth/me");

        const userType = profile.data?.user_type;
        if (!userType || !allowedRoles.has(userType)) {
          clearSession();
          router.replace("/login");
          return;
        }

        localStorage.setItem("authUser", JSON.stringify(profile.data));
        setIsCheckingAuth(false);
      } catch {
        clearSession();
        router.replace("/login");
      }
    };

    void checkAccess();
  }, [router, isLoginPage]);

  if (isCheckingAuth && !isLoginPage) {
    return null;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, SignOut } from "phosphor-react";
import { Menu } from "lucide-react";

interface TopbarProps {
  userName?: string;
}

export default function Topbar({
  userName: initialUserName = "Sarah",
}: TopbarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState(initialUserName);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Hydrate user name from authUser if present
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("authUser");
        if (stored) {
          const parsed = JSON.parse(stored) as { name?: string };
          if (parsed?.name) {
            setUserName(parsed.name);
          }
        }
        if (localStorage.getItem("loginSuccess") === "1") {
          setShowLoginSuccess(true);
          localStorage.removeItem("loginSuccess");
          setTimeout(() => setShowLoginSuccess(false), 4000);
        }
      }
    } catch {
      // ignore parsing errors
    }
    const updateDate = () => {
      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = () => {
    console.log("Notifications clicked");
  };

  const handleLogout = () => {
    // Clear any stored auth data
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
    }
    
    // Redirect to login page
    router.push("/login");
  };

  return (
    <>
      {showLoginSuccess && (
        <div className="fixed top-3 right-3 z-40 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800 shadow">
          Login successful
        </div>
      )}
      <header className="h-[72px] min-h-[72px] flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--background)] border-b border-[var(--border-color)] flex-shrink-0 w-full">
        {/* Mobile Layout */}
        <div className="flex items-center w-full md:hidden relative">
          {/* Hamburger Menu - Left */}
          <button
            className="p-2 rounded-full hover:bg-[var(--hover-bg)] active:bg-[var(--active-bg)] transition-colors duration-200 flex items-center justify-center flex-shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6 text-[var(--text-primary)]" />
          </button>

          {/* Welcome Text - Centered */}
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-base font-semibold text-[var(--text-primary)] flex items-center gap-1 whitespace-nowrap">
            <span>Welcome {userName}</span>
            <span className="inline-block wave-emoji">👋</span>
          </h1>

          {/* Action Buttons - Right */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Button */}
            <button
              onClick={handleNotificationClick}
              className="p-2 rounded-full hover:bg-[var(--hover-bg)] active:bg-[var(--active-bg)] transition-colors duration-200 flex items-center justify-center flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell 
                size={20} 
                weight="regular" 
                className="text-[var(--text-primary)]" 
              />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-[var(--hover-bg)] active:bg-[var(--active-bg)] transition-colors duration-200 flex items-center justify-center flex-shrink-0"
              aria-label="Logout"
              title="Logout"
            >
              <SignOut 
                size={20} 
                weight="regular" 
                className="text-[var(--text-primary)]" 
              />
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Profile Section */}
          <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[var(--surface-neutral)] flex-shrink-0">
              <Image
                src="/pexels-karola-g-6345317.jpg"
                alt={`${userName}'s profile`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Welcome Text */}
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-lg lg:text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-2 truncate">
                <span className="truncate">
                  Welcome {userName}
                </span>
                <span className="inline-block wave-emoji flex-shrink-0">
                  👋
                </span>
              </h1>
              <p className="text-sm lg:text-base text-[var(--text-secondary)] font-normal mt-1" suppressHydrationWarning>
                {isMounted ? (currentDate || "Loading...") : "Loading..."}
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0 ml-4">
            {/* Notification Button */}
            <button
              onClick={handleNotificationClick}
              className="p-2 rounded-full hover:bg-[var(--hover-bg)] active:bg-[var(--active-bg)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
              aria-label="Notifications"
            >
              <Bell 
                size={28} 
                weight="regular" 
                className="text-[var(--text-primary)]" 
              />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-[var(--hover-bg)] active:bg-[var(--active-bg)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
              aria-label="Logout"
              title="Logout"
            >
              <SignOut 
                size={28} 
                weight="regular" 
                className="text-[var(--text-primary)]" 
              />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}


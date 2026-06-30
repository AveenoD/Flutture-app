"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, SignOut } from "phosphor-react";
import { useSidebar } from "../contexts/SidebarContext";

interface TopbarProps {
  userName?: string;
}

export default function Topbar({ 
  userName = "Sarah"
}: TopbarProps) {
  const router = useRouter();
  const { isMobileMenuOpen, setIsMobileMenuOpen, isMobile } = useSidebar();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
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
    // localStorage.removeItem('token');
    // sessionStorage.clear();
    
    // Redirect to login page
    router.push("/login");
  };

  return (
    <>
      <header className="h-[72px] min-h-[72px] flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 bg-white border-b border-[#e5e5e5] flex-shrink-0 w-full">
        {/* Mobile Layout */}
        <div className="flex items-center w-full md:hidden relative pl-14">
          {/* Space for sidebar menu button (which is fixed at top-4 left-4) */}

          {/* Welcome Text - Centered */}
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-base font-semibold text-[#1a1a1a] flex items-center gap-1 whitespace-nowrap">
            <span>Welcome {userName}</span>
            <span className="inline-block wave-emoji">👋</span>
          </h1>

          {/* Action Buttons - Right */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Button */}
            <button
              onClick={handleNotificationClick}
              className="p-2 rounded-full hover:bg-[#f0f0f0] active:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell 
                size={20} 
                weight="regular" 
                className="text-[#1a1a1a]" 
              />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-[#f0f0f0] active:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center flex-shrink-0"
              aria-label="Logout"
              title="Logout"
            >
              <SignOut 
                size={20} 
                weight="regular" 
                className="text-[#1a1a1a]" 
              />
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Profile Section */}
          <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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
              <h1 className="text-lg lg:text-2xl font-semibold text-[#1a1a1a] flex items-center gap-2 truncate">
                <span className="truncate">
                  Welcome {userName}
                </span>
                <span className="inline-block wave-emoji flex-shrink-0">
                  👋
                </span>
              </h1>
              <p className="text-sm lg:text-base text-[#757575] font-normal mt-1">
                {currentDate || "Loading..."}
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0 ml-4">
            {/* Notification Button */}
            <button
              onClick={handleNotificationClick}
              className="p-2 rounded-full hover:bg-[#f0f0f0] active:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:ring-offset-2"
              aria-label="Notifications"
            >
              <Bell 
                size={28} 
                weight="regular" 
                className="text-[#1a1a1a]" 
              />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-[#f0f0f0] active:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:ring-offset-2"
              aria-label="Logout"
              title="Logout"
            >
              <SignOut 
                size={28} 
                weight="regular" 
                className="text-[#1a1a1a]" 
              />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}


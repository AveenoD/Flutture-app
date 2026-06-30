"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChartPie,
  Users,
  GridFour,
  ShareNetwork,
  FileText,
  Calendar,
  User,
  UserSquare,
  ArrowsVertical,
  List,
  X,
  GitBranch,
} from "phosphor-react";

interface MenuItemProps {
  title: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  isActive?: boolean;
  href: string;
  onClick?: () => void;
}

const MenuItem = ({
  title,
  icon,
  rightIcon,
  isActive = false,
  href,
  onClick,
}: MenuItemProps) => {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <li>
      <Link
        href={href}
        onClick={handleClick}
        className={`flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200 mb-1 ${
          isActive
            ? "bg-[var(--active-bg)] text-[var(--primary-base)] font-semibold"
            : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-dark)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 ${
              isActive ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"
            }`}
            style={{ width: "20px", height: "20px" }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium">{title}</span>
        </div>
        {rightIcon && (
          <div className="text-[var(--text-tertiary)]" style={{ width: "16px", height: "16px" }}>
            {rightIcon}
          </div>
        )}
      </Link>
    </li>
  );
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMenuClick = (href: string) => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
      onClose?.();
    }
    // Navigate to the route
    router.push(href);
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: <ChartPie size={20} weight="regular" />,
      href: "/dashboard",
    },
    {
      title: "Lead Routing",
      icon: <GitBranch size={20} weight="regular" />,
      href: "/lead-routing",
    },
    {
      title: "Employee Management",
      icon: <Users size={20} weight="regular" />,
      href: "/employee-management/employee-list",
    },
    {
      title: "All Leads",
      icon: <List size={20} weight="regular" />,
      href: "/all-leads",
    },
    {
      title: "Project Inventory",
      icon: <FileText size={20} weight="regular" />,
      href: "/project-inventory",
    },
  ];

  const settingsItems = [
    {
      title: "Settings",
      icon: <User size={20} weight="regular" />,
      rightIcon: <UserSquare size={16} weight="regular" />,
      href: "/settings",
    },
    {
      title: "Profile",
      icon: <User size={20} weight="regular" />,
      rightIcon: <UserSquare size={16} weight="regular" />,
      href: "/profile",
    },
  ];

  // Check if a route is active
  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  const sidebarContent = (
    <aside
      className={`flex flex-col bg-[var(--background)] border-r border-[var(--border-color)] h-full ${
        mounted && isMobile
          ? `fixed top-0 left-0 z-50 w-[248px] h-screen transform transition-transform duration-300 ease-in-out shadow-lg ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`
          : "w-[248px] flex-shrink-0"
      }`}
    >
      {/* Logo Section */}
      <div className="px-5 py-6 flex items-center justify-center border-b border-[var(--border-color)]">
        <div className="flex flex-col items-center">
          <Image
            src="/Crown co Logo.svg"
            alt="Crownco Logo"
            width={232}
            height={42}
            priority
            className="w-auto h-auto max-w-[200px]"
          />
        </div>
      </div>

      {/* Menu Wrapper - Scrollable */}
      <div className="flex-1 overflow-y-auto py-2.5 px-4">
        {/* Main Menu */}
        <ul className="mb-6">
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              title={item.title}
              icon={item.icon}
              isActive={isRouteActive(item.href)}
              href={item.href}
              onClick={() => handleMenuClick(item.href)}
            />
          ))}
        </ul>

        {/* Divider */}
        <div className="h-px bg-[var(--border-color)] my-5" />

        {/* Settings Section */}
        <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 pl-3 mt-6">
          SETTINGS
        </div>
        <ul>
          {settingsItems.map((item, index) => (
            <MenuItem
              key={index}
              title={item.title}
              icon={item.icon}
              rightIcon={item.rightIcon}
              isActive={isRouteActive(item.href)}
              href={item.href}
              onClick={() => handleMenuClick(item.href)}
            />
          ))}
        </ul>
      </div>

      {/* Footer - Marketing Team */}
      <div className="p-4 border-t border-[var(--border-color)] flex-shrink-0">
        <button
          onClick={() => {
            // Handle team selector click
            console.log("Team selector clicked");
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--hover-bg)] transition-colors active:bg-[var(--active-bg)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--success-bg)] text-[var(--success-text)] rounded-md flex items-center justify-center font-semibold text-sm">
              M
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Marketing Team&apos;s
            </div>
          </div>
          <ArrowsVertical size={14} weight="regular" className="text-[var(--text-secondary)]" />
        </button>
      </div>
    </aside>
  );

  // Mobile: Show menu button and overlay
  if (mounted && isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-[60] p-2 bg-[var(--background)] rounded-md shadow-md border border-[var(--border-color)] md:hidden"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X size={24} weight="regular" className="text-[var(--text-primary)]" />
          ) : (
            <List size={24} weight="regular" className="text-[var(--text-primary)]" />
          )}
        </button>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        {sidebarContent}
      </>
    );
  }

  // Desktop/Tablet: Always visible (or during SSR before mount)
  return sidebarContent;
}


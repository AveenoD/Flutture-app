"use client";

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
} from "phosphor-react";
import { useSidebar } from "../contexts/SidebarContext";

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
        className={`flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200 mb-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 ${
          isActive
            ? "bg-[#F2F4F7] text-[var(--primary-base)] font-semibold"
            : "text-[#344054] hover:bg-[#F9FAFB] hover:text-[#101828]"
        }`}
        aria-current={isActive ? "page" : undefined}
        aria-label={title}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 ${
              isActive ? "text-[var(--primary-base)]" : "text-[#667085]"
            }`}
            style={{ width: "20px", height: "20px" }}
            aria-hidden="true"
          >
            {icon}
          </div>
          <span className="text-sm font-medium">{title}</span>
        </div>
        {rightIcon && (
          <div className="text-[#98A2B3]" style={{ width: "16px", height: "16px" }} aria-hidden="true">
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
  const { isMobileMenuOpen, setIsMobileMenuOpen, isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const handleMenuClick = (href: string) => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
      onClose?.();
    }
    router.push(href);
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: <ChartPie size={20} weight="regular" />,
      href: "/caller/dashboard",
    },
    {
      title: "Lead List",
      icon: <GridFour size={20} weight="regular" />,
      href: "/caller/lead-list",
    },
    {
      title: "Project Inventory",
      icon: <Users size={20} weight="regular" />,
      href: "/caller/project-inventory",
    },
    {
      title: "Quotation",
      icon: <ShareNetwork size={20} weight="regular" />,
      href: "/quotation",
    },
    {
      title: "Project Detail",
      icon: <FileText size={20} weight="regular" />,
      href: "/project-detail",
    },
    {
      title: "HR Module",
      icon: <Calendar size={20} weight="regular" />,
      href: "/hr-module",
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

  const isRouteActive = (href: string) => {
    if (href === "/caller/dashboard") {
      return pathname === "/caller/dashboard" || pathname === "/";
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  const sidebarContent = (
    <aside
      id="mobile-sidebar"
      className={`flex flex-col bg-white border-r border-[#EAECF0] h-full ${
        isMobile
          ? `fixed top-0 left-0 z-50 w-[248px] h-screen transform transition-transform duration-300 ease-in-out shadow-lg ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`
          : "w-[248px] flex-shrink-0"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo Section */}
      <div className="px-5 h-[72px] flex items-center justify-center border-b border-[#EAECF0]">
        <div className="flex flex-col items-center">
          <Image
            src="/Crown co Logo.svg"
            alt="Crownco Logo"
            width={232}
            height={42}
            priority
            className="w-[232px] h-[42px]"
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
        <div className="h-px bg-[#EAECF0] my-5" />

        {/* Settings Section */}
        <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2 pl-3 mt-6">
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
      <div className="p-4 border-t border-[#EAECF0] flex-shrink-0">
        <button
          onClick={() => {
            console.log("Team selector clicked");
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors active:bg-[#F2F4F7]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#ECFDF3] text-[#027A48] rounded-md flex items-center justify-center font-semibold text-sm">
              M
            </div>
            <div className="text-sm font-semibold text-[#344054]">
              Marketing Team&apos;s
            </div>
          </div>
          <ArrowsVertical size={14} weight="regular" className="text-[#667085]" />
        </button>
      </div>
    </aside>
  );

  // Mobile: Show menu button and overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-[60] p-2 bg-white rounded-md shadow-md border border-[#EAECF0] md:hidden focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 transition-colors hover:bg-[#F9FAFB]"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar"
        >
          {isMobileMenuOpen ? (
            <X size={24} weight="regular" className="text-[#344054]" aria-hidden="true" />
          ) : (
            <List size={24} weight="regular" className="text-[#344054]" aria-hidden="true" />
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

  // Desktop/Tablet: Always visible
  return sidebarContent;
}


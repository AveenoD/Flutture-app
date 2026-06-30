"use client";

import { useEffect } from "react";
import { X, Filter } from "lucide-react";

// Types
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  showClear: boolean;
  onFilterToggle?: () => void;
}

// Drawer Component
export const Drawer = ({ isOpen, onClose, children, title, subtitle, icon }: DrawerProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[1000] animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fixed top-0 right-0 w-full md:w-1/2 lg:w-[50%] xl:w-[45%] h-screen bg-[var(--background)] shadow-[-4px_0_20px_rgba(0,0,0,0.15)] flex flex-col transform transition-transform duration-300 ease-in-out z-[1001] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-5 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0 bg-[var(--background)]">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-dark)] m-0 flex items-center gap-2">
              {icon}
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center flex-shrink-0 min-w-[44px] min-h-[44px]"
            aria-label="Close drawer"
          >
            <X size={18} className="text-[var(--text-primary)]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Search Bar Component
export const SearchBar = ({
  placeholder,
  value,
  onChange,
  onClear,
  showClear,
  onFilterToggle,
}: SearchBarProps) => {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-color)] bg-[var(--background)]">
      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-[calc(100%-52px)]">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 pr-10 border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-base sm:text-sm min-h-[44px]"
          />
          {showClear && (
            <button
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
        {onFilterToggle && (
          <button
            onClick={onFilterToggle}
            className="p-1.5 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center flex-shrink-0 rounded-md border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors ml-auto"
            aria-label="Filter"
          >
            <Filter size={18} className="text-[var(--text-primary)]" />
          </button>
        )}
      </div>
    </div>
  );
};


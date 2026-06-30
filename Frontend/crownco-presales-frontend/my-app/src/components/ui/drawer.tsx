"use client";

import { X } from "phosphor-react";
import { ReactNode } from "react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  position?: "left" | "right";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "max-w-[500px]",
  position = "right",
}: DrawerProps) {
  if (!isOpen) return null;

  const positionClasses = {
    right: "right-0",
    left: "left-0",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer - Slides in from side */}
      <div className={`fixed top-0 ${positionClasses[position]} bottom-0 z-50 w-full ${width} bg-white shadow-2xl transform transition-transform duration-300 ease-in-out`}>
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-[#EAECF0] px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#344054]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#F9FAFB] rounded-md transition-colors"
              aria-label="Close drawer"
            >
              <X size={20} weight="regular" className="text-[#667085]" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 border-t border-[#EAECF0] bg-white">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


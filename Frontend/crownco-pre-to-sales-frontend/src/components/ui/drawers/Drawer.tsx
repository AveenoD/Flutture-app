"use client";

import React from "react";
import { X } from "lucide-react";

type DrawerProps = {
  title?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Base Drawer component
 * Slides in from the right, with backdrop
 */
export function Drawer({ title, open, onClose, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="w-full sm:max-w-md bg-white h-full shadow-xl px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {title && (
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}


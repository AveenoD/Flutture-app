"use client";

import React from "react";
import { Layers, Plus, Minus } from "lucide-react";

export type Amenity = {
  id: string;
  label: string;
  amount: number;
  selected: boolean;
};

type AmenityCardProps = {
  amenities: Amenity[];
  onToggle: (id: string) => void;
  title?: string;
  description?: string;
  className?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function AmenityCard({
  amenities,
  onToggle,
  title = "Additional Amenities",
  description = "Select add-ons to include in final pricing.",
  className = "",
}: AmenityCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-[var(--primary-base)]" />
        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-[11px] sm:text-xs text-slate-500 mb-3">
          {description}
        </p>
      )}
      <div className="space-y-2">
        {amenities.map((amenity) => (
          <button
            key={amenity.id}
            type="button"
            onClick={() => onToggle(amenity.id)}
            className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm transition-colors ${
              amenity.selected
                ? "border-[var(--primary-base)] bg-[var(--primary-soft)] text-slate-900"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span className="flex items-center gap-2">
              {amenity.selected ? (
                <Minus className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {amenity.label}
            </span>
            <span className="font-semibold">
              {formatCurrency(amenity.amount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


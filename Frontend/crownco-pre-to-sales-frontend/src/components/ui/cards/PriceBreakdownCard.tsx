"use client";

import React from "react";
import { IndianRupee } from "lucide-react";

export type ChargeItem = {
  id: string;
  label: string;
  amount: number;
  type: "base" | "tax" | "charge" | "discount";
};

export type PriceSummary = {
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
};

type PriceBreakdownCardProps = {
  charges: ChargeItem[];
  summary: PriceSummary;
  title?: string;
  className?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function PriceBreakdownCard({
  charges,
  summary,
  title = "Price Breakdown",
  className = "",
}: PriceBreakdownCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <IndianRupee className="w-4 h-4 text-[var(--primary-base)]" />
        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {charges.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs sm:text-sm text-slate-700"
          >
            <div className="flex items-center gap-2">
              {item.type === "tax" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600">
                  Tax
                </span>
              )}
              {item.type === "discount" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                  Discount
                </span>
              )}
              <span>{item.label}</span>
            </div>
            <span
              className={`font-semibold ${
                item.amount < 0 ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-3 mt-2 space-y-1 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-semibold text-slate-900">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Taxes</span>
          <span className="font-semibold text-slate-900">
            {formatCurrency(summary.taxes)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Discounts</span>
          <span className="font-semibold text-emerald-600">
            {formatCurrency(summary.discounts)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-1">
          <span className="text-xs sm:text-sm font-semibold text-slate-900">
            Final All-Inclusive Price
          </span>
          <span className="text-base sm:text-lg font-bold text-[var(--primary-base)]">
            {formatCurrency(summary.total)}
          </span>
        </div>
      </div>
    </div>
  );
}


"use client";

import { Pencil } from "phosphor-react";

export interface PriceBreakdownItem {
  label: string;
  amount: number; // Amount in rupees (positive for additions, negative for discounts)
  isDiscount?: boolean;
}

export interface PriceBreakdownCardProps {
  items: PriceBreakdownItem[];
  finalPrice: number;
  onEdit?: () => void;
  className?: string;
}

export function PriceBreakdownCard({
  items,
  finalPrice,
  onEdit,
  className = "",
}: PriceBreakdownCardProps) {
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("en-IN");
  };

  return (
    <div
      className={`bg-white rounded-xl p-3 sm:p-4 border border-[var(--sidebar-border-color)] shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex justify-between items-center mb-2.5 sm:mb-3">
        <h2 className="text-sm sm:text-base font-bold text-[var(--sidebar-text-main)]">
          Price Breakdown
        </h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F5F5F5] hover:bg-[#E0E0E0] flex items-center justify-center transition-colors"
            aria-label="Edit price breakdown"
          >
            <Pencil size={14} className="sm:w-4 sm:h-4 text-[var(--primary-base)]" weight="regular" />
          </button>
        )}
      </div>
      <div className="space-y-2 sm:space-y-2.5">
        {items.map((item, index) => {
          const isNegative = item.amount < 0;
          const isDiscount = item.isDiscount || isNegative;
          const displayAmount = Math.abs(item.amount);
          const sign = isNegative ? "-" : "+";

          return (
            <div
              key={index}
              className={`flex justify-between items-center pb-2 sm:pb-2.5 border-b border-[#F1F3F6] text-xs sm:text-sm ${
                isDiscount ? "text-[var(--error)]" : "text-[var(--sidebar-text-main)]"
              }`}
            >
              <span className="flex-1 min-w-0 pr-2 break-words">{item.label}</span>
              <span className="font-medium whitespace-nowrap flex-shrink-0">
                {sign} ₹ {formatCurrency(displayAmount)}
              </span>
            </div>
          );
        })}
        <div className="flex justify-between items-center pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t-2 border-dashed border-[#CCC] text-sm sm:text-base font-bold text-[var(--success)]">
          <span className="flex-1 min-w-0 pr-2">Final Deal Price</span>
          <span className="whitespace-nowrap flex-shrink-0">₹ {formatCurrency(finalPrice)}</span>
        </div>
      </div>
    </div>
  );
}


"use client";

import Image from "next/image";
import { Check } from "phosphor-react";

export interface AddOnCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  className?: string;
}

export function AddOnCard({
  id,
  title,
  description,
  price,
  image,
  isSelected,
  onToggle,
  className = "",
}: AddOnCardProps) {
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("en-IN");
  };

  return (
    <div
      className={`bg-white border border-[#E3E6F0] rounded-lg px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 cursor-pointer transition-colors hover:border-[var(--primary-base)] ${className}`}
      onClick={() => onToggle(id)}
    >
      <div className="flex gap-2.5 sm:gap-3 md:gap-4">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-0.5 sm:pt-1">
          <div
            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm border flex items-center justify-center transition-all ${
              isSelected
                ? "bg-[var(--primary-base)] border-[var(--primary-base)] text-white"
                : "border-[#D0D5DD] bg-white text-transparent"
            }`}
          >
            <Check size={12} weight="bold" className="sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        {/* Image */}
        <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0 rounded-md overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 48px, (max-width: 768px) 64px, 80px"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-xs sm:text-sm md:text-base font-semibold text-[var(--sidebar-text-main)] mb-0.5 sm:mb-1 truncate">
            {title}
          </h3>
          <p className="text-[10px] sm:text-xs md:text-sm text-[var(--sidebar-text-sub)] mb-1 sm:mb-1.5 line-clamp-2">
            {description}
          </p>
          <p className="text-xs sm:text-sm md:text-base font-semibold text-[var(--primary-base)]">
            ₹ {formatCurrency(price)}
          </p>
        </div>
      </div>
    </div>
  );
}


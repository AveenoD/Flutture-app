import React from "react";

export interface BookingPriceInputProps {
  label: string;
  type?: "text" | "date" | "number" | "email" | "tel";
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function BookingPriceInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  required = false,
  disabled = false,
  id,
  name,
}: BookingPriceInputProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id || name}
        className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-main)] mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id || name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-3 border-2 border-[var(--sidebar-border-color)] rounded-lg outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}
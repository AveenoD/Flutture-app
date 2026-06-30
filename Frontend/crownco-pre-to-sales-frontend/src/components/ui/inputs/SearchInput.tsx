"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

type SearchInputProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  showClearButton?: boolean;
};

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className = "",
  showClearButton = true,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const debouncedValue = useDebounce(
    controlledValue !== undefined ? controlledValue : internalValue,
    debounceMs
  );

  // Use controlled or internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledValue !== undefined ? onChange : setInternalValue;

  // Call onChange when debounced value changes
  useEffect(() => {
    if (controlledValue === undefined) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, controlledValue]);

  const handleClear = () => {
    setValue("");
    onChange("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Search className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm sm:text-base
          border border-slate-300 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent
          placeholder:text-slate-400
          bg-white
        "
      />
      {showClearButton && value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Microphone, PaperPlaneTilt, Paperclip, Camera, Plus } from "phosphor-react";

export interface FollowUpReminder {
  message: string;
  onAdd?: () => void;
}

export interface RemarksSectionProps {
  remarks?: string[];
  summary?: string;
  className?: string;
  showInput?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  inputPlaceholder?: string;
  followUpReminder?: FollowUpReminder;
}

export function RemarksSection({
  remarks,
  summary,
  className = "",
  showInput = false,
  inputValue = "",
  onInputChange,
  onInputSubmit,
  inputPlaceholder = "Add a new remark...",
  followUpReminder,
}: RemarksSectionProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onInputSubmit) {
      onInputSubmit();
    }
  };

  return (
    <div className={`bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors ${className}`}>
      {/* Summary Mode */}
      {summary && (
        <div className="relative">
          <span className="absolute left-2 sm:left-3 md:left-4 top-1 sm:top-1.5 md:top-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-r from-[var(--primary-base)] to-[#3b82f6] shadow-[0_0_0_2px_rgba(0,130,224,0.1)] sm:shadow-[0_0_0_3px_rgba(0,130,224,0.1)]"></span>
          <div className="pl-3 sm:pl-4 md:pl-6 text-xs sm:text-sm md:text-base text-[var(--foreground)] leading-relaxed">
            {summary}
          </div>
        </div>
      )}

      {/* Remarks List Mode */}
      {remarks && (
        <>
          {remarks.length === 0 ? (
            <p className="text-xs sm:text-sm md:text-base text-[var(--sidebar-text-sub)] text-center py-2 sm:py-3">No remarks available</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 md:mb-5">
              {remarks.map((remark, index) => (
                <li key={index} className="relative pl-4 sm:pl-5 text-xs sm:text-sm md:text-base text-[#2D3748] leading-relaxed">
                  <span className="absolute left-0 top-1.5 sm:top-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--primary-base)] rounded-full"></span>
                  {remark}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Follow-up Reminder Suggestion */}
      {followUpReminder && (
        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-5 border border-[#E3E6F0] shadow-sm mb-3 sm:mb-4 md:mb-5 flex items-center justify-between gap-2 sm:gap-3">
          <p className="text-xs sm:text-sm md:text-base text-[#718096] flex-1 leading-relaxed pr-2">
            {followUpReminder.message}
          </p>
          <button
            onClick={followUpReminder.onAdd}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border border-[#E3E6F0] bg-[#F8FAFC] flex items-center justify-center text-base sm:text-lg md:text-xl font-semibold text-[#2D3748] hover:bg-[#E3E6F0] transition-colors cursor-pointer flex-shrink-0"
            aria-label="Add follow-up reminder"
          >
            <Plus size={14} weight="bold" className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>
      )}

      {/* Input Field */}
      {showInput && (
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          <div className="flex-1 flex items-center gap-2 sm:gap-3 bg-[#F8F9FC] border border-[#E3E6F0] rounded-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 focus-within:border-[var(--primary-base)] focus-within:ring-2 focus-within:ring-[var(--primary-selected)] transition-all min-w-0">
            <span className="text-base sm:text-lg md:text-xl flex-shrink-0">😊</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={inputPlaceholder}
              className="flex-1 border-none bg-transparent outline-none text-xs sm:text-sm md:text-base text-[#2D3748] placeholder:text-[#718096] min-w-0 w-0"
            />
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              <button 
                type="button"
                className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                title="Add link"
              >
                <Paperclip size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
              </button>
              <button 
                type="button"
                className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                title="Add image"
              >
                <Camera size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (inputValue.trim() && onInputSubmit) {
                onInputSubmit();
              }
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] hover:scale-105 transition-all flex-shrink-0 shadow-sm"
            title={inputValue.trim() ? "Send remark" : "Voice input"}
          >
            {inputValue.trim() ? (
              <PaperPlaneTilt size={12} weight="fill" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            ) : (
              <Microphone size={12} weight="fill" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}


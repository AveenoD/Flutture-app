"use client";

import { Clock, PlayCircle, CheckCircle, WarningCircle, Chat, CaretRight } from "phosphor-react";

export type CallChatType = "call" | "chat";

export type StatusType = "answered" | "awaiting" | "missed" | "pending";

export interface CallChatCardProps {
  type: CallChatType;
  timestamp: string;
  summary: string;
  status: StatusType;
  statusText: string;
  // For call type
  duration?: string;
  onPlay?: () => void;
  // For chat type
  messageCount?: number;
  // Common
  onClick?: () => void;
  onForward?: () => void;
  className?: string;
  showBorder?: boolean;
}

const statusConfig: Record<StatusType, { color: string; icon: typeof CheckCircle }> = {
  answered: {
    color: "text-[var(--success)]",
    icon: CheckCircle,
  },
  awaiting: {
    color: "text-[var(--warning)]",
    icon: WarningCircle,
  },
  missed: {
    color: "text-[var(--error)]",
    icon: WarningCircle,
  },
  pending: {
    color: "text-[#718096]",
    icon: Clock,
  },
};

export function CallChatCard({
  type,
  timestamp,
  summary,
  status,
  statusText,
  duration,
  onPlay,
  messageCount,
  onClick,
  onForward,
  className = "",
  showBorder = true,
}: CallChatCardProps) {
  const StatusIcon = statusConfig[status].icon;
  const statusColor = statusConfig[status].color;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div
        className={`flex flex-col gap-3 sm:gap-4 ${
          showBorder ? "pb-3 sm:pb-4 border-b border-[#F1F5F9]" : ""
        }`}
      >
        {/* Top Section - Main Content */}
        <div className="flex gap-3 sm:gap-4 flex-1">
          <Clock size={18} weight="regular" className="text-[#718096] flex-shrink-0 mt-0.5 sm:mt-1" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#2D3748] mb-1 sm:mb-1.5">{timestamp}</h4>
            <p className="text-xs sm:text-sm text-[#718096] mb-2 sm:mb-2.5 leading-relaxed">{summary}</p>
            <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${statusColor}`}>
              <StatusIcon size={14} weight="fill" className="flex-shrink-0" />
              <span className="font-medium">{statusText}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section - Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pl-7 sm:pl-8">
          <div className="flex items-center gap-2 sm:gap-3">
            {type === "call" && duration && (
              <div
                className="flex items-center gap-1.5 text-[var(--primary-base)] font-medium text-xs sm:text-sm cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.();
                }}
              >
                <PlayCircle size={16} weight="fill" className="sm:w-[18px] sm:h-[18px]" />
                <span>{duration}</span>
              </div>
            )}

            {type === "chat" && messageCount !== undefined && (
              <div className="flex items-center gap-1.5 text-[#718096] font-medium text-xs sm:text-sm">
                <Chat size={16} weight="regular" className="sm:w-[18px] sm:h-[18px]" />
                <span>{messageCount} Message{messageCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onForward?.();
              onClick?.();
            }}
            className="text-[#718096] hover:text-[var(--primary-base)] transition-colors p-1 flex-shrink-0"
            aria-label="View details"
          >
            <CaretRight size={16} weight="bold" className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}


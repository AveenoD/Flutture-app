"use client";

import { Phone, MapPin, CaretRight, CheckCircle } from "phosphor-react";
import { StatusBadge, SourceBadge, StatusType } from "../badges";

export interface DataCardProps {
  id: number;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  budget?: string;
  propertyName?: string;
  /** Extra line from portal (source_detail). */
  sourceDetail?: string;
  /** Backend pipeline status label (e.g. Unqualified). */
  leadStatusLabel?: string;
  timeAgo?: string;
  location?: string;
  status?: StatusType;
  source?: string;
  onClick?: () => void;
  onCall?: (id: number) => void;
  onQualify?: (id: number) => void;
  showActions?: boolean;
  variant?: "detailed" | "compact";
}

export function DataCard({
  id,
  name,
  phone,
  email,
  avatar: _avatar,
  budget,
  propertyName,
  sourceDetail,
  leadStatusLabel,
  timeAgo,
  location,
  status,
  source,
  onClick,
  onCall,
  onQualify,
  showActions = false,
  variant = "detailed",
}: DataCardProps) {
  const isCompact = variant === "compact";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "NA";

  // Compact view - simple layout with name, phone, and action buttons
  if (isCompact) {
    return (
      <div
        className="bg-white rounded-lg border border-[#EAECF0] p-4 shadow-sm hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {/* Profile Picture */}
          <div className="w-12 h-12 rounded-full flex-shrink-0 bg-[var(--primary-base)]/15 text-[var(--primary-base)] font-semibold text-sm flex items-center justify-center">
            {initials}
          </div>

          {/* Name and Phone */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#344054] truncate mb-0.5">
              {name}
            </h3>
            <p className="text-sm text-[#667085] truncate">{phone}</p>
          </div>

          {/* Action Buttons */}
          {(onCall || onQualify) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onQualify && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQualify(id);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0 shadow-sm"
                  aria-label={`Qualify ${name}`}
                >
                  <CheckCircle size={20} weight="fill" />
                </button>
              )}
              {onCall && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(id);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0 shadow-sm"
                  aria-label={`Call ${name}`}
                >
                  <Phone size={20} weight="fill" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detailed view - full card with all information
  return (
    <div
      className="bg-white rounded-lg border border-[#EAECF0] p-4 cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full flex-shrink-0 bg-[var(--primary-base)]/15 text-[var(--primary-base)] font-semibold text-sm flex items-center justify-center">
            {initials}
          </div>

          {/* Name and Property */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#344054] truncate mb-0.5">
              {name}
            </h3>
            {propertyName && (
              <p className="text-sm text-[#667085] truncate">{propertyName}</p>
            )}
            {sourceDetail && (
              <p className="text-xs text-[#98A2B3] truncate mt-0.5">{sourceDetail}</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {status && (
          <div className="flex-shrink-0 ml-2">
            <StatusBadge status={status} />
          </div>
        )}
      </div>

      {/* Contact and Location Info */}
      {(phone || email || location) && (
        <div className="space-y-2 mb-4">
          {/* Phone */}
          {phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} weight="regular" className="text-[var(--primary-base)] flex-shrink-0" />
              <span className="text-sm text-[#344054]">{phone}</span>
            </div>
          )}

          {email && (
            <p className="text-xs text-[#667085] truncate pl-0.5" title={email}>
              {email}
            </p>
          )}

          {leadStatusLabel && (
            <p className="text-xs text-[#475467]">
              Pipeline: <span className="font-medium">{leadStatusLabel}</span>
            </p>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin size={16} weight="regular" className="text-[var(--primary-base)] flex-shrink-0" />
              <span className="text-sm text-[#344054]">{location}</span>
            </div>
          )}
        </div>
      )}

      {/* Budget */}
      {budget && (
        <div className="mb-4">
          <p className="text-sm text-[#667085]">
            Budget -{" "}
            <span className="text-[var(--primary-base)] font-semibold">
              {budget}
            </span>
          </p>
        </div>
      )}

      {/* Footer Section */}
      {(source || timeAgo || showActions) && (
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EAECF0]">
          {/* Source Badge */}
          {source && (
            <div className="truncate max-w-[40%] sm:max-w-none">
              <SourceBadge source={source} className="truncate" />
            </div>
          )}

          {/* Time Ago - Center */}
          {timeAgo && (
            <span className="text-xs text-[#98A2B3] flex-1 text-center whitespace-nowrap">{timeAgo}</span>
          )}

          {/* Action Buttons or Next Icon */}
          {showActions && (onCall || onQualify) ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onQualify && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQualify(id);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0 shadow-sm"
                  aria-label={`Qualify ${name}`}
                >
                  <CheckCircle size={20} weight="fill" />
                </button>
              )}
              {onCall && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(id);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0 shadow-sm"
                  aria-label={`Call ${name}`}
                >
                  <Phone size={20} weight="fill" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F9FAFB] transition-colors flex-shrink-0"
              aria-label="View details"
            >
              <CaretRight size={16} weight="bold" className="text-[#344054]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}


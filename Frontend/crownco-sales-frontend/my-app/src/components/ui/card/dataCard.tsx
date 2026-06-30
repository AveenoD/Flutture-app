"use client";

import Image from "next/image";
import { Phone, MapPin, CaretRight } from "phosphor-react";
import { StatusBadge, SourceBadge, StatusType } from "../badges";

export interface DataCardProps {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  budget: string;
  propertyName: string;
  timeAgo: string;
  location: string;
  status: StatusType;
  source: string;
  onClick?: () => void;
}

export function DataCard({
  name,
  phone,
  avatar,
  budget,
  propertyName,
  timeAgo,
  location,
  status,
  source,
  onClick,
}: DataCardProps) {

  return (
    <div
      className="bg-white rounded-lg border border-[#EAECF0] p-4 cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src={avatar}
              alt={name}
              fill
              className="rounded-full object-cover"
              sizes="48px"
            />
          </div>

          {/* Name and Property */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#344054] truncate mb-0.5">
              {name}
            </h3>
            <p className="text-sm text-[#667085] truncate">{propertyName}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0 ml-2">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Contact and Location Info */}
      <div className="space-y-2 mb-4">
        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone size={16} weight="regular" className="text-[var(--primary-base)] flex-shrink-0" />
          <span className="text-sm text-[#344054]">{phone}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin size={16} weight="regular" className="text-[var(--primary-base)] flex-shrink-0" />
          <span className="text-sm text-[#344054]">{location}</span>
        </div>
      </div>

      {/* Budget */}
      <div className="mb-4">
        <p className="text-sm text-[#667085]">
          Budget -{" "}
          <span className="text-[var(--primary-base)] font-semibold">
            {budget}
          </span>
        </p>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EAECF0]">
        {/* Source Badge */}
        <div className="truncate max-w-[40%] sm:max-w-none">
          <SourceBadge source={source} className="truncate" />
        </div>

        {/* Time Ago - Center */}
        <span className="text-xs text-[#98A2B3] flex-1 text-center whitespace-nowrap">{timeAgo}</span>

        {/* Next Icon */}
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
      </div>
    </div>
  );
}


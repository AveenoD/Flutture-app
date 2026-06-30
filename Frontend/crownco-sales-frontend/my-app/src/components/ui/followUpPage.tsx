"use client";

import { useState } from "react";
import Image from "next/image";
import { Phone, MapPin } from "phosphor-react";
import { StatusBadge, SourceBadge, StatusType } from "./badges";
import { RemarksSection } from "./remarksSection";
import { CallRecordingCard } from "./card/callRecordingCard";

export interface LeadData {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  budget: string;
  propertyId: string;
  location: string;
  status: StatusType;
  source: string;
  timeFrame: string;
}

export interface CallRecording {
  timestamp: string;
  duration: string;
  currentTime: string;
  transcription: string;
}

export interface FollowUpPageProps {
  leadData: LeadData;
  remarks: string[];
  callRecording: CallRecording;
  className?: string;
}

export function FollowUpPage({ leadData, remarks, callRecording, className = "" }: FollowUpPageProps) {

  return (
    <div className={`w-full ${className}`}>
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.3fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-7 2xl:gap-8">
        {/* Left Section */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <div className="flex items-start justify-between mb-4 sm:mb-5 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                  <Image
                    src={leadData.avatar}
                    alt={leadData.name}
                    fill
                    className="rounded-full object-cover"
                    sizes="(max-width: 640px) 48px, 56px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#2D3748] mb-1 truncate">{leadData.name}</h3>
                  <p className="text-xs sm:text-sm text-[#718096] truncate">{leadData.propertyId}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <StatusBadge status={leadData.status} />
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
              <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-[#718096]">
                <Phone size={14} weight="regular" className="text-[var(--primary-base)] flex-shrink-0 sm:w-4 sm:h-4" />
                <span className="truncate">{leadData.phone}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-[#718096]">
                <MapPin size={14} weight="regular" className="text-[var(--primary-base)] flex-shrink-0 sm:w-4 sm:h-4" />
                <span className="truncate">{leadData.location}</span>
              </div>
            </div>

            {/* Budget */}
            <p className="text-xs sm:text-sm text-[#718096] mb-3 sm:mb-4">
              Badge - <span className="text-[var(--primary-base)] font-bold">{leadData.budget}</span>
            </p>

            {/* Tag Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-[#F1F5F9]">
              <div className="flex-1 min-w-0">
                <SourceBadge source={leadData.source} />
              </div>
              <span className="text-xs text-[#718096] whitespace-nowrap flex-shrink-0">{leadData.timeFrame}</span>
            </div>
          </div>

          {/* Calls Recording Section */}
          <CallRecordingCard
            recording={callRecording}
            showTitle={true}
            onDownload={() => {
              console.log("Download recording");
            }}
          />
        </div>

        {/* Right Section - Remarks */}
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748] mb-4 sm:mb-5 lg:mb-6">Remarks</h2>
          <RemarksSection remarks={remarks} />
        </div>
      </div>
    </div>
  );
}


"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import { StatusType } from "../../../../../../../components/ui/badges";
import { FollowUpPage } from "../../../../../../../components/ui/followUpPage";

export default function SiteVisitFollowUpDetailPage() {
  const router = useRouter();

  // Lead data (in real app, this would come from API/params)
  const leadData = {
    id: 1,
    name: "Shaikh Maaz",
    phone: "(808) 555-0111",
    avatar: "https://i.pravatar.cc/150?u=shaikh",
    budget: "₹40L - ₹50L",
    propertyId: "# Prop8967",
    location: "Pembroke Pines",
    status: "veryhot" as StatusType,
    source: "Assigned By Anuj",
    timeFrame: "1-3 months",
  };

  // Remarks data
  const remarks = [
    "Client is interested in 2BHK, corner-facing unit.",
    "Shared pricing PDF via WhatsApp.",
    "Next follow-up scheduled for Thursday, 11 AM.",
    "Next follow-up scheduled for Thursday, 11 AM.",
  ];

  // Call recording data
  const callRecording = {
    timestamp: "Today, 2:30 PM",
    duration: "5:45",
    currentTime: "0:05",
    transcription:
      '"The client expressed strong interest in the corner-facing unit on the 7th floor. They requested a detailed breakdown of the EMI options for the 40L-50L budget bracket."',
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeft size={18} weight="regular" className="text-[#2D3748]" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-[#2D3748]">Follow Ups Detail</h1>
      </div>

      {/* Main Content */}
      <FollowUpPage
        leadData={leadData}
        remarks={remarks}
        callRecording={callRecording}
      />
    </div>
  );
}
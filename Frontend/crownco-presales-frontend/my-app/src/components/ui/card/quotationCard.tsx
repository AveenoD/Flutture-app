"use client";

import Image from "next/image";
import {
  MapPin,
  Buildings,
  User,
  Eye,
  ShareNetwork,
} from "phosphor-react";

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

export interface QuotationData {
  id: string;
  status?: "approved" | "pending" | "draft";
  project: {
    name: string;
    image: string;
    location: string;
    configuration: string;
    priceRange: string;
    category: string;
    status: string;
    features: string[];
  };
  allocatedFlat: {
    wing: string;
    flatNo: string;
    floor: string;
    reraCarpetArea: string;
  };
  priceBreakdown: PriceBreakdownItem[];
  finalPrice: number;
  assignedRepresentative: {
    salesPerson: string;
    contactNo: string;
    email: string;
    channelPartner: string;
  };
  clientInfo: {
    customerName: string;
    contactNo: string;
    email: string;
  };
  projectSnapshot?: {
    areaType: string;
    reraNumber: string;
    possessionDate: string;
  };
  createdAt?: Date | string;
}

interface QuotationCardProps {
  quotation: QuotationData;
  onEdit?: () => void;
  onShare?: () => void;
  onView?: () => void;
}

const categoryColors: Record<string, string> = {
  Residential: "bg-[#E8F5E9] text-[#2E7D32]",
  Mixed: "bg-[#FFF9C4] text-[#FBC02D]",
  Commercial: "bg-[#E8EAF6] text-[#3F51B5]",
};

const statusColors: Record<string, string> = {
  Ongoing: "bg-[#FFE0B2] text-[#E65100]",
  Upcoming: "bg-[#FFE0B2] text-[#E65100]",
  "Ready Move": "bg-[#E8F5E9] text-[#2E7D32]",
};

export function QuotationCard({ quotation, onShare, onView }: QuotationCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Project Detail Section - Compact */}
      <div className="p-3 sm:p-4 border-b border-slate-200">
        <div className="relative w-full h-40 sm:h-44 md:h-48 rounded-lg overflow-hidden mb-3">
          <Image
            src={quotation.project.image}
            alt={quotation.project.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
          <h3 className="text-base sm:text-lg font-bold text-[var(--primary-base)] line-clamp-1">
            {quotation.project.name}
          </h3>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                categoryColors[quotation.project.category] || categoryColors.Residential
              }`}
            >
              {quotation.project.category}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                statusColors[quotation.project.status] || statusColors.Ongoing
              }`}
            >
              {quotation.project.status}
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin size={12} weight="regular" />
            <span className="truncate">{quotation.project.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Buildings size={12} weight="regular" />
            <span className="truncate">{quotation.project.configuration}</span>
          </div>
        </div>

        {quotation.project.features && quotation.project.features.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {quotation.project.features.slice(0, 2).map((feature, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700"
              >
                {feature}
              </span>
            ))}
            {quotation.project.features.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                +{quotation.project.features.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Key Info - Compact */}
      <div className="p-3 sm:p-4 border-b border-slate-200">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Flat No</p>
            <p className="text-xs font-semibold text-slate-900">
              {quotation.allocatedFlat.flatNo || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Floor</p>
            <p className="text-xs font-semibold text-slate-900">
              {quotation.allocatedFlat.floor || "N/A"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Customer</p>
          <p className="text-xs font-semibold text-slate-900">
            {quotation.clientInfo.customerName}
          </p>
        </div>
      </div>

      {/* Final Price - Compact */}
      <div className="p-3 sm:p-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-700">Final Price</span>
          <span className="text-sm font-bold text-green-600">
            ₹{(quotation.finalPrice / 10000000).toFixed(2)} Cr
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 sm:p-4">
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={onView}
              className="flex-1 py-2 px-3 bg-[var(--primary-base)] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={16} weight="regular" />
              View
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center"
              aria-label="Share"
            >
              <ShareNetwork size={16} weight="regular" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



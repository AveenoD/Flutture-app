"use client";

import Image from "next/image";
import { MapPin, Buildings, Tag } from "phosphor-react";

export interface ProjectCardProps {
  image: string;
  name: string;
  // Detailed mode props (for project inventory)
  location?: string;
  configuration?: string;
  priceRange?: string;
  category?: "Residential" | "Mixed" | "Commercial";
  status?: "Ongoing" | "Upcoming" | "Ready Move";
  features?: string[];
  // Simple mode props (for dashboard)
  stats?: string;
  conversion?: string;
  conversionUp?: boolean;
  // Common props
  onClick?: () => void;
  imageHeight?: string;
  variant?: "default" | "detail"; // "detail" removes hover effects and allows larger image
}

const categoryColors = {
  Residential: "bg-[#E8F5E9] text-[#2E7D32]",
  Mixed: "bg-[#FFF9C4] text-[#FBC02D]",
  Commercial: "bg-[#E8EAF6] text-[#3F51B5]",
};

const statusColors = {
  Ongoing: "bg-[#FFE0B2] text-[#E65100]",
  Upcoming: "bg-[#FFE0B2] text-[#E65100]",
  "Ready Move": "bg-[#E8F5E9] text-[#2E7D32]",
};

const featureColors: Record<string, string> = {
  "Sea Facing": "bg-[#F3E5F5] text-[#7B1FA2]",
  "Smart Homes": "bg-[#FFFDE7] text-[#827717]",
  "Play Ground": "bg-[#E3F2FD] text-[#1976D2]",
};

export function ProjectCard({
  image,
  name,
  location,
  configuration,
  priceRange,
  category,
  status,
  features = [],
  stats,
  conversion,
  conversionUp,
  onClick,
  imageHeight,
  variant = "default",
}: ProjectCardProps) {
  // Determine if it's simple mode (dashboard) or detailed mode (project inventory)
  const isSimpleMode = !location && !configuration && !priceRange && !category && !status;
  const isDetailVariant = variant === "detail";

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#E3E6F0] overflow-hidden transition-all duration-200 ${
        onClick ? "cursor-pointer" : ""
      } ${
        isDetailVariant
          ? onClick
            ? "hover:shadow-md hover:border-slate-300"
            : ""
          : `${
              isSimpleMode
                ? "hover:shadow-sm hover:border-slate-300"
                : "hover:-translate-y-1 hover:shadow-lg"
            }`
      }`}
    >
      <div className={`relative w-full ${imageHeight || (isDetailVariant ? "h-[200px] sm:h-[220px] md:h-[250px]" : isSimpleMode ? "h-24 sm:h-28 md:h-32" : "h-[140px] sm:h-[160px] md:h-[180px]")}`}>
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className={isSimpleMode ? "px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2" : "p-3 sm:p-4 md:p-5"}>
        {isSimpleMode ? (
          // Simple mode (Dashboard)
          <>
            <h4 className="text-xs sm:text-sm md:text-base font-semibold text-slate-900 truncate">{name}</h4>
            {stats && (
              <p className="mt-1 text-[10px] sm:text-xs text-slate-600 leading-relaxed line-clamp-2">{stats}</p>
            )}
            {conversion && (
              <p
                className={`mt-1 text-[10px] sm:text-xs font-medium ${
                  conversionUp ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {conversion} conversion
              </p>
            )}
          </>
        ) : (
          // Detailed mode (Project Inventory)
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-[var(--primary-base)] flex-1 truncate">
                {name}
              </h3>
              {(category || status) && (
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                  {category && (
                    <span
                      className={`px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium ${categoryColors[category]}`}
                    >
                      {category}
                    </span>
                  )}
                  {status && (
                    <span
                      className={`px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium ${statusColors[status]}`}
                    >
                      {status}
                    </span>
                  )}
                </div>
              )}
            </div>
            {(location || configuration || priceRange) && (
              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                {location && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#718096]">
                    <MapPin size={14} weight="regular" className="sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
                {configuration && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#718096]">
                    <Buildings size={14} weight="regular" className="sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{configuration}</span>
                  </div>
                )}
                {priceRange && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#718096]">
                    <Tag size={14} weight="regular" className="sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{priceRange}</span>
                  </div>
                )}
              </div>
            )}
            {features && features.length > 0 && (
              <div className="flex gap-1.5 sm:gap-2 flex-wrap mt-3 sm:mt-4">
                {features.map((feature, index) => (
                  <span
                    key={index}
                    className={`px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium ${
                      featureColors[feature] || "bg-[#F3F4F6] text-[#718096]"
                    }`}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


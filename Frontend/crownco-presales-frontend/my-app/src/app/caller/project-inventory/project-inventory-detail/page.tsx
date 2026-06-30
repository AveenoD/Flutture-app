"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "phosphor-react";
import { KPICard } from "../../../../components/ui/kpi";
import { ProjectCard } from "../../../../components/ui/card/projectCard";
import { AmenityCard, AmenityIcon } from "../../../../components/ui/card/aminityCard";
import { PieChart } from "../../../../components/ui/pieChart";
import { DownloadCard } from "../../../../components/ui/card/downloadCard";

type UnitStatus = "available" | "booked" | "not-sale" | "selected";

interface Unit {
  id: string;
  status: UnitStatus;
}

const units: Unit[] = [
  { id: "A-101", status: "available" },
  { id: "A-102", status: "available" },
  { id: "A-103", status: "booked" },
  { id: "A-104", status: "available" },
  { id: "A-105", status: "available" },
  { id: "A-106", status: "not-sale" },
  { id: "A-107", status: "not-sale" },
  { id: "A-108", status: "available" },
  { id: "A-109", status: "booked" },
  { id: "A-110", status: "available" },
  { id: "B-101", status: "booked" },
  { id: "B-102", status: "booked" },
  { id: "B-103", status: "available" },
  { id: "B-104", status: "available" },
  { id: "B-105", status: "available" },
  { id: "B-106", status: "available" },
];

const amenities = [
  { icon: AmenityIcon.SwimmingPool, name: "Swimming Pool" },
  { icon: AmenityIcon.Gym, name: "Gym" },
  { icon: AmenityIcon.PowerBackup, name: "Power Backup" },
  { icon: AmenityIcon.Parking, name: "Parking" },
  { icon: AmenityIcon.Medical, name: "Medical" },
  { icon: AmenityIcon.IndoorGame, name: "Indoor Game" },
  { icon: AmenityIcon.YogaArea, name: "Yoga Area" },
  { icon: AmenityIcon.Security, name: "Security" },
  { icon: AmenityIcon.ClubHouse, name: "Club House" },
];

const galleryImages = [
  "/property-1 1.png",
  "/property-2 1.png",
  "/Property-3 1.png",
  "/property-1 1.png",
];

const leadSourcesData = [
  { name: "Booking.com", value: 25, color: "var(--primary-base)" }, // Blue - Row 1, Left
  { name: "99acres.com", value: 20, color: "var(--secondary-base)" }, // Darker blue/reddish - Row 1, Right
  { name: "Magicbrick.com", value: 10, color: "var(--success)" }, // Green - Row 2, Left
  { name: "Nobroker.com", value: 20, color: "var(--purple)" }, // Purple - Row 2, Right
  { name: "Housing.com", value: 15, color: "var(--warning)" }, // Orange - Row 3, Left
  { name: "Manual", value: 10, color: "var(--disabled-text)" }, // Grey - Row 3, Right
];

export default function ProjectInventoryDetailPage() {
  const router = useRouter();
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [showAllKPIs, setShowAllKPIs] = useState(false);

  // All KPI Stats Data
  const allKpiStats = [
    { icon: "👤", value: "128", label: "Total Leads", trend: "+3.2%", trendUp: true, color: "var(--primary-base)" },
    { icon: "🏠", value: "64", label: "Total Visits", trend: "+1.8%", trendUp: true, color: "var(--primary-base)" },
    { icon: "💬", value: "27", label: "In Negotiation", trend: "-0.5%", trendUp: false, color: "var(--primary-base)" },
    { icon: "📅", value: "12", label: "Total Bookings", trend: "+2.0%", trendUp: true, color: "var(--primary-base)" },
    { icon: "🏢", value: "2,340", label: "Total Units Available", trend: "+2.0%", trendUp: true, color: "var(--primary-base)" },
  ];

  // Show first 3 KPIs by default, all when expanded
  const kpiStats = showAllKPIs ? allKpiStats : allKpiStats.slice(0, 3);

  const handleUnitClick = (unitId: string, status: UnitStatus) => {
    if (status === "booked" || status === "not-sale") return;
    
    setSelectedUnits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const getUnitClassName = (unit: Unit) => {
    const baseClasses = "px-3 sm:px-4 py-2.5 sm:py-3 text-center rounded-md font-semibold text-xs sm:text-sm cursor-pointer transition-colors";
    
    if (selectedUnits.has(unit.id)) {
      return `${baseClasses} bg-[#E1F5FE] text-[#0288D1] border border-[#0288D1]`;
    }
    
    switch (unit.status) {
      case "available":
        return `${baseClasses} bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]`;
      case "booked":
        return `${baseClasses} bg-[#FFEBEE] text-[#C62828] cursor-not-allowed opacity-75`;
      case "not-sale":
        return `${baseClasses} bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed opacity-75`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Back Header - Enhanced Responsive */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6 xl:mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Project Detail</h1>
        </div>

        {/* Performance Summary - Match Dashboard Structure */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
          <div className={`grid ${
            showAllKPIs 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-3'
          } gap-3 sm:gap-4 lg:gap-5 xl:gap-6 transition-all duration-300`}>
            {kpiStats.map((stat, index) => (
              <KPICard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                trend={stat.trend}
                trendUp={stat.trendUp}
                color={stat.color}
              />
            ))}
          </div>
          {allKpiStats.length > 3 && (
            <button 
              onClick={() => setShowAllKPIs(!showAllKPIs)}
              className="w-full mt-4 sm:mt-5 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
            >
              {showAllKPIs ? "View less" : "View more"}
            </button>
          )}
        </section>

        {/* Details Grid - Enhanced Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10 mb-4 sm:mb-5 lg:mb-6 xl:mb-9">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-9">
            {/* Project Detail */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Project Detail</h2>
              <ProjectCard
                image="/Property-3 1.png"
                name="Maaz Palace"
                location="Kurla - City Center"
                configuration="2BHK - 1200 Sq meter"
                priceRange="Base Price Range - ₹3Cr - ₹3.5Cr"
                category="Residential"
                status="Ongoing"
                features={["Sea Facing", "Smart Homes", "Play Ground"]}
                variant="detail"
              />
            </section>

            {/* Unit Selection - Enhanced Responsive Grid */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4 lg:mb-5">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">Unit Selection</h2>
                <button className="text-[var(--primary-base)] border-none bg-transparent font-semibold cursor-pointer hover:underline text-xs sm:text-sm self-start sm:self-auto">
                  + Add Filter
                </button>
              </div>
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      onClick={() => handleUnitClick(unit.id, unit.status)}
                      className={getUnitClassName(unit)}
                    >
                      {unit.id}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5 mt-4 sm:mt-5 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#E8F5E9] flex-shrink-0"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#FFEBEE] flex-shrink-0"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#F1F5F9] flex-shrink-0"></div>
                    <span>Not For Sale</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#E1F5FE] border border-[#0288D1] flex-shrink-0"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities - Enhanced Responsive Grid */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {amenities.map((amenity, index) => (
                  <AmenityCard
                    key={index}
                    icon={amenity.icon}
                    name={amenity.name}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-9">
            {/* Project Overview */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Project Overview</h2>
              <div className="mb-6 sm:mb-8">
                <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-slate-200">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">🏙️</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">Area Type</p>
                    <strong className="text-sm sm:text-base text-slate-900">Urban</strong>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-slate-200">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">📜</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">RERA Number</p>
                    <strong className="text-sm sm:text-base text-slate-900 break-all">P51800052567</strong>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">📅</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">Possession Date</p>
                    <strong className="text-sm sm:text-base text-slate-900">December 2025</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* Media Gallery - Enhanced Responsive */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Media Gallery</h2>
              <div className="mb-6 sm:mb-8">
                <div className="relative w-full h-40 sm:h-48 md:h-56 lg:h-48 rounded-lg overflow-hidden mb-3 sm:mb-4">
                  <Image
                    src="/Property-3 1.png"
                    alt="Gallery main"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 mb-4 sm:mb-5">
                  {galleryImages.map((img, index) => (
                    <div key={index} className="relative w-full h-[50px] sm:h-[60px] md:h-[70px] rounded-md overflow-hidden">
                      <Image
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 10vw"
                      />
                    </div>
                  ))}
                </div>

                <p className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-slate-900">Project Videos</p>
                <div className="space-y-2">
                  <DownloadCard
                    title="▶️ Project Walkthrough"
                    duration="3:45"
                  />
                  <DownloadCard
                    title="▶️ Drone Footage"
                    duration="2:30"
                  />
                  <DownloadCard
                    title="▶️ Sample Flat Tour"
                    duration="4:20"
                  />
                </div>
              </div>
            </section>

            {/* Lead Sources */}
            <PieChart data={leadSourcesData} />
          </div>
        </div>
      </div>
    </div>
  );
}

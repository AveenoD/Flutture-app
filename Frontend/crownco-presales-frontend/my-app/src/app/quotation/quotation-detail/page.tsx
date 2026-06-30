"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Buildings,
  Tag,
  User,
  Phone,
  Envelope,
  ShieldCheck,
  Star,
  Sparkle,
  Shield,
  Pencil,
  ShareNetwork,
} from "phosphor-react";
import { PriceBreakdownCard } from "../../../components/ui/card/priceBreakdownCard";
import type { QuotationData } from "../../../components/ui/card/quotationCard";

// Sample projects data
const availableProjects = [
  {
    name: "Maaz Palace",
    image: "/Property-3 1.png",
    location: "Kurla - City Center",
    configuration: "2BHK - 1200 Sq meter",
    priceRange: "Base Price Range - ₹3Cr - ₹3.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Play Ground"],
  },
  {
    name: "Crown Height",
    image: "/property-1 1.png",
    location: "Andheri - West",
    configuration: "3BHK - 1500 Sq meter",
    priceRange: "Base Price Range - ₹4Cr - ₹4.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Gym"],
  },
  {
    name: "GreenVille Orchid",
    image: "/property-2 1.png",
    location: "Powai - Central",
    configuration: "4BHK - 2000 Sq meter",
    priceRange: "Base Price Range - ₹5Cr - ₹6Cr",
    category: "Commercial",
    status: "Ready Move",
    features: ["Garden View", "Smart Homes", "Club House"],
  },
];

// Dummy quotations data (same as main page)
const dummyQuotations: QuotationData[] = [
  {
    id: "QT-001",
    status: "approved",
    project: availableProjects[0],
    allocatedFlat: {
      wing: "A Wing",
      flatNo: "B-403",
      floor: "12th Floor",
      reraCarpetArea: "705 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 30000000, isDiscount: false },
      { label: "Parking", amount: 90000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 70000, isDiscount: false },
      { label: "Development Charges", amount: 100000, isDiscount: false },
      { label: "Water Charges", amount: 100000, isDiscount: false },
      { label: "MSEB Charges", amount: 100000, isDiscount: false },
      { label: "Legal Charges", amount: 100000, isDiscount: false },
      { label: "Stamp Duty", amount: 100000, isDiscount: false },
      { label: "Registration Fee", amount: 100000, isDiscount: false },
      { label: "GST", amount: 100000, isDiscount: false },
      { label: "VAT", amount: 100000, isDiscount: false },
      { label: "Extra Work", amount: 100000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 100000, isDiscount: false },
      { label: "Discount (Diwali Special)", amount: 7500000, isDiscount: true },
    ],
    finalPrice: 22745000,
    assignedRepresentative: {
      salesPerson: "Maaz Khan",
      contactNo: "+1 234 567 8900",
      email: "maazkhan78@gmail.com",
      channelPartner: "ABC Realty",
    },
    clientInfo: {
      customerName: "Zishan",
      contactNo: "+91 98765 43210",
      email: "Zishan45@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052567",
      possessionDate: "December 2025",
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "QT-002",
    status: "pending",
    project: availableProjects[1],
    allocatedFlat: {
      wing: "B Wing",
      flatNo: "A-205",
      floor: "5th Floor",
      reraCarpetArea: "850 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 40000000, isDiscount: false },
      { label: "Parking", amount: 120000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 90000, isDiscount: false },
      { label: "Development Charges", amount: 150000, isDiscount: false },
      { label: "Water Charges", amount: 120000, isDiscount: false },
      { label: "MSEB Charges", amount: 120000, isDiscount: false },
      { label: "Legal Charges", amount: 120000, isDiscount: false },
      { label: "Stamp Duty", amount: 150000, isDiscount: false },
      { label: "Registration Fee", amount: 120000, isDiscount: false },
      { label: "GST", amount: 150000, isDiscount: false },
      { label: "VAT", amount: 120000, isDiscount: false },
      { label: "Extra Work", amount: 100000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 150000, isDiscount: false },
      { label: "Discount (Festival Offer)", amount: 5000000, isDiscount: true },
    ],
    finalPrice: 36020000,
    assignedRepresentative: {
      salesPerson: "Rohit Sharma",
      contactNo: "+91 98765 12345",
      email: "rohit.sharma@email.com",
      channelPartner: "XYZ Properties",
    },
    clientInfo: {
      customerName: "Amit Patel",
      contactNo: "+91 98765 67890",
      email: "amit.patel@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052568",
      possessionDate: "March 2026",
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "QT-003",
    status: "draft",
    project: availableProjects[2],
    allocatedFlat: {
      wing: "C Wing",
      flatNo: "D-101",
      floor: "1st Floor",
      reraCarpetArea: "1200 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 50000000, isDiscount: false },
      { label: "Parking", amount: 150000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 120000, isDiscount: false },
      { label: "Development Charges", amount: 200000, isDiscount: false },
      { label: "Water Charges", amount: 150000, isDiscount: false },
      { label: "MSEB Charges", amount: 150000, isDiscount: false },
      { label: "Legal Charges", amount: 150000, isDiscount: false },
      { label: "Stamp Duty", amount: 200000, isDiscount: false },
      { label: "Registration Fee", amount: 150000, isDiscount: false },
      { label: "GST", amount: 200000, isDiscount: false },
      { label: "VAT", amount: 150000, isDiscount: false },
      { label: "Extra Work", amount: 200000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 200000, isDiscount: false },
      { label: "Discount (Early Bird)", amount: 8000000, isDiscount: true },
    ],
    finalPrice: 44720000,
    assignedRepresentative: {
      salesPerson: "Priya Singh",
      contactNo: "+91 98765 54321",
      email: "priya.singh@email.com",
      channelPartner: "Premium Realty",
    },
    clientInfo: {
      customerName: "Rajesh Kumar",
      contactNo: "+91 98765 11111",
      email: "rajesh.kumar@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052569",
      possessionDate: "June 2026",
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

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

function QuotationDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("id");
  const [quotation, setQuotation] = useState<QuotationData | null>(null);

  useEffect(() => {
    if (quotationId) {
      const foundQuotation = dummyQuotations.find((q) => q.id === quotationId);
      setQuotation(foundQuotation || null);
    }
  }, [quotationId]);

  const handleShare = () => {
    alert("Share functionality will be implemented soon!");
  };

  const handleEdit = () => {
    alert("Edit functionality will be implemented soon!");
  };

  if (!quotation) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Quotation Not Found</h2>
          <button
            onClick={() => router.push("/quotation")}
            className="px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6 xl:mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">
            Quotation Detail
          </h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Project Detail */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">
                Project Detail
              </h2>
              <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden mb-3">
                <Image
                  src={quotation.project.image}
                  alt={quotation.project.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2.5">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-base)]">
                  {quotation.project.name}
                </h3>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                  <span
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                      categoryColors[
                        quotation.project.category as keyof typeof categoryColors
                      ] || categoryColors.Residential
                    }`}
                  >
                    {quotation.project.category}
                  </span>
                  <span
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                      statusColors[
                        quotation.project.status as keyof typeof statusColors
                      ] || statusColors.Ongoing
                    }`}
                  >
                    {quotation.project.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mb-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} weight="regular" />
                  <span>{quotation.project.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Buildings size={16} weight="regular" />
                  <span>{quotation.project.configuration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag size={16} weight="regular" />
                  <span>{quotation.project.priceRange}</span>
                </div>
              </div>

              {quotation.project.features && quotation.project.features.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {quotation.project.features.map((feature: string, index: number) => (
                    <span
                      key={index}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Allocated Flat Info */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-2.5 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                  Allocated Flat Info
                </h2>
                <button
                  onClick={handleEdit}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={14} className="text-[var(--primary-base)]" weight="regular" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Buildings size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Wing</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.allocatedFlat.wing || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Flat No</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.allocatedFlat.flatNo || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkle size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Floor</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.allocatedFlat.floor || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">RERA Carpet Area</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.allocatedFlat.reraCarpetArea || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Price Breakdown */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <PriceBreakdownCard
                items={quotation.priceBreakdown}
                finalPrice={quotation.finalPrice}
                onEdit={handleEdit}
              />
              <button
                onClick={handleShare}
                className="w-full mt-3 py-2.5 px-4 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <ShareNetwork size={18} weight="regular" />
                Share
              </button>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Assigned Representative */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">
                Assigned Representative
              </h2>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Sales Person</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.assignedRepresentative.salesPerson || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Contact No</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.assignedRepresentative.contactNo || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">
                      {quotation.assignedRepresentative.email || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Channel Partner</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.assignedRepresentative.channelPartner || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Client Information */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-2.5 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                  Client Information
                </h2>
                <button
                  onClick={handleEdit}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={14} className="text-[var(--primary-base)]" weight="regular" />
                </button>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Customer Name</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.clientInfo.customerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Contact No</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {quotation.clientInfo.contactNo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">
                      {quotation.clientInfo.email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Snapshot */}
            {quotation.projectSnapshot && (
              <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">
                  Project Snapshot
                </h2>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Buildings size={18} weight="regular" className="text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Area Type</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {quotation.projectSnapshot.areaType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Shield size={18} weight="regular" className="text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">RERA Number</p>
                      <p className="text-sm font-semibold text-slate-900 break-all">
                        {quotation.projectSnapshot.reraNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Tag size={18} weight="regular" className="text-slate-500" />
    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Possession Date</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {quotation.projectSnapshot.possessionDate}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuotationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-base)] mx-auto mb-4" />
            <p className="text-slate-600">Loading quotation...</p>
          </div>
        </div>
      }
    >
      <QuotationDetailContent />
    </Suspense>
  );
}

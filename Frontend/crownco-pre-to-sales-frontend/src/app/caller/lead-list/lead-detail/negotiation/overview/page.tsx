"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeadProfileCard,
  RemarksSection,
  ActivityFeed,
  Tabs,
  Button,
  SkeletonLoader,
  EmptyState,
  PriceBreakdownCard,
  AmenityCard,
} from "@/components/ui";
import type { ChargeItem, PriceSummary } from "@/components/ui/cards/PriceBreakdownCard";
import type { Amenity } from "@/components/ui/cards/AmenityCard";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import {
  Home,
  Building2,
  XCircle,
  CheckCircle2,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { useLeadStore } from "@/contexts/LeadContext";

// Types for unit selection
type UnitSelection = {
  project: string;
  tower: string;
  floor: string;
  unitNo: string;
  config: string; // e.g. 2BHK
  carpetArea: number; // sq.ft
  facing: string;
};

// Mock price data
const BASE_PRICE_ITEMS: ChargeItem[] = [
  {
    id: "basic",
    label: "Basic Price (Carpet Area × Rate)",
    amount: 5_200_000,
    type: "base",
  },
  {
    id: "floor-rise",
    label: "Floor Rise Charges",
    amount: 120_000,
    type: "charge",
  },
  {
    id: "parking",
    label: "Parking Charges",
    amount: 250_000,
    type: "charge",
  },
];

const TAX_ITEMS: ChargeItem[] = [
  {
    id: "gst",
    label: "GST @ 5%",
    amount: 279_000,
    type: "tax",
  },
  {
    id: "stamp",
    label: "Stamp Duty & Registration",
    amount: 350_000,
    type: "tax",
  },
];

const DISCOUNT_ITEMS: ChargeItem[] = [
  {
    id: "festive",
    label: "Festive Discount",
    amount: -150_000,
    type: "discount",
  },
];

// Mock unit selection
const INITIAL_UNIT: UnitSelection = {
  project: "Maaz Palace",
  tower: "A",
  floor: "7th",
  unitNo: "701",
  config: "2BHK",
  carpetArea: 865,
  facing: "Garden Facing",
};

// Mock amenities
const INITIAL_AMENITIES: Amenity[] = [
  {
    id: "club",
    label: "Club House Membership",
    amount: 75_000,
    selected: true,
  },
  {
    id: "mod-kitchen",
    label: "Modular Kitchen Upgrade",
    amount: 95_000,
    selected: false,
  },
  {
    id: "wardrobe",
    label: "Wardrobes (2 Bedrooms)",
    amount: 80_000,
    selected: false,
  },
];

// Negotiation history for ActivityFeed
const NEGOTIATION_HISTORY = [
  {
    id: "1",
    type: "quotation" as const,
    title: "Initial Offer Shared",
    description: "Base price ₹58.5L shared including taxes and charges.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    badge: "Offer #1",
  },
  {
    id: "2",
    type: "general" as const,
    title: "Customer Counter Offer",
    description: "Customer requested final all-inclusive price near ₹55L.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
    badge: "Counter",
  },
  {
    id: "3",
    type: "quotation" as const,
    title: "Revised Offer Shared",
    description:
      "Revised price ₹56.9L after festive discount and waiving processing fee.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 6),
    badge: "Offer #2",
  },
];

// Remark suggestions for negotiation
const NEGOTIATION_REMARK_SUGGESTIONS = [
  "Customer is ready to book if final price is under ₹56L.",
  "Customer needs time to arrange down payment, prefers staggered payment plan.",
  "Customer comparing with competitor project nearby.",
  "Customer wants additional discount if booking done this week.",
];

// Utility to format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);


function NegotiationOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "1"; // Get from URL, default to '1' for now
  const { getLeadById } = useLeadStore();

  // State management
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [unit, setUnit] = useState<UnitSelection>(INITIAL_UNIT);
  const [amenities, setAmenities] = useState<Amenity[]>(INITIAL_AMENITIES);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [negotiationHistory, setNegotiationHistory] = useState(NEGOTIATION_HISTORY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("price");

  // Fetch lead data
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);

        const storedLead = getLeadById(leadId);
        if (!storedLead) {
          setLead(null);
          setUnit(INITIAL_UNIT);
          setAmenities(INITIAL_AMENITIES);
          setRemarks([]);
          setNegotiationHistory(NEGOTIATION_HISTORY);
          return;
        }

        const mappedLead: LeadProfile = {
          id: storedLead.id,
          name: storedLead.name,
          phone: storedLead.phone,
          email: storedLead.email,
          status: storedLead.status,
          source: storedLead.source,
          location: "—",
          budgetLabel:
            storedLead.budgetMin && storedLead.budgetMax
              ? `₹${(storedLead.budgetMin / 100000).toFixed(1)}L – ₹${(
                  storedLead.budgetMax / 100000
                ).toFixed(1)}L`
              : undefined,
          priority: storedLead.priority ?? "medium",
        };

        setLead(mappedLead);
        setUnit(INITIAL_UNIT);
        setAmenities(INITIAL_AMENITIES);
        setRemarks([]);
        setNegotiationHistory(NEGOTIATION_HISTORY);
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Failed to load lead data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, getLeadById]);

  // Build complete charge list
  const allCharges = useMemo<ChargeItem[]>(() => {
    const selectedAmenities = amenities
      .filter((a) => a.selected)
      .map<ChargeItem>((a) => ({
        id: `amenity-${a.id}`,
        label: a.label,
        amount: a.amount,
        type: "charge",
      }));
    return [...BASE_PRICE_ITEMS, ...selectedAmenities, ...TAX_ITEMS, ...DISCOUNT_ITEMS];
  }, [amenities]);

  const summary = useMemo<PriceSummary>(() => {
    const subtotal = allCharges
      .filter((i) => i.type === "base" || i.type === "charge")
      .reduce((sum, i) => sum + i.amount, 0);

    const taxes = allCharges
      .filter((i) => i.type === "tax")
      .reduce((sum, i) => sum + i.amount, 0);

    const discounts = allCharges
      .filter((i) => i.type === "discount")
      .reduce((sum, i) => sum + i.amount, 0);

    const total = subtotal + taxes + discounts;

    return { subtotal, taxes, discounts, total };
  }, [allCharges]);

  const tabs = [
    { id: "price", label: "Price Breakdown" },
    { id: "unit", label: "Unit Selection" },
    { id: "history", label: "Negotiation History" },
  ];

  const handleAmenityToggle = (id: string) => {
    setAmenities((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, selected: !a.selected } : a
      )
    );
  };

  const handleUnitChange = (field: keyof UnitSelection, value: string) => {
    setUnit((prev) => ({ ...prev, [field]: value }));
  };

  const handleBackToSiteVisit = () => {
    // Navigate back with lead ID
    router.push(`/caller/lead-list/lead-detail/site-visit/overview?leadId=${leadId}`);
  };

  const handleMoveToBooking = async () => {
    // Validation: Check if unit is selected
    if (!unit.project || !unit.unitNo) {
      toast.error("Please select a unit before moving to booking");
      return;
    }

    // Validation: Check if at least one remark exists
    if (remarks.length === 0) {
      toast.error("Please add at least one negotiation remark before moving to booking");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // TODO: API call to save negotiation and create quotation
      // const response = await fetch(`/api/leads/${leadId}/move-to-booking`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     unit,
      //     amenities: amenities.filter(a => a.selected),
      //     priceBreakdown: allCharges,
      //     finalPrice: summary.total,
      //     remarks,
      //     status: 'booking',
      //     stage: 'booking'
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to move to booking');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Price locked! Moving to Booking stage…");
      
      // Navigate to next stage with lead ID
      router.push(`/caller/lead-list/lead-detail/booking/overview?leadId=${leadId}`);
    } catch (error) {
      console.error('Error moving to booking:', error);
      toast.error("Failed to move to booking. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <SkeletonLoader type="card" height="8rem" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <SkeletonLoader type="card" height="25rem" />
            <SkeletonLoader type="card" height="15rem" />
          </div>
          <div className="space-y-4">
            <SkeletonLoader type="card" height="20rem" />
            <SkeletonLoader type="card" height="15rem" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!lead) {
    return (
      <EmptyState
        variant="no-data"
        title="Lead not found"
        description="The lead you're looking for doesn't exist or has been removed."
        action={{
          label: "Back to Lead List",
          onClick: () => router.push('/caller/lead-list')
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Lead Summary */}
      <section>
        <LeadProfileCard lead={lead} variant="detailed" />
      </section>

      {/* Main layout */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Price / Unit tabs */}
        <div className="space-y-4 sm:space-y-5">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="default"
          />

          {/* Price Breakdown */}
          {activeTab === "price" && (
            <PriceBreakdownCard
              charges={allCharges}
              summary={summary}
              title="Price Breakdown"
            />
          )}

          {/* Unit Selection */}
          {activeTab === "unit" && (
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-4 h-4 text-[var(--primary-base)]" />
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  Unit Selection
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Project
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.project}
                    onChange={(e) => handleUnitChange("project", e.target.value)}
                  >
                    <option value="Maaz Palace">Maaz Palace</option>
                    <option value="Zara Palace">Zara Palace</option>
                    <option value="Crown Heights">Crown Heights</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Tower / Wing
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.tower}
                    onChange={(e) => handleUnitChange("tower", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Floor
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.floor}
                    onChange={(e) => handleUnitChange("floor", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Unit Number
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.unitNo}
                    onChange={(e) => handleUnitChange("unitNo", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Configuration
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.config}
                    onChange={(e) => handleUnitChange("config", e.target.value)}
                  >
                    <option value="2BHK">2BHK</option>
                    <option value="2.5BHK">2.5BHK</option>
                    <option value="3BHK">3BHK</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Carpet Area (sq.ft)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.carpetArea}
                    onChange={(e) =>
                      handleUnitChange("carpetArea", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] sm:text-xs text-slate-600">
                    Facing / View
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    value={unit.facing}
                    onChange={(e) => handleUnitChange("facing", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Negotiation History tab */}
          {activeTab === "history" && (
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
              <ActivityFeed
                title="Negotiation History"
                activities={negotiationHistory}
                maxItems={10}
                showViewMore={false}
                className="bg-transparent shadow-none p-0"
              />
            </div>
          )}

          {/* Amenities Selection (always visible under tabs) */}
          <AmenityCard
            amenities={amenities}
            onToggle={handleAmenityToggle}
            title="Additional Amenities"
            description="Select add-ons to include in final pricing. Use this to handle customer-specific upgrades."
          />
        </div>

        {/* Right: Remarks + Negotiation summary */}
        <div className="space-y-4 sm:space-y-5">
          {/* Negotiation Remarks */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
            <RemarksSection
              title="Negotiation Remarks"
              initialRemarks={remarks}
              suggestions={NEGOTIATION_REMARK_SUGGESTIONS}
              onChange={setRemarks}
              className="bg-transparent border-none p-0"
            />
          </div>

          {/* Summary Card */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Negotiation Summary
            </h3>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Configuration</span>
                <span className="font-semibold">
                  {unit.config} • {unit.carpetArea} sq.ft
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Project / Unit</span>
                <span className="font-semibold">
                  {unit.project} – {unit.tower}-{unit.unitNo}, {unit.floor}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">View</span>
                <span className="font-semibold">{unit.facing}</span>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-3 mt-2 text-xs sm:text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Customer Budget</span>
                <span className="font-semibold">₹50L – ₹60L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Current Final Price</span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(summary.total)}
                </span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 pt-1">
              Lock this price by moving to Booking and creating a quotation.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Actions */}
      <section className="mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Step 4 of 5: Negotiation – finalize unit, amenities, and all-inclusive
            price before booking.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={handleBackToSiteVisit}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Back to Site Visit
            </Button>
            <Button
              variant="primary"
              onClick={handleMoveToBooking}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Lock Price & Move to Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main component with Suspense for useSearchParams
export default function NegotiationOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 sm:space-y-8">
          <SkeletonLoader type="card" height="8rem" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <SkeletonLoader type="card" height="25rem" />
              <SkeletonLoader type="card" height="15rem" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader type="card" height="20rem" />
              <SkeletonLoader type="card" height="15rem" />
            </div>
          </div>
        </div>
      }
    >
      <NegotiationOverviewContent />
    </Suspense>
  );
}
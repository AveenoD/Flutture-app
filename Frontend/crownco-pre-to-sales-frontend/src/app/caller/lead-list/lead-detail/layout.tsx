"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Stepper } from "@/components/ui/navigation/Stepper";
import { Breadcrumbs } from "@/components/ui";

export default function LeadDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname?.includes("/qualification/overview")) return "Qualification";
    if (pathname?.includes("/communication/overview")) return "Communication";
    if (pathname?.includes("/site-visit/overview")) return "Site Visit";
    if (pathname?.includes("/negotiation/overview")) return "Negotiation";
    if (pathname?.includes("/booking/overview")) return "Booking";
    return "Lead Detail";
  };

  // Determine completed stages based on current route
  // This is a simplified version - in real app, this would come from lead data
  const getCompletedStages = (): string[] => {
    const completed: string[] = [];

    // Qualification is completed when we're on any stage after it
    if (
      pathname?.includes("/communication/overview") ||
      pathname?.includes("/site-visit") ||
      pathname?.includes("/negotiation") ||
      pathname?.includes("/booking")
    ) {
      completed.push("qualification");
    }

    if (
      pathname?.includes("/site-visit") ||
      pathname?.includes("/negotiation") ||
      pathname?.includes("/booking")
    ) {
      completed.push("communication");
    }

    if (
      pathname?.includes("/negotiation") ||
      pathname?.includes("/booking")
    ) {
      completed.push("site-visit");
    }

    if (pathname?.includes("/booking")) {
      completed.push("negotiation");
    }

    return completed;
  };

  const breadcrumbs = [
    { label: "Lead List", href: "/caller/lead-list" },
    { label: getPageTitle(), isCurrent: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Breadcrumbs, Title, and Stepper */}
      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbs} />
          </div>

          <div className="w-full">
            <Suspense fallback={<div className="h-20 w-full bg-slate-100 rounded animate-pulse" />}>
              <Stepper
                completedStages={getCompletedStages() as any}
                showDescriptions={false}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Buildings, ChatCircle, House } from "phosphor-react";
import { Stepper } from "../../../components/ui/stepper";

export default function LeadListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Check if we're on a lead-detail page
  const isLeadDetailPage = pathname?.includes("/lead-detail");
  
  // Exclude follow-up-detail page from showing the layout
  const isFollowUpDetailPage = pathname?.includes("/follow-up-detail");
  
  // Check if we're on site-visit-detail page
  const isSiteVisitDetailPage = pathname?.includes("/site-visit-detail");
  
  // Determine active step based on pathname
  const getActiveStep = () => {
    if (!pathname) return 0;
    // Check in reverse order (most specific first)
    if (pathname.includes("/booking")) return 3;
    if (pathname.includes("/negotiation")) return 2;
    if (pathname.includes("/site-visit") || pathname.includes("/property-visit")) return 1;
    // Default to Summary (caller-preview) for overview/overveiw pages
    if (pathname.includes("/caller-preview") || pathname.includes("/overview") || pathname.includes("/overveiw")) return 0;
    return 0;
  };

  // Get base path (everything up to /lead-detail)
  const getBasePath = () => {
    if (!pathname) return "/sales/lead-list/lead-detail";
    const match = pathname.match(/(\/sales\/lead-list\/lead-detail)/);
    return match ? match[1] : "/sales/lead-list/lead-detail";
  };

  // Determine completed steps (steps before the active step are completed)
  const getCompletedSteps = () => {
    const active = getActiveStep();
    return Array.from({ length: active }, (_, i) => i);
  };

  // Navigation handler for step clicks
  const handleStepClick = (stepIndex: number) => {
    const basePath = getBasePath();

    // Preserve existing leadId query param if present
    const currentUrl = new URL(window.location.href);
    const leadId = currentUrl.searchParams.get("leadId");
    const leadQuery = leadId ? `?leadId=${leadId}` : "";

    switch (stepIndex) {
      case 0: // Summary
        router.push(`${basePath}/caller-preview/overview${leadQuery}`);
        break;
      case 1: // Property Visit
        router.push(`${basePath}/site-visit/overveiw${leadQuery}`);
        break;
      case 2: // Negotiation
        router.push(`${basePath}/negotiation/overveiw${leadQuery}`);
        break;
      case 3: // Booking
        router.push(`${basePath}/booking/overveiw${leadQuery}`);
        break;
      default:
        break;
    }
  };

  // Progress steps
  const steps = [
    { icon: FileText, label: "Summary" },
    { icon: Buildings, label: "Property Visit" },
    { icon: ChatCircle, label: "Negotiation" },
    { icon: House, label: "Booking" },
  ];

  return (
    <div className="w-full">
      {isLeadDetailPage && !isFollowUpDetailPage && (
        <>
          {/* Back Header */}
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748]" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-[#2D3748]">
              {isSiteVisitDetailPage ? "Site Visit Detail" : "Lead Detail"}
            </h1>
          </div>

          {/* Progress Stepper */}
          <Stepper 
            steps={steps} 
            activeStep={getActiveStep()} 
            completedSteps={getCompletedSteps()}
            onStepClick={handleStepClick}
          />
        </>
      )}
      {children}
    </div>
  );
}


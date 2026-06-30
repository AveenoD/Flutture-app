"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Buildings, ChatCircle, House } from "phosphor-react";
import { Stepper } from "../../../components/ui/stepper";

export default function LeadListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we're on a lead-detail page
  const isLeadDetailPage = pathname?.includes("/lead-detail");

  // Exclude follow-up-detail page from showing the layout
  const isFollowUpDetailPage = pathname?.includes("/follow-up-detail");

  // Check if we're on site-visit-detail page
  const isSiteVisitDetailPage = pathname?.includes("/site-visit-detail");

  // Determine active step based on pathname
  const getActiveStep = () => {
    if (!pathname) return 0;

    // Step 2: Property Visit
    if (pathname.includes("/site-visit") || pathname.includes("/property-visit")) {
      return 2;
    }

    // Step 1: Communication (caller overview)
    if (
      pathname.includes("/caller/lead-list/lead-detail/caller") ||
      pathname.includes("/caller-preview") ||
      pathname.includes("/communication")
    ) {
      return 1;
    }

    // Step 0: Qualification (default)
    return 0;
  };

  // Get base path (everything up to /lead-detail)
  const getBasePath = () => {
    if (!pathname) return "/caller/lead-list/lead-detail";
    const match = pathname.match(/(\/caller\/lead-list\/lead-detail)/);
    return match ? match[1] : "/caller/lead-list/lead-detail";
  };

  // Determine completed steps (steps before the active step are completed)
  const getCompletedSteps = () => {
    const active = getActiveStep();
    return Array.from({ length: active }, (_, i) => i);
  };

  // Navigation handler for step clicks
  const handleStepClick = (stepIndex: number) => {
    const basePath = getBasePath();
    const query = searchParams?.toString();

    const withQuery = (path: string) =>
      query && query.length > 0 ? `${path}?${query}` : path;

    switch (stepIndex) {
      case 0: // Qualification
        router.push(withQuery(`${basePath}/qualification`));
        break;
      case 1: // Communication
        router.push(withQuery(`${basePath}/caller/overview`));
        break;
      case 2: // Property Visit
        router.push(withQuery(`${basePath}/site-visit/overview`));
        break;
      default:
        break;
    }
  };

  // Progress steps
  const steps = [
    { icon: FileText, label: "Qualification" },
    { icon: ChatCircle, label: "Communication" },
    { icon: Buildings, label: "Property Visit" },
  ];

  // Persist current leadId so deep-linked pages (e.g. Property Visit) can recover it
  useEffect(() => {
    if (typeof window === "undefined") return;
    const leadId = searchParams.get("leadId");
    if (leadId) {
      window.sessionStorage.setItem("currentLeadId", leadId);
    }
  }, [searchParams]);

  return (
    <div className="w-full min-h-screen bg-[#f3f4f6]">
      {isLeadDetailPage && !isFollowUpDetailPage && (
        <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 sm:pt-6 lg:pt-8">
          {/* Back Header */}
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748]" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">
              {isSiteVisitDetailPage
                ? "Site Visit Detail"
                : pathname?.includes("/qualification")
                ? "Qualification"
                : "Lead Detail"}
            </h1>
          </div>

          {/* Progress Stepper */}
          <Stepper
            steps={steps}
            activeStep={getActiveStep()}
            completedSteps={getCompletedSteps()}
            onStepClick={handleStepClick}
          />
        </div>
      )}
      {children}
    </div>
  );
}



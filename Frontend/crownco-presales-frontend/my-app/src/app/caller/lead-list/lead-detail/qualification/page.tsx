"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { X, Plus, CaretRight } from "phosphor-react";
import { CallRecordingCard } from "../../../../../components/ui/card/callRecordingCard";
import { RemarksSection } from "../../../../../components/ui/remarksSection";
import { Drawer } from "../../../../../components/ui/drawer";
import {
  CreateLeadCardForm,
  LeadCardFormData,
} from "../../../../../components/ui/createLeadCardForm";
import { DataCard } from "../../../../../components/ui/card/dataCard";
import { apiGet, apiGetAllow404, apiPost, apiPut } from "../../../../../lib/apiClient";
import { toast } from "sonner";

const defaultFollowUpReminders = [
  {
    message:
      "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.",
    onAdd: () => {
      console.log("Add follow-up reminder");
    },
  },
  {
    message:
      "Remind client about site visit on Saturday, 2 PM. Send location map and directions.",
    onAdd: () => {
      console.log("Add follow-up reminder");
    },
  },
];

function QualificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdLead, setCreatedLead] = useState<LeadCardFormData | null>(null);
  const [initialLeadData, setInitialLeadData] = useState<LeadCardFormData | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string[]>([]);
  const [recordingData, setRecordingData] = useState<{
    timestamp: string;
    duration: string;
    currentTime: string;
    transcription: string;
  } | null>(null);

  useEffect(() => {
    const id = searchParams.get("leadId");
    if (id) {
      setLeadId(id);
    }
  }, [searchParams]);

  const autoOpen = searchParams.get("autoOpen") === "1" || searchParams.get("autoOpen") === "true";

  // When web is navigated from the "Qualify lead" popup, open the form automatically (mobile parity).
  useEffect(() => {
    if (!autoOpen) return;
    if (isReadOnly) return; // don't auto-open edit UI for handed-off leads
    if (!initialLeadData) return;
    if (isModalOpen) return;
    setIsModalOpen(true);
  }, [autoOpen, isReadOnly, initialLeadData, isModalOpen]);

  // Load lead details from backend and map to form initial data
  useEffect(() => {
    const idParam = searchParams.get("leadId");
    if (!idParam) return;

    const fetchLead = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log("[Qualification] Fetching lead by id", { idParam });

        const response = await apiGet<{
          data: {
            lead: {
              name?: string;
              phone?: string;
              city?: string;
              source?: string;
              lead_temperature?: "veryhot" | "hot" | "warm" | "cold";
              budget_min?: number | null;
              budget_max?: number | null;
              project_title?: string | null;
              status?: string | null;
              stage?: string | null;
              assigned_to_user_type?: string | null;
            };
          };
        }>(`/api/v1/leads/${idParam}`);

        const lead = response.data.lead;

        // If lead has been handed off to sales (accepted), disable edits on this screen.
        setIsReadOnly(lead.assigned_to_user_type === "sales");

        const mapSourceToLabel = (source?: string): string => {
          switch (source) {
            case "magicbricks":
              return "Magicbricks.com";
            case "housing":
              return "Housing.com";
            case "booking":
              return "Booking.com";
            case "nobroker":
              return "Nobroker.com";
            case "99acres":
              return "99acres.com";
            case "walking":
              return "Walking";
            case "website":
              return "Website";
            case "referral":
              return "Referral";
            case "imported":
              return "Bulk Data";
            default:
              return "Bulk Data";
          }
        };

        const mapTemperatureToStatus = (
          temp?: "veryhot" | "hot" | "warm" | "cold"
        ): LeadCardFormData["status"] => {
          return temp || "cold";
        };

        let estimatedBudget = "";
        if (lead.budget_min != null && lead.budget_max != null) {
          estimatedBudget = `₹${lead.budget_min}L - ₹${lead.budget_max}L`;
        } else if (lead.budget_min != null) {
          estimatedBudget = `₹${lead.budget_min}L`;
        }

        const formData: LeadCardFormData = {
          status: mapTemperatureToStatus(lead.lead_temperature),
          fullName: lead.name || "",
          phoneNumber: lead.phone || "",
          interestedProject: lead.project_title || "Crown Height",
          leadSource: mapSourceToLabel(lead.source),
          location: lead.city || "",
          estimatedBudget,
        };

        // Ab hamisha lead data aaya to card dikhaenge (status/stage kuch bhi ho)
        setInitialLeadData(formData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Qualification] Error fetching lead", err);
        const message =
          err instanceof Error ? err.message : "Failed to load lead details";
        toast.error(message);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchLead();
  }, [searchParams]);

  // Load qualification stage (calls recording + remarks) from backend.
  // 404 is normal: qualification often has no lead_stages row until we forward to communication.
  useEffect(() => {
    const id = searchParams.get("leadId");
    if (!id) return;

    const fetchStage = async () => {
      const res = await apiGetAllow404<{
        data?: {
          stage?: { id?: string; remarks?: string | null };
          recent_calls?: {
            call_started_at?: string | null;
            call_ended_at?: string | null;
            recording_duration?: number | null;
            call_outcome?: string | null;
          }[];
        };
      }>(`/api/v1/leads/${id}/stages/by-type/qualification`);

      // 404 or null = no stage row yet (normal for qualification); use empty data
      const data = res?.data ?? {};
      const stage = data.stage;
      setStageId(stage?.id ?? null);

      const remarksText = stage?.remarks || "";
      const parsedRemarks = remarksText
        ? remarksText
            .split(/\n+/)
            .map((r) => r.trim())
            .filter(Boolean)
        : [];
      setRemarks(parsedRemarks);

      const calls = data.recent_calls || [];
      if (Array.isArray(calls) && calls.length > 0) {
        const c = calls[0];
        const start = c.call_started_at ? new Date(c.call_started_at) : null;
        const timestamp = start
          ? start.toLocaleString()
          : "Recent call recording";

        const durationSeconds = c.recording_duration ?? null;
        const duration =
          durationSeconds != null
            ? `${Math.floor(durationSeconds / 60)}:${String(
                durationSeconds % 60
              ).padStart(2, "0")}`
            : "0:00";

        setRecordingData({
          timestamp,
          duration,
          currentTime: "0:00",
          transcription:
            c.call_outcome ||
            "Call recording transcription will appear here when available.",
        });
      } else {
        setRecordingData(null);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchStage();
  }, [searchParams]);

  const followUpReminder = defaultFollowUpReminders[0];

  const handleDownload = () => {
    console.log("Download recording");
  };

  const handleInputSubmit = () => {
    if (isReadOnly) {
      toast.error(
        "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales."
      );
      return;
    }
    if (inputValue.trim()) {
      console.log("Add remark:", inputValue);
      setInputValue("");
    }
  };

  const handleReject = () => {
    if (isReadOnly) {
      toast.error(
        "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales."
      );
      return;
    }
    const id = searchParams.get("leadId");
    router.push(
      id
        ? `/caller/lead-list/rejected-form?leadId=${encodeURIComponent(id)}`
        : "/caller/lead-list/rejected-form"
    );
  };

  const handleQualify = () => {
    if (isReadOnly) {
      toast.error(
        "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales."
      );
      return;
    }
    console.log("Open create lead card form");
    setIsModalOpen(true);
  };

  const handleCreateLead = async (data: LeadCardFormData) => {
    if (isReadOnly) {
      toast.error(
        "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales."
      );
      return;
    }
    if (!leadId) {
      toast.error("Missing lead id in URL");
      return;
    }

    try {
      // Map lead source label from form to backend enum
      const mapLeadSourceToEnum = (label?: string): string | undefined => {
        if (!label) return undefined;
        switch (label) {
          case "Magicbricks.com":
            return "magicbricks";
          case "Housing.com":
            return "housing";
          case "Nobroker.com":
            return "nobroker";
          case "99acres.com":
            return "99acres";
          case "Walking":
            return "walking";
          case "Website":
            return "website";
          case "Referral":
            return "referral";
          case "Bulk Data":
            return "imported";
          case "Booking.com":
            // No direct enum, treat as generic "other"
            return "other";
          default:
            return "other";
        }
      };

      // Map form data to backend update payload
      const payload: Record<string, unknown> = {
        name: data.fullName || undefined,
        phone: data.phoneNumber || undefined,
        city: data.location || undefined,
        source: mapLeadSourceToEnum(data.leadSource),
        lead_temperature: data.status,
        // Mark lead as qualified; stage transition will be handled by forward-stage API
        status: "qualified",
      };

      // Budget parsing: "₹40L - ₹50L", "40L-50L", or single "40L" -> budget_min, budget_max for PUT /leads/:id
      if (data.estimatedBudget && data.estimatedBudget.trim()) {
        const rangeMatch = data.estimatedBudget.match(/(\d+)\s*L?\s*[-–—]\s*L?\s*(\d+)\s*L?/i);
        if (rangeMatch) {
          payload.budget_min = Number(rangeMatch[1]);
          payload.budget_max = Number(rangeMatch[2]);
        } else {
          const singleMatch = data.estimatedBudget.match(/(\d+)\s*L?/i);
          if (singleMatch) {
            const value = Number(singleMatch[1]);
            payload.budget_min = value;
            payload.budget_max = value;
          }
        }
      }

      // 1) Update lead profile + mark as qualified in leads table
      await apiPut(`/api/v1/leads/${leadId}`, payload);

      // 2) Forward lead to communication stage so that lead_stages row is created
      try {
        await apiPost(`/api/v1/leads/${leadId}/forward-stage`, {
          next_stage: "communication",
        });
      } catch (forwardErr) {
        // If forward-stage fails (e.g. already in communication), log but don't block UI
        // eslint-disable-next-line no-console
        console.warn(
          "[Qualification] forward-stage to communication failed (may already be in communication)",
          forwardErr
        );
      }

      setCreatedLead(data);
      setIsModalOpen(false);
      toast.success("Lead qualified successfully");

      // After successful update, navigate to next stage (Caller Overview)
      const nextStagePath = `/caller/lead-list/lead-detail/caller/overview${
        leadId ? `?leadId=${encodeURIComponent(leadId)}` : ""
      }`;
      router.push(nextStagePath);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to qualify lead";
      toast.error(message);
    }
  };

  // Generate avatar URL from name (using local avatar images)
  const getAvatarUrl = (name: string) => {
    // Use local avatar images from public folder
    const avatarImages = [
      "/Avatar_images.png",
      "/Avatar_images (1).png",
      "/Avatar_images (2).png",
      "/Avatar_images (3).png",
      "/Avatar_images (4).png",
    ];
    // Pick an avatar based on name hash for consistency
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarImages[hash % avatarImages.length];
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8">
          {/* Left/Central Section - Create Lead Card */}
          <div>
            {createdLead || initialLeadData ? (
              // Show DataCard when lead data is available (created just now or loaded from backend)
              (() => {
                const displayLead = createdLead || initialLeadData!;
                return (
              <div className="bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748]">
                        Lead Card
                  </h2>
                </div>
                <DataCard
                  id={1}
                      name={displayLead.fullName}
                      phone={displayLead.phoneNumber}
                      avatar={getAvatarUrl(displayLead.fullName)}
                      budget={displayLead.estimatedBudget}
                      propertyName={displayLead.interestedProject}
                  timeAgo="Just now"
                      location={displayLead.location}
                      status={displayLead.status}
                      source={displayLead.leadSource}
                />
                {/* Bottom Action Buttons */}
                <div className="border-t border-[#E3E6F0] pt-4 sm:pt-5 lg:pt-6 mt-4 sm:mt-5 lg:mt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={handleReject}
                      disabled={isReadOnly}
                      className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-white border-2 border-red-500 text-red-500 rounded-lg font-semibold text-sm sm:text-base hover:bg-red-50 transition-colors"
                    >
                      <X size={20} weight="bold" className="sm:w-5 sm:h-5" />
                      <span>Rejected</span>
                    </button>
                    <button
                      onClick={handleQualify}
                      disabled={isReadOnly}
                      className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      <span>Qualified</span>
                      <CaretRight size={20} weight="bold" className="sm:w-5 sm:h-5" />
                      <CaretRight size={20} weight="bold" className="sm:w-5 sm:h-5 -ml-3" />
                    </button>
                  </div>
                </div>
                  </div>
                );
              })()
            ) : (
              // Show empty state when no lead is created
              <div className="bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                {/* Create Lead Card Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748]">
                    Create Lead Card
                  </h2>
                </div>

                {/* Illustration */}
                <div className="flex flex-col items-center justify-center py-8 sm:py-10 lg:py-12">
                  <div className="relative w-full max-w-[304px] h-auto mb-4 sm:mb-6">
                    <Image
                      src="/cuate.svg"
                      alt="Lead card illustration"
                      width={304}
                      height={279}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg text-[#718096] text-center mb-6 sm:mb-8">
                    No lead card created yet.
                  </p>
                </div>

                {/* Bottom Action Buttons */}
                <div className="border-t border-[#E3E6F0] pt-4 sm:pt-5 lg:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={handleReject}
                      disabled={isReadOnly}
                      className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-white border-2 border-red-500 text-red-500 rounded-lg font-semibold text-sm sm:text-base hover:bg-red-50 transition-colors"
                    >
                      <X size={20} weight="bold" className="sm:w-5 sm:h-5" />
                      <span>Rejected</span>
                    </button>
                    <button
                      onClick={handleQualify}
                      disabled={isReadOnly}
                      className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      <span>Qualified</span>
                      <CaretRight size={20} weight="bold" className="sm:w-5 sm:h-5" />
                      <CaretRight size={20} weight="bold" className="sm:w-5 sm:h-5 -ml-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section - Calls Recording and Remarks */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Calls Recording Card */}
            {recordingData ? (
              <CallRecordingCard
                recording={recordingData}
                onDownload={handleDownload}
                showTitle={true}
              />
            ) : (
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748] mb-4 sm:mb-5 lg:mb-6">
                  Calls Recording
                </h2>
                <div className="bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm text-sm text-[#718096]">
                  No call recordings available for this lead.
                </div>
              </div>
            )}

            {/* Remarks Section */}
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748] mb-4 sm:mb-5 lg:mb-6">
                Remarks
              </h2>
              <RemarksSection
                remarks={remarks}
                followUpReminder={followUpReminder}
                showInput={!isReadOnly}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onInputSubmit={handleInputSubmit}
                inputPlaceholder="Add a new remark..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Lead Card Drawer */}
      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={createdLead || initialLeadData ? "Edit Lead Card" : "Create Lead Card"}
      >
        <CreateLeadCardForm
          initialData={createdLead || initialLeadData || undefined}
          onSubmit={handleCreateLead}
          onCancel={() => setIsModalOpen(false)}
          showFooter={true}
        />
      </Drawer>
    </div>
  );
}

export default function Qualification() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">Loading...</div>}>
      <QualificationContent />
    </Suspense>
  );
}

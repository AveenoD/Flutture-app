"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Link as LinkIcon, Camera, Microphone, PaperPlaneTilt, Check, CaretDown, CaretUp } from "phosphor-react";
import { apiFetch } from "../../../../lib/apiClient";
import { toast } from "sonner";

interface FormSection {
  id: string;
  question: string;
  options: string[];
}

const formSections: FormSection[] = [
  {
    id: "budget",
    question: "Was the customer budget not matching the project?",
    options: ["Budget too low", "Looking for cheaper options", "EMI not affordable", "Loan not approved"],
  },
  {
    id: "location",
    question: "Is the customer looking in a different location?",
    options: ["Too far from workplace", "Prefers different city/area", "Bad connectivity", "Not a suitable neighborhood"],
  },
  {
    id: "satisfaction",
    question: "Was the customer not satisfied with the project?",
    options: ["Didn't like layout", "Missing key amenities", "Bad builder reviews", "Not value for money"],
  },
  {
    id: "booking",
    question: "Has the customer already booked or dropped the plan?",
    options: ["Booked elsewhere", "Postponed decision", "Not interested anymore", "Personal reasons"],
  },
];

interface SentComment {
  id: string;
  text: string;
  timestamp: Date;
}

type RejectionQuestion = {
  id: string;
  question_text: string;
  options: string[];
  category: string;
};

export default function RejectedFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sendButtonStates, setSendButtonStates] = useState<Record<string, boolean>>({});
  const [sentStates, setSentStates] = useState<Record<string, boolean>>({});
  const [sentComments, setSentComments] = useState<Record<string, SentComment[]>>({});
  const [rejectionQuestions, setRejectionQuestions] = useState<RejectionQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [formSections[0]?.id]: true, // First section expanded by default
  });

  const questionsByCategory = useMemo(() => {
    const map: Record<string, RejectionQuestion> = {};
    for (const q of rejectionQuestions) {
      if (!map[q.category]) map[q.category] = q;
    }
    return map;
  }, [rejectionQuestions]);

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      setIsLoadingQuestions(true);
      try {
        const res = await apiFetch<any>("/api/v1/rejection-questions");
        const list: RejectionQuestion[] = res.data?.questions ?? [];
        setRejectionQuestions(list);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[RejectedForm] Failed to load rejection questions", err);
        setRejectionQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    void run();
  }, [leadId]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isSectionComplete = (sectionId: string) => {
    return !!selectedOptions[sectionId] || (sentComments[sectionId] && sentComments[sectionId].length > 0);
  };

  const completedCount = formSections.filter((section) => isSectionComplete(section.id)).length;
  const totalSections = formSections.length;

  const handleOptionClick = (sectionId: string, option: string) => {
    const isDeselecting = selectedOptions[sectionId] === option;
    
    setSelectedOptions((prev) => ({
      ...prev,
      [sectionId]: isDeselecting ? "" : option,
    }));

    // Auto-collapse section after selection (if not deselecting)
    if (!isDeselecting) {
      setTimeout(() => {
        setExpandedSections((prev) => ({
          ...prev,
          [sectionId]: false,
        }));
      }, 300); // Small delay for better UX
    }
  };

  const handleInputChange = (sectionId: string, value: string) => {
    setComments((prev) => ({
      ...prev,
      [sectionId]: value,
    }));
    setSendButtonStates((prev) => ({
      ...prev,
      [sectionId]: value.trim().length > 0,
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, sectionId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendComment(sectionId);
    }
  };

  const handleSendComment = (sectionId: string) => {
    const comment = comments[sectionId]?.trim();
    if (comment) {
      // Add comment to sent comments list
      const newComment: SentComment = {
        id: `${sectionId}-${Date.now()}`,
        text: comment,
        timestamp: new Date(),
      };
      
      setSentComments((prev) => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), newComment],
      }));
      
      // Clear the input field
      setComments((prev) => ({
        ...prev,
        [sectionId]: "",
      }));
      setSendButtonStates((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
      
      console.log(`Comment for ${sectionId}:`, comment);
      // Here you can add API call to save the comment
      
      // Show feedback with checkmark
      setSentStates((prev) => ({
        ...prev,
        [sectionId]: true,
      }));
      
      setTimeout(() => {
        setSentStates((prev) => ({
          ...prev,
          [sectionId]: false,
        }));
      }, 1000);

      // Auto-collapse section after sending comment
      setTimeout(() => {
        setExpandedSections((prev) => ({
          ...prev,
          [sectionId]: false,
        }));
      }, 500); // Collapse after showing checkmark feedback
    }
  };

  const handleSaveForm = () => {
    if (!leadId) {
      toast.error("Lead ID missing. Please go back and try again.");
      return;
    }

    const questionsResponse = formSections.flatMap((section) => {
      const answer = selectedOptions[section.id];
      if (!answer) return [];
      const q =
        questionsByCategory[section.id] ??
        rejectionQuestions.find((qq) => qq.options.includes(answer)) ??
        null;
      if (!q) return [];
      return [{ question_id: q.id, answer }];
    });

    if (questionsResponse.length === 0) {
      toast.error("Please select at least one reason before saving.");
      return;
    }

    void (async () => {
      try {
        setIsRejecting(true);
        await apiFetch(`/api/v1/leads/${encodeURIComponent(leadId)}/reject`, {
          method: "POST",
          body: { questions_response: questionsResponse },
        });

        toast.success("Lead rejected successfully");
        router.push("/sales/lead-list");
      } catch (err: any) {
        const msg = err?.message || "Failed to reject lead. Please try again.";
        toast.error(msg);
      } finally {
        setIsRejecting(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Back Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push("/sales/lead-list")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm flex-shrink-0"
              aria-label="Go back to lead list"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Rejection Form</h1>
          </div>
          {/* Progress Indicator */}
          <div className="text-xs sm:text-sm text-[#718096] whitespace-nowrap">
            <span className="font-semibold text-[#0084FF]">{completedCount}</span> / {totalSections} Completed
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 sm:mb-5 lg:mb-6">
          <div className="h-2 sm:h-2.5 bg-[#E3E6F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0084FF] transition-all duration-300 rounded-full"
              style={{ width: `${(completedCount / totalSections) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-3 sm:space-y-4">
          {formSections.map((section, index) => {
            const isExpanded = expandedSections[section.id];
            const isComplete = isSectionComplete(section.id);
            
            return (
              <div
                key={section.id}
                className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${
                  isComplete
                    ? "border-[#10B981] bg-[#F0FDF4]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Section Header - Clickable */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 sm:p-5 lg:p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-xl"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Section Number Badge */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 ${
                        isComplete
                          ? "bg-[#10B981] text-white"
                          : "bg-[#E3E6F0] text-[#718096]"
                      }`}
                    >
                      {isComplete ? <Check size={14} weight="bold" className="sm:w-4 sm:h-4" /> : index + 1}
                    </div>
                    
                    {/* Question Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-[#2D3748] flex items-center gap-1 break-words">
                        <span className="text-[#AF4B4B] flex-shrink-0">*</span>
                        <span className="break-words">{section.question}</span>
                      </p>
                      {isComplete && (
                        <p className="text-xs text-[#10B981] mt-1 font-medium">Completed</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Icon */}
                  <div className="ml-2 sm:ml-4 flex-shrink-0">
                    {isExpanded ? (
                      <CaretUp size={18} className="text-[#718096] sm:w-5 sm:h-5" />
                    ) : (
                      <CaretDown size={18} className="text-[#718096] sm:w-5 sm:h-5" />
                    )}
                  </div>
                </button>

                {/* Section Content - Collapsible */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 pt-0 border-t border-[#E3E6F0] animate-in slide-in-from-top-2 duration-200">
                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 mt-4 sm:mt-5">
                      {section.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleOptionClick(section.id, option)}
                          className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-[30px] text-xs sm:text-sm text-center transition-all whitespace-normal break-words ${
                            selectedOptions[section.id] === option
                              ? "bg-[#EBF5FF] border border-[#0084FF] text-[#0084FF] font-medium"
                              : "bg-white border border-[#E3E6F0] text-[#718096] hover:border-[#0084FF] hover:text-[#0084FF]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {/* Input Group */}
                    <div className="relative bg-[#F9FAFB] border border-[#E3E6F0] rounded-[30px] flex items-center px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="text-lg sm:text-xl mr-2 sm:mr-3 cursor-pointer flex-shrink-0">😊</span>
                      <input
                        type="text"
                        placeholder="Type Here"
                        value={comments[section.id] || ""}
                        onChange={(e) => handleInputChange(section.id, e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, section.id)}
                        className="flex-1 min-w-0 border-none bg-transparent py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base outline-none text-[#2D3748] placeholder:text-[#718096]"
                      />
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-[#718096] flex-shrink-0">
                        <LinkIcon size={16} className="cursor-pointer sm:w-[18px] sm:h-[18px]" />
                        <Camera size={16} className="cursor-pointer sm:w-[18px] sm:h-[18px]" />
                      </div>
                      {sendButtonStates[section.id] ? (
                        <button
                          onClick={() => handleSendComment(section.id)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ml-2 sm:ml-2.5 cursor-pointer transition-all flex-shrink-0 ${
                            sentStates[section.id]
                              ? "bg-[#10B981]"
                              : "bg-[#10B981] hover:bg-[#059669] hover:scale-105 active:scale-95"
                          }`}
                          aria-label="Send comment"
                        >
                          {sentStates[section.id] ? (
                            <Check size={14} weight="bold" className="text-white sm:w-4 sm:h-4" />
                          ) : (
                            <PaperPlaneTilt size={14} weight="bold" className="text-white sm:w-4 sm:h-4" />
                          )}
                        </button>
                      ) : (
                        <button 
                          className="w-8 h-8 sm:w-9 sm:h-9 bg-[#0084FF] text-white rounded-full flex items-center justify-center ml-2 sm:ml-2.5 cursor-pointer transition-all hover:bg-[#006fc0] active:scale-95 flex-shrink-0"
                          aria-label="Voice input"
                        >
                          <Microphone size={14} weight="fill" className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sent Comments Display */}
                    {sentComments[section.id] && sentComments[section.id].length > 0 && (
                      <div className="mt-4 space-y-2">
                        {sentComments[section.id].map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-[#F9FAFB] border border-[#E3E6F0] rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#2D3748] break-words"
                          >
                            {comment.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveForm}
          disabled={isRejecting}
          className={`w-full bg-[#0084FF] text-white border-none py-3 sm:py-4 lg:py-4 rounded-lg text-sm sm:text-base lg:text-lg font-semibold cursor-pointer mt-4 sm:mt-6 mb-4 sm:mb-8 lg:mb-12 transition-all hover:opacity-90 hover:bg-[#006fc0] active:scale-[0.98] shadow-sm hover:shadow-md ${
            isRejecting ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isRejecting ? "Rejecting..." : "Save Form"}
        </button>
      </div>
    </div>
  );
}

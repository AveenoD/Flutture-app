"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Link as LinkIcon,
  Camera,
  Microphone,
  PaperPlaneTilt,
  Check,
  CaretDown,
  CaretUp,
} from "phosphor-react";
import { apiFetch, apiGet } from "../../../../lib/apiClient";

interface FormSection {
  id: string;
  question: string;
  options: string[];
}

interface RejectionQuestion {
  id: string;
  question_text: string;
  options: string[];
  category: string;
}

interface SentComment {
  id: string;
  text: string;
  timestamp: Date;
}

export default function RejectedFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  const [formSections, setFormSections] = useState<FormSection[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    {}
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sendButtonStates, setSendButtonStates] = useState<
    Record<string, boolean>
  >({});
  const [sentStates, setSentStates] = useState<Record<string, boolean>>({});
  const [sentComments, setSentComments] = useState<
    Record<string, SentComment[]>
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    // will be initialized after questions load
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        setError(null);

        const res = await apiGet<{
          data?: { questions?: RejectionQuestion[] };
        }>(`/api/v1/rejection-questions`);

        const list = res.data?.questions || [];
        const mapped: FormSection[] = list.map((q) => ({
          id: q.id,
          question: q.question_text,
          options: q.options || [],
        }));
        setFormSections(mapped);

        // expand first section by default
        if (mapped.length > 0) {
          setExpandedSections({ [mapped[0]!.id]: true });
        } else {
          setExpandedSections({});
        }
      } catch (e) {
        console.error("[RejectedForm] Failed to load rejection questions", e);
        setError("Failed to load rejection questions.");
        setFormSections([]);
        setExpandedSections({});
      } finally {
        setLoadingQuestions(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchQuestions();
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isSectionComplete = (sectionId: string) => {
    return (
      !!selectedOptions[sectionId] ||
      (sentComments[sectionId] && sentComments[sectionId].length > 0)
    );
  };

  const completedCount = formSections.filter((section) =>
    isSectionComplete(section.id)
  ).length;
  const totalSections = formSections.length;

  const hasSelections = useMemo(
    () => Object.values(selectedOptions).some((value) => value && value !== ""),
    [selectedOptions]
  );

  const handleOptionClick = (sectionId: string, option: string) => {
    const isDeselecting = selectedOptions[sectionId] === option;

    setSelectedOptions((prev) => ({
      ...prev,
      [sectionId]: isDeselecting ? "" : option,
    }));

    if (!isDeselecting) {
      setTimeout(() => {
        setExpandedSections((prev) => ({
          ...prev,
          [sectionId]: false,
        }));
      }, 300);
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

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    sectionId: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendComment(sectionId);
    }
  };

  const handleSendComment = (sectionId: string) => {
    const comment = comments[sectionId]?.trim();
    if (comment) {
      const newComment: SentComment = {
        id: `${sectionId}-${Date.now()}`,
        text: comment,
        timestamp: new Date(),
      };

      setSentComments((prev) => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), newComment],
      }));

      setComments((prev) => ({
        ...prev,
        [sectionId]: "",
      }));
      setSendButtonStates((prev) => ({
        ...prev,
        [sectionId]: false,
      }));

      console.log(`Comment for ${sectionId}:`, comment);

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

      setTimeout(() => {
        setExpandedSections((prev) => ({
          ...prev,
          [sectionId]: false,
        }));
      }, 500);
    }
  };

  const handleSaveForm = () => {
    if (!leadId) {
      alert("Missing leadId in URL.");
      return;
    }
    if (!hasSelections) {
      alert("Please select at least one reason before saving.");
      return;
    }
    if (submitLoading) return;

    const questions_response = Object.entries(selectedOptions)
      .filter(([, answer]) => answer && answer.trim().length > 0)
      .map(([question_id, answer]) => ({ question_id, answer }));

    // Optional: add free-form notes as ai_summary
    const allCommentText = Object.values(sentComments)
      .flat()
      .map((c) => c.text)
      .filter(Boolean)
      .join("\n");

    const body: {
      questions_response: { question_id: string; answer: string }[];
      ai_summary?: string;
    } = {
      questions_response,
      ...(allCommentText ? { ai_summary: allCommentText } : {}),
    };

    const submit = async () => {
      try {
        setSubmitLoading(true);
        setError(null);
        await apiFetch(`/api/v1/leads/${leadId}/reject`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.push("/caller/lead-list");
      } catch (e) {
        console.error("[RejectedForm] Failed to reject lead", e);
        setError(e instanceof Error ? e.message : "Failed to reject lead.");
        alert(e instanceof Error ? e.message : "Failed to reject lead.");
      } finally {
        setSubmitLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    submit();
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Back Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                if (leadId) {
                  router.back();
                } else {
                  router.push("/caller/lead-list");
                }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm flex-shrink-0"
              aria-label="Go back to lead list"
            >
              <ArrowLeft
                size={18}
                weight="regular"
                className="text-[#2D3748] sm:w-5 sm:h-5"
              />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">
              Rejection Form
            </h1>
          </div>
          {/* Progress Indicator */}
          <div className="text-xs sm:text-sm text-[#718096] whitespace-nowrap">
            <span className="font-semibold text-[#0084FF]">
              {completedCount}
            </span>{" "}
            / {totalSections} Completed
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
          {loadingQuestions && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
              Loading rejection questions...
            </div>
          )}
          {!loadingQuestions && error && (
            <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-600">
              {error}
            </div>
          )}
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
                      {isComplete ? (
                        <Check
                          size={14}
                          weight="bold"
                          className="sm:w-4 sm:h-4"
                        />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Question Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-[#2D3748] flex items-center gap-1 break-words">
                        <span className="text-[#AF4B4B] flex-shrink-0">*</span>
                        <span className="break-words">
                          {section.question}
                        </span>
                      </p>
                      {isComplete && (
                        <p className="text-xs text-[#10B981] mt-1 font-medium">
                          Completed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="ml-2 sm:ml-4 flex-shrink-0">
                    {isExpanded ? (
                      <CaretUp
                        size={18}
                        className="text-[#718096] sm:w-5 sm:h-5"
                      />
                    ) : (
                      <CaretDown
                        size={18}
                        className="text-[#718096] sm:w-5 sm:h-5"
                      />
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
                          onClick={() =>
                            handleOptionClick(section.id, option)
                          }
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
                      <span className="text-lg sm:text-xl mr-2 sm:mr-3 cursor-pointer flex-shrink-0">
                        😊
                      </span>
                      <input
                        type="text"
                        placeholder="Type Here"
                        value={comments[section.id] || ""}
                        onChange={(e) =>
                          handleInputChange(section.id, e.target.value)
                        }
                        onKeyPress={(e) => handleKeyPress(e, section.id)}
                        className="flex-1 min-w-0 border-none bg-transparent py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base outline-none text-[#2D3748] placeholder:text-[#718096]"
                      />
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-[#718096] flex-shrink-0">
                        <LinkIcon
                          size={16}
                          className="cursor-pointer sm:w-[18px] sm:h-[18px]"
                        />
                        <Camera
                          size={16}
                          className="cursor-pointer sm:w-[18px] sm:h-[18px]"
                        />
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
                            <Check
                              size={14}
                              weight="bold"
                              className="text-white sm:w-4 sm:h-4"
                            />
                          ) : (
                            <PaperPlaneTilt
                              size={14}
                              weight="bold"
                              className="text-white sm:w-4 sm:h-4"
                            />
                          )}
                        </button>
                      ) : (
                        <button
                          className="w-8 h-8 sm:w-9 sm:h-9 bg-[#0084FF] text-white rounded-full flex items-center justify-center ml-2 sm:ml-2.5 cursor-pointer transition-all hover:bg-[#006fc0] active:scale-95 flex-shrink-0"
                          aria-label="Voice input"
                        >
                          <Microphone
                            size={14}
                            weight="fill"
                            className="sm:w-4 sm:h-4"
                          />
                        </button>
                      )}
                    </div>

                    {/* Sent Comments Display */}
                    {sentComments[section.id] &&
                      sentComments[section.id].length > 0 && (
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
          className="w-full bg-[#0084FF] text-white border-none py-3 sm:py-4 lg:py-4 rounded-lg text-sm sm:text-base lg:text-lg font-semibold cursor-pointer mt-4 sm:mt-6 mb-4 sm:mb-8 lg:mb-12 transition-all hover:opacity-90 hover:bg-[#006fc0] active:scale-[0.98] shadow-sm hover:shadow-md"
        >
          Save Form
        </button>
      </div>
    </div>
  );
}

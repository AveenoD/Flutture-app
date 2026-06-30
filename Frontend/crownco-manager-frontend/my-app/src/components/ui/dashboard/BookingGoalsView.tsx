"use client";

import React, { useState } from "react";
import { Plus, ChevronDown, ArrowLeft, Sparkles, X, MapPin, Users, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";
import { EmptyState } from "@/components/ui/emptyState";
import { Target } from "lucide-react";

interface Badge {
  text: string;
  color: string;
}

type BookingGoal = {
  title: string;
  image: string;
  location: string;
  team: string;
  period: string;
  badges: Array<{ text: string; color: string }>;
  target?: string;
  status?: string;
};

interface FormField {
  label: string;
  type: "number" | "date" | "select";
  value?: string;
  options?: string[];
  helper: string;
  required?: boolean;
}

interface BookingGoalsViewProps {
  isLoading?: boolean;
  goals?: BookingGoal[];
  onSubmit?: (data: any) => void;
}

const defaultGoals: BookingGoal[] = [
  {
    title: "Maaz Palace",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400",
    location: "Kurla - City Center",
    team: "Team - West Zone",
    period: "Period - 1 Jul - 31 Jul 2024",
    badges: [
      { text: "Slow Progress", color: "bg-red-100 text-red-800" },
      { text: "Reassign Team", color: "bg-purple-100 text-purple-800" },
      { text: "Less Calls", color: "bg-orange-100 text-orange-800" },
    ],
  },
  {
    title: "Downtown Palace",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
    location: "Kurla - City Center",
    team: "Team - West Zone",
    period: "Period - 1 Jul - 31 Jul 2024",
    badges: [
      { text: "Slow Progress", color: "bg-red-100 text-red-800" },
      { text: "Reassign Team", color: "bg-purple-100 text-purple-800" },
      { text: "Less Calls", color: "bg-orange-100 text-orange-800" },
    ],
  },
];

export default function BookingGoalsView({
  isLoading = false,
  goals = defaultGoals,
  onSubmit,
}: BookingGoalsViewProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterValues, setFilterValues] = useState({
    month: "July",
    project: "All Projects",
    team: "Team A",
    region: "North",
  });
  const [formData, setFormData] = useState({
    bookingTarget: "50",
    startDate: "2025-07-01",
    endDate: "2025-07-31",
    project: "All Projects",
    team: "North East Team",
    region: "North East",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const projectOptions = [
    "All Projects",
    "Ocean Park Residences",
    "Greenville District",
    "Miana Avenue",
    "Skyline Heights",
    "Emerald Bay",
    "Maaz Palace",
    "Downtown Palace",
  ];

  const teamOptions = [
    "Team A",
    "Team B",
    "Team C",
    "Team - West Zone",
    "Team - East Zone",
    "Team - North Zone",
    "Team - South Zone",
  ];

  const regionOptions = [
    "North",
    "South",
    "East",
    "West",
    "Central",
  ];

  // Detailed Project Card Component (inline - merged from ProjectCard detailed variant)
  function DetailedProjectCard({
    title,
    image,
    location,
    team,
    period,
    badges = [],
    target = "Target-50",
    status = "Ongoing",
    onViewDetails,
  }: {
    title: string;
    image: string;
    location?: string;
    team?: string;
    period?: string;
    badges?: Badge[];
    target?: string;
    status?: string;
    onViewDetails?: () => void;
  }) {
    return (
      <div
        className="border border-[var(--border-color)] rounded bg-[var(--background)] shadow-sm w-full h-full flex flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <img
          src={image}
          alt={title}
          className="w-full h-[190px] object-cover rounded-t flex-shrink-0"
          suppressHydrationWarning
        />
        <div className="py-4 px-3 flex flex-col flex-1 gap-5 min-h-0" suppressHydrationWarning>
          <div className="flex justify-between items-center gap-2 flex-nowrap">
            <h4 className="text-base font-semibold text-[var(--primary-base)] m-0 truncate flex-1 min-w-0 whitespace-nowrap">
              {title}
            </h4>
            <div className="flex gap-1.5 flex-shrink-0">
              {target && (
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[var(--primary-base)] text-white whitespace-nowrap">
                  {target}
                </span>
              )}
              {status && (
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[var(--warning)] text-white whitespace-nowrap">
                  {status}
                </span>
              )}
            </div>
          </div>
          {(location || team || period) && (
            <div className="flex flex-col gap-2">
              {location && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <MapPin size={14} />
                  <span>{location}</span>
                </div>
              )}
              {team && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <Users size={14} />
                  <span>{team}</span>
                </div>
              )}
              {period && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <Calendar size={14} />
                  <span>{period}</span>
                </div>
              )}
            </div>
          )}
          {badges.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${badge.color}`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="w-full px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors mt-auto"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    );
  }

  const getFieldKey = (label: string): keyof typeof formData => {
    if (label.includes("Booking Target")) return "bookingTarget";
    if (label.includes("Start Date")) return "startDate";
    if (label.includes("End Date")) return "endDate";
    if (label.includes("Project")) return "project";
    if (label.includes("Team")) return "team";
    if (label.includes("Region")) return "region";
    return "bookingTarget";
  };

  const fields: FormField[] = [
    {
      label: "Booking Target",
      type: "number",
      value: formData.bookingTarget,
      helper: "Enter how many bookings you want to achieve in this time period.",
      required: true,
    },
    {
      label: "Start Date",
      type: "date",
      value: formData.startDate,
      helper: "The goal's start date. Planning starts from this day.",
      required: true,
    },
    {
      label: "End Date",
      type: "date",
      value: formData.endDate,
      helper: "Deadline to complete this booking target.",
      required: true,
    },
    {
      label: "Project",
      type: "select",
      options: ["All Projects"],
      helper: 'Select a specific project or "All Projects" to set a broad goal.',
    },
    {
      label: "Assign Team (optional)",
      type: "select",
      options: ["North East Team"],
      helper: "Not sure? Leave this empty — AI will assign the best-fit team based on past performance.",
    },
    {
      label: "Region (optional)",
      type: "select",
      options: ["North East"],
      helper: "Optional. Leave blank if unsure — AI will analyze top-performing regions automatically.",
    },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bookingTarget || parseInt(formData.bookingTarget) <= 0) {
      newErrors.bookingTarget = "Booking target must be greater than 0";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit?.(formData);
      setShowCreateForm(false);
      // Reset form
      setFormData({
        bookingTarget: "50",
        startDate: "2025-07-01",
        endDate: "2025-07-31",
        project: "All Projects",
        team: "North East Team",
        region: "North East",
      });
      setErrors({});
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Render Create Form
  if (showCreateForm) {
    return (
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 mb-6 shadow-sm">
        <form onSubmit={handleFormSubmit}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold mb-1 text-[var(--text-dark)]">
                    Create New Goal
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Set monthly booking targets and get smart action plans
                  </p>
                </div>
                {/* Close button for mobile */}
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="sm:hidden p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={20} className="text-[var(--text-primary)]" />
                </button>
              </div>
            </div>
            {/* Back button for desktop */}
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back To Dashboard
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fields.map((field, idx) => (
              <div key={idx} className="form-group">
                <label
                  htmlFor={`field-${idx}`}
                  className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block"
                >
                  {field.label}
                  {field.required && <span className="text-[var(--error)] ml-1">*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    id={`field-${idx}`}
                    className={`w-full px-2.5 py-2.5 border rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent ${
                      errors[getFieldKey(field.label)]
                        ? "border-[var(--error)]"
                        : "border-[var(--border-color)]"
                    }`}
                    value={formData[getFieldKey(field.label)] || ""}
                    onChange={(e) => handleFormChange(getFieldKey(field.label), e.target.value)}
                    aria-invalid={!!errors[getFieldKey(field.label)]}
                    aria-describedby={
                      errors[getFieldKey(field.label)] ? `error-${idx}` : `helper-${idx}`
                    }
                  >
                    {field.options?.map((opt, i) => (
                      <option key={i}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`field-${idx}`}
                    type={field.type}
                    value={field.value || ""}
                    onChange={(e) => handleFormChange(getFieldKey(field.label), e.target.value)}
                    className={`w-full px-2.5 py-2.5 border rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent ${
                      errors[getFieldKey(field.label)]
                        ? "border-[var(--error)]"
                        : "border-[var(--border-color)]"
                    }`}
                    aria-invalid={!!errors[getFieldKey(field.label)]}
                    aria-describedby={
                      errors[getFieldKey(field.label)] ? `error-${idx}` : `helper-${idx}`
                    }
                    required={field.required}
                  />
                )}
                {errors[getFieldKey(field.label)] && (
                  <p id={`error-${idx}`} className="text-xs text-[var(--error)] mt-1" role="alert">
                    {errors[getFieldKey(field.label)]}
                  </p>
                )}
                <p
                  id={`helper-${idx}`}
                  className={`text-xs mt-1 leading-snug ${
                    errors[getFieldKey(field.label)]
                      ? "text-[var(--error)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {field.helper}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
              aria-label="Create goal with AI"
            >
              <Sparkles size={18} aria-hidden="true" />
              Create Goal With AI
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-2.5 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render Goals View
  return (
    <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 mb-6 shadow-sm">
      {/* Header with Create New Goal Button */}
      <div className="flex flex-row justify-between items-start gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-[var(--text-dark)]">
            AI Booking Goal
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage and track your team's booking targets.
          </p>
        </div>
        {/* Create New Goal Button - Desktop/Tablet */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 flex-shrink-0 whitespace-nowrap"
          aria-label="Create new goal with AI"
        >
          <Plus size={18} strokeWidth={2.5} className="text-white" aria-hidden="true" />
          Create New Goal
        </button>
        {/* Mobile: Circular blue button with plus sign */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex sm:hidden items-center justify-center bg-[var(--primary-base)] text-white rounded-full w-12 h-12 hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 flex-shrink-0"
          aria-label="Create new goal with AI"
        >
          <Plus size={24} strokeWidth={2.5} className="text-white" aria-hidden="true" />
        </button>
      </div>
      {/* Filters - Full Width Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Month Filter */}
        <div className="w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
            Month
          </label>
          <div className="relative">
            <select
              value={filterValues.month}
              onChange={(e) => setFilterValues({ ...filterValues, month: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-[var(--border-color)] rounded-md text-sm text-[var(--text-dark)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 transition-colors hover:border-[var(--primary-base)]"
              aria-label="Filter by month"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" 
              aria-hidden="true" 
            />
          </div>
        </div>

        {/* Project Filter */}
        <div className="w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
            Project
          </label>
          <div className="relative">
            <select
              value={filterValues.project}
              onChange={(e) => setFilterValues({ ...filterValues, project: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-[var(--border-color)] rounded-md text-sm text-[var(--text-dark)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 transition-colors hover:border-[var(--primary-base)]"
              aria-label="Filter by project"
            >
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" 
              aria-hidden="true" 
            />
          </div>
        </div>

        {/* Team Filter */}
        <div className="w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
            Team
          </label>
          <div className="relative">
            <select
              value={filterValues.team}
              onChange={(e) => setFilterValues({ ...filterValues, team: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-[var(--border-color)] rounded-md text-sm text-[var(--text-dark)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 transition-colors hover:border-[var(--primary-base)]"
              aria-label="Filter by team"
            >
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" 
              aria-hidden="true" 
            />
          </div>
        </div>

        {/* Region Filter */}
        <div className="w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
            Region
          </label>
          <div className="relative">
            <select
              value={filterValues.region}
              onChange={(e) => setFilterValues({ ...filterValues, region: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-[var(--border-color)] rounded-md text-sm text-[var(--text-dark)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 transition-colors hover:border-[var(--primary-base)]"
              aria-label="Filter by region"
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" 
              aria-hidden="true" 
            />
          </div>
        </div>
      </div>
      {/* Booking Goal Cards */}
      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No booking goals"
          description="Create your first booking goal to get started with AI-powered planning."
          actionLabel="Create New Goal"
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <>
          {/* Mobile: Horizontal scrollable */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 sm:hidden mb-6">
            {goals.map((goal, idx) => (
              <div key={idx} className="flex-shrink-0 w-[280px]">
                <DetailedProjectCard
                  title={goal.title}
                  image={goal.image}
                  location={goal.location}
                  team={goal.team}
                  period={goal.period}
                  badges={goal.badges}
                  target={goal.target || "Target-50"}
                  status={goal.status || "Ongoing"}
                  onViewDetails={() => router.push("/dashboard/ai-goal-detail")}
                />
              </div>
            ))}
          </div>
          {/* Tablet/Web: Grid layout */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {goals.map((goal, idx) => (
              <DetailedProjectCard
                key={idx}
                title={goal.title}
                image={goal.image}
                location={goal.location}
                team={goal.team}
                period={goal.period}
                badges={goal.badges}
                target={goal.target || "Target-50"}
                status={goal.status || "Ongoing"}
                onViewDetails={() => router.push("/dashboard/ai-goal-detail")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

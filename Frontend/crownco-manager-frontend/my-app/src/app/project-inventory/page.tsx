"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FunnelSimple,
  MapPin,
  Buildings,
  CurrencyInr,
  Tag,
  Plus,
  X,
  Calendar,
  UploadSimple,
} from "phosphor-react";
import KPICard from "@/components/ui/kpiCard";
import { Filter, type FilterConfig, type FilterValues } from "@/components/ui/fillter";
import {
  listProjects,
  type ProjectResponse as ApiProject,
  createProject,
} from "@/lib/projectsApi";

type ProjectStatus = "Upcoming" | "Ongoing" | "Completed" | "On Hold";
type ProjectType = "Residential" | "Commercial" | "Mixed Use" | "Plot";

type Project = ApiProject & {
  project_type: ProjectType;
  project_status: ProjectStatus;
};

interface FiltersState {
  status: ProjectStatus | "All";
  type: ProjectType | "All";
  city: "All" | string;
  priceBand: "All" | "Below50L" | "50LTo1Cr" | "Above1Cr";
}

const formatCurrencyShort = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const crore = 10000000;
  const lakh = 100000;

  if (value >= crore) {
    return `₹${(value / crore).toFixed(1)}Cr`;
  }
  if (value >= lakh) {
    return `₹${(value / lakh).toFixed(1)}L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
};

const getStatusBadgeClasses = (status: ProjectStatus) => {
  if (status === "Ongoing") {
    return "bg-[#ECFDF3] text-[#027A48]";
  }
  if (status === "Upcoming") {
    return "bg-[#FFFAEB] text-[#B54708]";
  }
  if (status === "Completed") {
    return "bg-[#EFF8FF] text-[#175CD3]";
  }
  return "bg-[#F2F4F7] text-[#344054]";
};

const getTypeBadgeClasses = (type: ProjectType) => {
  if (type === "Residential") {
    return "bg-[#EEF4FF] text-[#3538CD]";
  }
  if (type === "Commercial") {
    return "bg-[#F9F5FF] text-[#6941C6]";
  }
  if (type === "Mixed Use") {
    return "bg-[#FDF2FA] text-[#C11574]";
  }
  return "bg-[#FFF4ED] text-[#C4320A]";
};

interface MediaUploaderProps {
  title: string;
  buttonLabel: string;
  helper: string;
  accept: string;
  maxFiles?: number;
}

function MediaUploader({
  title,
  buttonLabel,
  accept,
  maxFiles = 10,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const next = [...files, ...incoming].slice(0, maxFiles);
    setFiles(next);
  };

  const removeAtIndex = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImage = accept.startsWith("image");

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--text-primary)]">
        {title}{" "}
        <span className="text-[10px] font-normal text-[var(--text-secondary)]">
          (Max {maxFiles})
        </span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {files.map((file, index) => {
          const previewUrl = URL.createObjectURL(file);
          return (
            <div
              key={index}
              className="relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-black/5"
            >
              {isImage ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-20 object-cover"
                />
              ) : (
                <div className="w-full h-20 flex flex-col items-center justify-center text-[var(--text-secondary)] text-[10px] gap-1 bg-[var(--hover-bg)]">
                  <UploadSimple size={18} className="text-[var(--primary-base)]" />
                  <span className="px-2 text-center line-clamp-2">{file.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-[#16a34a] text-white text-[10px] text-center py-0.5">
                Uploaded
              </div>
              <button
                type="button"
                onClick={() => removeAtIndex(index)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F04438] text-[10px] text-white flex items-center justify-center shadow-sm"
              >
                ×
              </button>
            </div>
          );
        })}

        {files.length < maxFiles && (
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-color)] rounded-lg h-20 cursor-pointer hover:border-[var(--primary-base)] hover:bg-[var(--hover-bg)]/60">
            <UploadSimple size={18} className="text-[var(--primary-base)]" />
            <span className="text-[10px] font-medium text-[var(--text-primary)]">
              {buttonLabel}
            </span>
            <input
              type="file"
              accept={accept}
              multiple={maxFiles > 1}
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
        {files.length} uploaded, 0 pending upload
      </p>
    </div>
  );
}

export default function ProjectInventoryPage() {
  const [filters, setFilters] = useState<FiltersState>({
    status: "All",
    type: "All",
    city: "All",
    priceBand: "All",
  });
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listProjects({
          status: filters.status === "All" ? undefined : filters.status.toLowerCase(),
          type: filters.type === "All" ? undefined : filters.type.toLowerCase().replace(" ", "_"),
          city: filters.city === "All" ? undefined : filters.city,
        });

        const mapped: Project[] = data.projects.map((p) => ({
          ...p,
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          project_exterior_images_urls: p.project_exterior_images_urls ?? [],
          project_interior_images_urls: p.project_interior_images_urls ?? [],
          project_exterior_videos_urls: p.project_exterior_videos_urls ?? [],
          project_drone_videos_urls: p.project_drone_videos_urls ?? [],
          project_interior_videos_urls: p.project_interior_videos_urls ?? [],
          project_type: (p.project_type || "Residential") as ProjectType,
          project_status: ((p.project_status as string) === "under_construction"
            ? "Ongoing"
            : (p.project_status as string) === "planning_stage"
            ? "Upcoming"
            : (p.project_status as string) === "ready_to_move"
            ? "Completed"
            : "Ongoing") as ProjectStatus,
        }));

        setProjects(mapped);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [filters.status, filters.type, filters.city, reloadToken]);
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filters.status !== "All" && project.project_status !== filters.status) {
        return false;
      }
      if (filters.type !== "All" && project.project_type !== filters.type) {
        return false;
      }
      if (filters.city !== "All" && project.city !== filters.city) {
        return false;
      }
      if (filters.priceBand !== "All") {
        const minPrice = project.minimum_unit_price ?? 0;
        if (filters.priceBand === "Below50L" && minPrice >= 5000000) {
          return false;
        }
        if (
          filters.priceBand === "50LTo1Cr" &&
          (minPrice < 5000000 || minPrice > 10000000)
        ) {
          return false;
        }
        if (filters.priceBand === "Above1Cr" && minPrice <= 10000000) {
          return false;
        }
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = project.project_title
          .toLowerCase()
          .includes(query);
        const city = (project.city ?? "").toLowerCase();
        const matchesCity = city.includes(query);
        const matchesAmenities = (project.amenities ?? []).some((a) =>
          a.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesCity && !matchesAmenities) {
          return false;
        }
      }

      return true;
    });
  }, [projects, filters, search]);

  const totalProjects = projects.length;
  const ongoingProjects = projects.filter(
    (p) => p.project_status === "Ongoing"
  ).length;
  const completedProjects = projects.filter(
    (p) => p.project_status === "Completed"
  ).length;
  const upcomingProjects = projects.filter(
    (p) => p.project_status === "Upcoming"
  ).length;
  const totalInventoryValue = projects.reduce((acc, p) => {
    if (p.minimum_unit_price) {
      return acc + p.minimum_unit_price;
    }
    return acc;
  }, 0);

  const uniqueCities = Array.from(
    new Set(
      projects
        .map((p) => (p.city ?? "").toString())
        .filter((c) => c && c.trim().length > 0)
    )
  );

  const resetFilters = () => {
    setFilters({
      status: "All",
      type: "All",
      city: "All",
      priceBand: "All",
    });
    setSearch("");
  };

  const projectFilterConfig: FilterConfig = useMemo(
    () => ({
      status: [
        { value: "", label: "Status" },
        { value: "Ongoing", label: "Ongoing" },
        { value: "Upcoming", label: "Upcoming" },
        { value: "Completed", label: "Completed" },
        { value: "On Hold", label: "On Hold" },
      ],
      sources: [
        { value: "", label: "Project Type" },
        { value: "Residential", label: "Residential" },
        { value: "Commercial", label: "Commercial" },
        { value: "Mixed Use", label: "Mixed Use" },
        { value: "Plot", label: "Plot" },
      ],
      budget: [
        { value: "", label: "By Budget" },
        { value: "Below50L", label: "Below 50L" },
        { value: "50LTo1Cr", label: "50L - 1Cr" },
        { value: "Above1Cr", label: "Above 1Cr" },
      ],
      project: [
        { value: "", label: "Location" },
        ...uniqueCities.map((city) => ({ value: city, label: city })),
      ],
    }),
    [uniqueCities]
  );

  const handleFilterChange = (values: FilterValues) => {
    setFilters({
      status: (values.status || "All") as FiltersState["status"],
      type: (values.sources || "All") as FiltersState["type"],
      city: (values.project || "All") as FiltersState["city"],
      priceBand: (values.budget || "All") as FiltersState["priceBand"],
    });
    if (values.project) {
      setSearch("");
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 bg-[var(--surface-neutral)] min-h-full">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-dark)]">
                Project Inventory
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Track all your residential and commercial projects with live
                inventory and pricing.
              </p>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)]"
            >
              <Plus size={18} weight="bold" />
              Add Project
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <KPICard
              icon={<Buildings size={18} weight="fill" className="text-[#7F56D9]" />}
              trend="+3 new"
              trendUp
              value={totalProjects.toString()}
              label="Total Projects"
            />
            <KPICard
              icon={<Calendar size={18} weight="fill" className="text-[#12B76A]" />}
              trend="+1 this month"
              trendUp
              value={ongoingProjects.toString()}
              label="Ongoing"
            />
            <KPICard
              icon={<Calendar size={18} weight="fill" className="text-[#F79009]" />}
              trend="+2 launches"
              trendUp
              value={upcomingProjects.toString()}
              label="Upcoming"
            />
            <KPICard
              icon={<Calendar size={18} weight="fill" className="text-[#175CD3]" />}
              trend="+1 handover"
              trendUp
              value={completedProjects.toString()}
              label="Completed"
            />
            <KPICard
              icon={<CurrencyInr size={18} weight="fill" className="text-[#067647]" />}
              trend="+12.4%"
              trendUp
              value={formatCurrencyShort(totalInventoryValue)}
              label="Min Price Inventory"
            />
          </div>

          <div className="bg-[var(--background)] p-4 sm:p-5 rounded-xl border border-[var(--border-color)] mb-4">
            <Filter
              config={projectFilterConfig}
              values={{
                newLeads: true,
                status: filters.status === "All" ? "" : filters.status,
                sources: filters.type === "All" ? "" : filters.type,
                budget: filters.priceBand === "All" ? "" : filters.priceBand,
                project: filters.city === "All" ? "" : filters.city,
              }}
              onChange={handleFilterChange}
              onClear={resetFilters}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by project, city or amenity"
              itemCount={filteredProjects.length}
              itemLabel="Project"
            />
          </div>

          {error && (
            <div className="mb-4 text-xs sm:text-sm text-[var(--error)] bg-[#FEF3F2] border border-[#FEE4E2] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {isLoading && projects.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-64 bg-[var(--background)] border border-[var(--border-color)] rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/project-inventory/project-detail?projectId=${project.id}`}
                className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={project.project_cover_photo_url || "/placeholder-project.jpg"}
                    alt={project.project_title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/90 text-[var(--text-dark)]`}
                    >
                      {project.project_type}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${getStatusBadgeClasses(
                        project.project_status
                      )}`}
                    >
                      {project.project_status}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-[var(--text-dark)] mb-1">
                        {project.project_title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                        <MapPin size={14} weight="fill" className="text-[#F79009]" />
                        <span>
                          {project.full_address || project.city},{" "}
                          {project.state}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium hidden sm:inline-flex ${getTypeBadgeClasses(
                        project.project_type
                      )}`}
                    >
                      {project.project_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-[var(--text-primary)]">
                    <div className="flex items-center gap-1.5">
                      <Buildings size={16} className="text-[#4F46E5]" />
                      <span>
                        {project.smallest_unit_size && project.biggest_unit_size
                          ? `${project.smallest_unit_size} - ${project.biggest_unit_size} Sq ft`
                          : "Unit sizes coming soon"}
                      </span>
                    </div>
                    {project.project_area_size && (
                      <div className="flex items-center gap-1.5">
                        <Tag size={16} className="text-[#12B76A]" />
                        <span>{project.project_area_size} acres</span>
                      </div>
                    )}
                    {project.project_floor_count && (
                      <div className="flex items-center gap-1.5">
                        <Buildings size={16} className="text-[#7F56D9]" />
                        <span>{project.project_floor_count} Floors</span>
                      </div>
                    )}
                  </div>

                  <div className="border border-dashed border-[var(--border-color)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mb-0.5">
                        Base Price Range
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-[var(--text-dark)]">
                        {formatCurrencyShort(project.minimum_unit_price ?? undefined)}{" "}
                        -{" "}
                        {formatCurrencyShort(project.maximum_unit_price ?? undefined)}
                      </p>
                    </div>
                    {project.expected_possession_date && (
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                        <Calendar size={16} className="text-[#F79009]" />
                        <span>
                          Possession{" "}
                          {new Date(
                            project.expected_possession_date
                          ).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {project.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium bg-[#F9F5FF] text-[#6941C6]"
                      >
                        {amenity}
                      </span>
                    ))}
                    {project.amenities.length > 4 && (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium bg-[#EFF8FF] text-[#175CD3]">
                        +{project.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {filteredProjects.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-10 text-center text-[var(--text-secondary)] text-sm">
                <p className="font-medium mb-1">No projects match the filters</p>
                <p className="text-xs">
                  Try adjusting your filters or clearing all to see every project.
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDrawerOpen(false);
            }
          }}
        >
          <div className="w-full sm:max-w-[480px] md:max-w-[560px] xl:max-w-[50vw] bg-white h-full shadow-xl flex flex-col animate-slideInRight">
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text-dark)]">
                  Add New Project
                </h2>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                  Capture key details as per the `projects` table.
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </header>

            <form
              ref={formRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5"
              onSubmit={(e) => e.preventDefault()}
            >
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Basic Details
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Project Title
                    </label>
                    <input
                      type="text"
                      name="project_title"
                      placeholder="Maaz Palace"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Project Type
                      </label>
                      <select
                        name="project_type"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                        defaultValue="residential"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="educational">Educational</option>
                        <option value="government">Government</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Project Status
                      </label>
                      <select
                        name="project_status"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                        defaultValue=""
                      >
                        <option value="">Select status</option>
                        <option value="planning_stage">Planning stage</option>
                        <option value="under_construction">Under construction</option>
                        <option value="ready_to_move">Ready to move</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Area Type
                      </label>
                      <select
                        name="area_type"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                        defaultValue="urban"
                      >
                        <option value="urban">Urban</option>
                        <option value="rural">Rural</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        RERA Number
                      </label>
                      <input
                        type="text"
                        name="rera_number"
                        placeholder="e.g. P518000XXXX"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Project State
                      </label>
                      <select
                        name="project_state"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                        defaultValue="new"
                      >
                        <option value="new">New</option>
                        <option value="old">Old</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Location
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Full Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Kurla - City Center, near metro station..."
                      name="full_address"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="Kurla"
                        name="city"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="Maharashtra"
                        name="state"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Pincode
                      </label>
                      <input
                        type="text"
                        placeholder="400070"
                        name="pincode"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Country
                      </label>
                      <input
                        type="text"
                        defaultValue="India"
                        name="country"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-primary)]">
                        Coordinates
                      </label>
                      <input
                        type="text"
                        placeholder="19.0760, 72.8777"
                        name="coordinates"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Inventory & Pricing
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Project Area Size (acres)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2.5"
                      name="project_area_size"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Number of Floors
                    </label>
                    <input
                      type="number"
                      placeholder="24"
                      name="project_floor_count"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Smallest Unit Size (Sq ft)
                    </label>
                    <input
                      type="number"
                      placeholder="750"
                      name="smallest_unit_size"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Largest Unit Size (Sq ft)
                    </label>
                    <input
                      type="number"
                      placeholder="1200"
                      name="biggest_unit_size"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Minimum Unit Price
                    </label>
                    <input
                      type="number"
                      placeholder="9500000"
                      name="minimum_unit_price"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Maximum Unit Price
                    </label>
                    <input
                      type="number"
                      placeholder="14500000"
                      name="maximum_unit_price"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Timeline
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Expected Possession Date
                    </label>
                    <input
                      type="date"
                      name="expected_possession_date"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Media & Amenities
                </h3>
                <div className="space-y-4">
                  <MediaUploader
                    title="Cover Photo"
                    buttonLabel="Select Cover"
                    helper="Primary hero image for the project. Recommended 1200×800px JPG/PNG."
                    accept="image/*"
                    maxFiles={1}
                  />

                  <MediaUploader
                    title="Exterior Photos"
                    buttonLabel="Select Photos"
                    helper="Multiple exterior building shots, entrance, podium, amenities."
                    accept="image/*"
                    maxFiles={10}
                  />

                  <MediaUploader
                    title="Interior Photos"
                    buttonLabel="Select Photos"
                    helper="Sample flat, lobby, reception, corridors."
                    accept="image/*"
                    maxFiles={10}
                  />

                  <MediaUploader
                    title="Exterior Videos"
                    buttonLabel="Select Videos"
                    helper="Walk-throughs, tower fly-throughs, podium tour."
                    accept="video/*"
                    maxFiles={5}
                  />

                  <MediaUploader
                    title="Drone Videos"
                    buttonLabel="Select Videos"
                    helper="Aerial views showing location & surroundings."
                    accept="video/*"
                    maxFiles={5}
                  />

                  <MediaUploader
                    title="Interior Videos"
                    buttonLabel="Select Videos"
                    helper="Sample flat walkthroughs, lobby and clubhouse."
                    accept="video/*"
                    maxFiles={5}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Amenities
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={amenitiesInput}
                        onChange={(event) => setAmenitiesInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && amenitiesInput.trim()) {
                            event.preventDefault();
                            if (!amenitiesList.includes(amenitiesInput.trim())) {
                              setAmenitiesList((prev) => [...prev, amenitiesInput.trim()]);
                            }
                            setAmenitiesInput("");
                          }
                        }}
                        placeholder="Sea Facing, Smart Homes..."
                        className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!amenitiesInput.trim()) return;
                          if (!amenitiesList.includes(amenitiesInput.trim())) {
                            setAmenitiesList((prev) => [...prev, amenitiesInput.trim()]);
                          }
                          setAmenitiesInput("");
                        }}
                        className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                    {amenitiesList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {amenitiesList.map((amenity) => (
                          <span
                            key={amenity}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium bg-[#EFF8FF] text-[#175CD3]"
                          >
                            {amenity}
                            <button
                              type="button"
                              onClick={() =>
                                setAmenitiesList((prev) =>
                                  prev.filter((item) => item !== amenity)
                                )
                              }
                              className="text-[var(--text-secondary)] hover:text-[var(--error)]"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </form>

            <footer className="px-4 sm:px-6 py-3 border-t border-[var(--border-color)] bg-white flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full sm:w-auto px-4 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm font-semibold hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!formRef.current || isSavingProject) return;

                  const formData = new FormData(formRef.current);
                  const get = (name: string) =>
                    (formData.get(name)?.toString().trim() ?? "") || undefined;

                  const numberFrom = (name: string): number | undefined => {
                    const v = get(name);
                    if (!v) return undefined;
                    const n = Number(v);
                    return Number.isNaN(n) ? undefined : n;
                  };

                  const payload: Parameters<typeof createProject>[0] = {
                    project_title: get("project_title") ?? "",
                    project_type: (get("project_type") ?? "residential") as string,
                    area_type: get("area_type"),
                    rera_number: get("rera_number"),
                    project_status: get("project_status"),
                    project_state: get("project_state"),
                    start_date: get("start_date"),
                    expected_possession_date: get("expected_possession_date"),
                    project_floor_count: numberFrom("project_floor_count"),
                    full_address: get("full_address"),
                    city: get("city"),
                    pincode: get("pincode"),
                    state: get("state"),
                    country: get("country"),
                    coordinates: get("coordinates"),
                    amenities: amenitiesList,
                    minimum_unit_price: numberFrom("minimum_unit_price"),
                    maximum_unit_price: numberFrom("maximum_unit_price"),
                    project_area_size: numberFrom("project_area_size"),
                    smallest_unit_size: numberFrom("smallest_unit_size"),
                    biggest_unit_size: numberFrom("biggest_unit_size"),
                    project_cover_photo_url: undefined,
                    project_exterior_images_urls: [],
                    project_interior_images_urls: [],
                    project_exterior_videos_urls: [],
                    project_drone_videos_urls: [],
                    project_interior_videos_urls: [],
                  };

                  try {
                    setIsSavingProject(true);
                    await createProject(payload);
                    setIsDrawerOpen(false);
                    setAmenitiesList([]);
                    setReloadToken((prev) => prev + 1);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setIsSavingProject(false);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSavingProject}
              >
                {isSavingProject ? "Saving..." : "Save Project"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
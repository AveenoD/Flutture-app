"use client";

import { useEffect, useState } from "react";
import { X, Buildings, MapPin, LinkSimple, Calendar, Clock } from "phosphor-react";
import { apiGet } from "../../lib/apiClient";

interface CreateVisitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVisit?: (visitData: {
    projectId?: string;
    location: string;
    locationUrl: string;
    date: string;
    time: string;
  }) => void;
}

interface ProjectListResponse {
  success: boolean;
  message: string;
  data: {
    projects: {
      id: string;
      project_title: string;
      city?: string | null;
    }[];
  };
}

export function CreateVisitDrawer({ isOpen, onClose, onCreateVisit }: CreateVisitDrawerProps) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    projectId: "" as string | undefined,
    location: "",
    locationUrl: "",
    date: "",
    time: "",
  });

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Load projects for dropdown when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchProjects = async () => {
      try {
        const res = await apiGet<ProjectListResponse>("/api/v1/projects?page=1&limit=50");
        const list = res.data?.projects || [];
        setProjects(list.map((p) => ({ id: p.id, name: p.project_title })));
        if (list.length > 0) {
          setFormData((prev) => ({ ...prev, projectId: list[0].id }));
        }
      } catch (err) {
        console.error("[CreateVisitDrawer] Failed to load projects", err);
      }
    };

    fetchProjects();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--sidebar-border-color)]">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
            Create Visit Card
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-[var(--sidebar-bg-hover)] transition-colors text-[var(--sidebar-text-main)]"
            aria-label="Close"
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto h-[calc(100vh-80px)]">
          <div className="space-y-4 sm:space-y-6">
            {/* Interested Project */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Interested Project
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <Buildings size={20} weight="regular" />
                </div>
                <select
                  value={formData.projectId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value || undefined })
                  }
                  className="w-full pl-11 pr-10 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] appearance-none cursor-pointer"
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)] pointer-events-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Location (City or Area) */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Location (City or Area)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <MapPin size={20} weight="regular" />
                </div>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Pembroke Pines"
                  className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                />
              </div>
            </div>

            {/* Location (URL) */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Location (URL)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <MapPin size={20} weight="regular" />
                </div>
                <input
                  type="url"
                  value={formData.locationUrl}
                  onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                  placeholder="Pembroke Pines"
                  className="w-full pl-11 pr-11 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <LinkSimple size={20} weight="regular" />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Date
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <Calendar size={20} weight="regular" />
                </div>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Time
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <Clock size={20} weight="regular" />
                </div>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t border-[var(--sidebar-border-color)] bg-white flex gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-[var(--sidebar-border-color)] rounded-lg font-semibold text-[var(--sidebar-text-main)] hover:bg-[var(--sidebar-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCreateVisit?.({
                projectId: formData.projectId,
                location: formData.location,
                locationUrl: formData.locationUrl,
                date: formData.date,
                time: formData.time,
              });
              onClose();
              // Reset form
              setFormData({
                projectId: formData.projectId,
                location: "Pembroke Pines",
                locationUrl: "Pembroke Pines",
                date: "2025-08-24",
                time: "14:30",
              });
            }}
            className="flex-1 py-3 px-4 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Create Visit
          </button>
        </div>
      </div>
    </>
  );
}




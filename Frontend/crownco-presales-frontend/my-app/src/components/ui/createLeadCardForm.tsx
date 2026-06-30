"use client";

import { useState, useEffect } from "react";
import { User, Phone, Buildings, Globe, MapPin, CurrencyCircleDollar, CaretDown } from "phosphor-react";

export interface LeadCardFormData {
  status: "cold" | "warm" | "hot" | "veryhot";
  fullName: string;
  phoneNumber: string;
  interestedProject: string;
  leadSource: string;
  location: string;
  estimatedBudget: string;
}

interface CreateLeadCardFormProps {
  initialData?: Partial<LeadCardFormData>;
  onSubmit: (data: LeadCardFormData) => void;
  onCancel: () => void;
  showFooter?: boolean;
}

const projects = ["Crown Height", "Urban Nest", "GreenVille Orchid", "Maaz Palace", "Skyline Towers"];
const leadSources = ["Bulk Data", "Magicbricks.com", "Housing.com", "Booking.com", "Nobroker.com", "99acres.com", "Assigned By Maaz", "Walking", "Website", "Referral"];

export function CreateLeadCardForm({ initialData, onSubmit, onCancel, showFooter = true }: CreateLeadCardFormProps) {
  const [formData, setFormData] = useState<LeadCardFormData>({
    status: initialData?.status || ("cold" as const),
    fullName: initialData?.fullName || "",
    phoneNumber: initialData?.phoneNumber || "",
    interestedProject: initialData?.interestedProject || "Crown Height",
    leadSource: initialData?.leadSource || "Bulk Data",
    location: initialData?.location || "",
    estimatedBudget: initialData?.estimatedBudget || "",
  });
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        status: initialData.status || ("cold" as const),
        fullName: initialData.fullName || "",
        phoneNumber: initialData.phoneNumber || "",
        interestedProject: initialData.interestedProject || "Crown Height",
        leadSource: initialData.leadSource || "Bulk Data",
        location: initialData.location || "",
        estimatedBudget: initialData.estimatedBudget || "",
      });
    }
  }, [initialData]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-3">Status</label>
        <div className="flex flex-wrap gap-2">
          {(["cold", "warm", "hot", "veryhot"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFormData({ ...formData, status })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.status === status
                  ? "bg-[var(--primary-base)] text-white"
                  : "bg-[#F9FAFB] text-[#667085] hover:bg-[#F2F4F7]"
              }`}
            >
              {status === "veryhot" ? "Very Hot" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Full Name</label>
        <div className="relative">
          <User size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054]"
            placeholder="Enter full name"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Phone Number</label>
        <div className="relative">
          <Phone size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054]"
            placeholder="Enter phone number"
          />
        </div>
      </div>

      {/* Interested Project */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Interested Project</label>
        <div className="relative">
          <Buildings size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] z-10" />
          <button
            type="button"
            onClick={() => {
              setShowProjectDropdown(!showProjectDropdown);
              setShowSourceDropdown(false);
            }}
            className="w-full pl-10 pr-10 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054] text-left bg-white flex items-center justify-between"
          >
            <span>{formData.interestedProject}</span>
            <CaretDown size={16} weight="regular" className="text-[#667085]" />
          </button>
          {showProjectDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProjectDropdown(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#D0D5DD] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project}
                    type="button"
                    onClick={() => {
                                setFormData({ ...formData, interestedProject: project });
                      setShowProjectDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#344054] hover:bg-[#F9FAFB] first:rounded-t-lg last:rounded-b-lg"
                  >
                    {project}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lead Source */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Lead Source</label>
        <div className="relative">
          <Globe size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] z-10" />
          <button
            type="button"
            onClick={() => {
              setShowSourceDropdown(!showSourceDropdown);
              setShowProjectDropdown(false);
            }}
            className="w-full pl-10 pr-10 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054] text-left bg-white flex items-center justify-between"
          >
            <span>{formData.leadSource}</span>
            <CaretDown size={16} weight="regular" className="text-[#667085]" />
          </button>
          {showSourceDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSourceDropdown(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#D0D5DD] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {leadSources.map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => {
                                setFormData({ ...formData, leadSource: source });
                      setShowSourceDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#344054] hover:bg-[#F9FAFB] first:rounded-t-lg last:rounded-b-lg"
                  >
                    {source}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Location (City or Area)</label>
        <div className="relative">
          <MapPin size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054]"
            placeholder="Enter location"
          />
        </div>
      </div>

      {/* Estimated Budget */}
      <div>
        <label className="block text-sm font-medium text-[#344054] mb-2">Estimated Budget</label>
        <div className="relative">
          <CurrencyCircleDollar size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            value={formData.estimatedBudget}
            onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent text-sm text-[#344054]"
            placeholder="Enter budget range"
          />
        </div>
      </div>

      {/* Footer Buttons */}
      {showFooter && (
        <div className="px-0 pt-4 pb-0 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-[#D0D5DD] rounded-lg text-sm font-medium text-[#344054] hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            {initialData ? "Update Lead" : "Create Lead"}
          </button>
        </div>
      )}
    </div>
  );
}


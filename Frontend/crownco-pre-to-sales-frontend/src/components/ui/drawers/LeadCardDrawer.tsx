"use client";

import React, { useState } from "react";
import { Drawer } from "@/components/ui/drawers/Drawer";
import { Button } from "@/components/ui/Button";

type LeadFormValues = {
  name: string;
  phone: string;
  email: string;
  source: string;
  budgetMin?: number;
  budgetMax?: number;
};

type LeadCardDrawerProps = {
  open: boolean;
  onClose: () => void;
  initialValues?: Partial<LeadFormValues>;
  onSubmit?: (values: LeadFormValues) => void;
};

export function LeadCardDrawer({
  open,
  onClose,
  initialValues = {},
  onSubmit,
}: LeadCardDrawerProps) {
  const [form, setForm] = useState<LeadFormValues>({
    name: initialValues.name || "",
    phone: initialValues.phone || "",
    email: initialValues.email || "",
    source: initialValues.source || "",
    budgetMin: initialValues.budgetMin,
    budgetMax: initialValues.budgetMax,
  });

  const handleChange = (field: keyof LeadFormValues, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(form);
    onClose();
  };

  return (
    <Drawer title="Create Lead Card" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
          />
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Source
          </label>
          <input
            type="text"
            value={form.source}
            onChange={(e) => handleChange("source", e.target.value)}
            placeholder="Website, Walking, Referral..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
          />
        </div>

        {/* Budget */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Budget Min (₹)
            </label>
            <input
              type="number"
              value={form.budgetMin ?? ""}
              onChange={(e) =>
                handleChange(
                  "budgetMin",
                  e.target.value === "" ? undefined : e.target.valueAsNumber
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Budget Max (₹)
            </label>
            <input
              type="number"
              value={form.budgetMax ?? ""}
              onChange={(e) =>
                handleChange(
                  "budgetMax",
                  e.target.value === "" ? undefined : e.target.valueAsNumber
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Lead
          </Button>
        </div>
      </form>
    </Drawer>
  );
}



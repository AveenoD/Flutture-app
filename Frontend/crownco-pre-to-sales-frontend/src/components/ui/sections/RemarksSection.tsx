"use client";

import React, { useState } from "react";
import { GenericList } from "@/components/ui/lists/GenericList";
import { Button } from "@/components/ui/Button";

export type Remark = {
  id: string;
  text: string;
  createdAt: string;
};

type RemarksSectionProps = {
  title?: string;
  initialRemarks?: Remark[];
  suggestions?: string[];
  onChange?: (remarks: Remark[]) => void;
  className?: string;
};

export function RemarksSection({
  title = "Remarks & Notes",
  initialRemarks = [],
  suggestions = [],
  onChange,
  className = "",
}: RemarksSectionProps) {
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks);
  const [newRemark, setNewRemark] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null
  );

  const isAddDisabled = newRemark.trim().length === 0;

  const handleAdd = () => {
    if (isAddDisabled) return;

    const remark: Remark = {
      id: (remarks.length + 1).toString(),
      text: newRemark.trim(),
      createdAt: "Just now",
    };

    const updated = [remark, ...remarks];
    setRemarks(updated);
    onChange?.(updated);
    setNewRemark("");
    setSelectedSuggestion(null);
  };

  const renderRemark = (r: Remark) => (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
      <div className="text-slate-800">{r.text}</div>
      <div className="text-xs text-slate-500 mt-1">{r.createdAt}</div>
    </div>
  );

  return (
    <section className={className}>
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Capture key points to use in later stages.
        </p>
      </div>

      {/* Input */}
      <div className="mb-3 sm:mb-4">
        <textarea
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
          rows={3}
          placeholder="Type your remark here..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] resize-none"
        />

        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setNewRemark(s);
                  setSelectedSuggestion(s);
                }}
                className={`text-xs px-2 py-1 rounded-full border ${
                  selectedSuggestion === s
                    ? "bg-[var(--primary-base)] text-white border-[var(--primary-base)]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={isAddDisabled}>
            Add Remark
          </Button>
        </div>
      </div>

      {/* List */}
      <GenericList
        items={remarks}
        renderItem={renderRemark}
        maxItems={6}
        showViewMore={true}
        emptyMessage="No remarks added yet"
        className="bg-transparent shadow-none p-0"
      />
    </section>
  );
}


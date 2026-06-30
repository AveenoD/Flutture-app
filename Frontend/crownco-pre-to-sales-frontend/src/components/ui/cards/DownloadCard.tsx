"use client";

import React from "react";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type Document = {
  id: string;
  name: string;
  type: "agreement" | "id-proof" | "address-proof" | "payment-receipt" | "other";
  uploadedAt: string;
  size: string;
  status: "uploaded" | "verified" | "pending";
};

type DownloadCardProps = {
  documents: Document[];
  onDownload: (doc: Document) => void;
  title?: string;
  emptyMessage?: string;
  className?: string;
};

const getDocumentTypeLabel = (type: Document["type"]) => {
  const labels: Record<Document["type"], string> = {
    agreement: "Booking Agreement",
    "id-proof": "ID Proof",
    "address-proof": "Address Proof",
    "payment-receipt": "Payment Receipt",
    other: "Other",
  };
  return labels[type];
};

export function DownloadCard({
  documents,
  onDownload,
  title = "Uploaded Documents",
  emptyMessage = "No documents uploaded yet.",
  className = "",
}: DownloadCardProps) {
  if (documents.length === 0) {
    return (
      <div className={`rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm ${className}`}>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          {title}
        </h3>
        <div className="text-center py-8 text-xs sm:text-sm text-slate-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm ${className}`}>
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        {title}
      </h3>

      <div className="space-y-2 sm:space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 break-words">
                    {doc.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                      doc.status === "verified"
                        ? "bg-emerald-50 text-emerald-600"
                        : doc.status === "uploaded"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {doc.status === "verified"
                      ? "Verified"
                      : doc.status === "uploaded"
                      ? "Uploaded"
                      : "Pending"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500">
                  <span className="whitespace-nowrap">{getDocumentTypeLabel(doc.type)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">{doc.size}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">{doc.uploadedAt}</span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(doc)}
              className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}


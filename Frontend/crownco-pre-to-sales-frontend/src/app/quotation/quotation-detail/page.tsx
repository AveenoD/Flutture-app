"use client";

import React from "react";
import Image from "next/image";
import { Button, Breadcrumbs } from "@/components/ui";
import {
  ArrowLeft,
  FileText,
  Copy,
  IndianRupee,
  Share2,
} from "lucide-react";
import { Share } from "next/font/google";

type QuotationStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const MOCK_QUOTATION = {
  id: "QT-2026-001",
  status: "accepted" as QuotationStatus,
  projectName: "Maaz Palace",
  projectLocation: "Kurla – City Center",
  projectConfig: "2BHK – 1200 Sq meter",
  projectPriceRange: "Base Price Range – ₹3Cr – ₹3.5Cr",
  tags: ["Sea Facing", "Smart Homes", "Play Ground"],
  wing: "A Wing",
  flatNo: "B-403",
  floor: "12th Floor",
  reraCarpet: "705 sq.ft.",
  customerName: "Zishan",
  customerPhone: "+91 98765 43210",
  customerEmail: "Zishan45@email.com",
  salesPerson: "Maaz Khan",
  salesPhone: "+1 234 567 8900",
  salesEmail: "maazkhan789@gmail.com",
  channelPartner: "ABC Realty",
  snapshot: {
    areaType: "Urban",
    reraNumber: "P51800052567",
    possessionDate: "December 2025",
  },
  priceBreakdown: [
    { label: "Property Base Price", amount: 30000000, isDiscount: false },
    { label: "Parking", amount: 90000, isDiscount: false },
    { label: "Infrastructure Cost", amount: 70000, isDiscount: false },
    { label: "Development Charges", amount: 100000, isDiscount: false },
    { label: "Water Charges", amount: 100000, isDiscount: false },
    { label: "MSEB Charges", amount: 100000, isDiscount: false },
    { label: "Legal Charges", amount: 100000, isDiscount: false },
    { label: "Stamp Duty", amount: 100000, isDiscount: false },
    { label: "Registration Fee", amount: 100000, isDiscount: false },
    { label: "GST", amount: 100000, isDiscount: false },
    { label: "VAT", amount: 100000, isDiscount: false },
    { label: "Extra Work", amount: 100000, isDiscount: false },
    { label: "One-Time Maintenance", amount: 100000, isDiscount: false },
    { label: "Discount (Diwali Special)", amount: 7500000, isDiscount: true },
  ],
};

const getStatusBadge = (status: QuotationStatus) => {
  const map: Record<
    QuotationStatus,
    { label: string; className: string }
  > = {
    draft: {
      label: "Draft",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    sent: {
      label: "Sent",
      className: "bg-sky-50 text-sky-700 border-sky-200",
    },
    viewed: {
      label: "Viewed",
      className: "bg-violet-50 text-violet-700 border-violet-200",
    },
    accepted: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };
  return map[status];
};

export default function QuotationDetailPage() {
  const q = MOCK_QUOTATION;
  const statusMeta = getStatusBadge(q.status);

  const total = q.priceBreakdown.reduce(
    (sum, i) => sum + (i.isDiscount ? -i.amount : i.amount),
    0
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Breadcrumbs + Header */}
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Quotations", href: "/quotation" },
              {
                label: `${q.projectName} • ${q.wing} • ${q.flatNo}`,
                isCurrent: true,
              },
            ]}
          />
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                  Quotation for {q.projectName}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Project <span className="font-semibold">{q.projectName}</span> •{" "}
                Unit{" "}
                <span className="font-semibold">
                  {q.wing} • {q.flatNo}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Copy className="w-4 h-4" />}
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}
              >
                Copy Link
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={() => {
                  console.log("Download PDF for", q.id);
                }}
              >
                Download PDF
              </Button>
            </div>
          </header>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* LEFT: Project + Flat + Price */}
          <div className="lg:col-span-2 space-y-4">
            {/* Project Detail */}
            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="relative h-52 sm:h-64 w-full">
                <Image
                  src="/Property-3 1.png"
                  alt={q.projectName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 sm:p-5 space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {q.projectName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {q.projectLocation}
                </p>
                <p className="text-xs sm:text-sm text-slate-600">
                  {q.projectConfig}
                </p>
                <p className="text-xs sm:text-sm text-slate-600">
                  {q.projectPriceRange}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Allocated Flat Info */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Allocated Flat Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-500">Wing</p>
                  <p className="font-semibold text-slate-900">{q.wing}</p>
                </div>
                <div>
                  <p className="text-slate-500">Flat No</p>
                  <p className="font-semibold text-slate-900">{q.flatNo}</p>
                </div>
                <div>
                  <p className="text-slate-500">Floor</p>
                  <p className="font-semibold text-slate-900">{q.floor}</p>
                </div>
                <div>
                  <p className="text-slate-500">RERA Carpet Area</p>
                  <p className="font-semibold text-slate-900">
                    {q.reraCarpet}
                  </p>
                </div>
              </div>
            </section>

            {/* Price Breakdown */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-2">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Price Breakdown
              </h3>
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs sm:text-sm">
                {q.priceBreakdown.map((item, idx) => {
                  const isDiscount = !!item.isDiscount;
                  const sign = isDiscount ? "-" : "+";
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 sm:px-4 py-2 border-b last:border-b-0 border-slate-100 bg-slate-50/40"
                    >
                      <span className="text-slate-800">{item.label}</span>
                      <span
                        className={
                          isDiscount
                            ? "text-red-600 font-semibold"
                            : "text-slate-900 font-semibold"
                        }
                      >
                        {sign} {formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-slate-200 bg-emerald-50">
                  <span className="font-semibold text-slate-900">
                    Final Deal Price
                  </span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </section>

            {/* Share bar */}
            <section className="rounded-2xl shadow-sm">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-sm sm:text-base"
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
            </section>
          </div>

          {/* RIGHT: Representative / Client / Snapshot */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Assigned Representative
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">Sales Person</p>
              <p className="text-sm font-semibold text-slate-900">
                {q.salesPerson}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Contact No
              </p>
              <p className="text-sm font-medium text-slate-900">
                {q.salesPhone}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">Email</p>
              <p className="text-sm font-medium text-slate-900 break-all">
                {q.salesEmail}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Channel Partner
              </p>
              <p className="text-sm font-medium text-slate-900">
                {q.channelPartner}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Client Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Customer Name
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {q.customerName}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Contact No
              </p>
              <p className="text-sm font-medium text-slate-900">
                {q.customerPhone}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">Email</p>
              <p className="text-sm font-medium text-slate-900 break-all">
                {q.customerEmail}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-2">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Project Snapshot
              </h3>
              <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                <p>
                  <span className="font-semibold text-slate-800">
                    Area Type:
                  </span>{" "}
                  {q.snapshot.areaType}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">
                    RERA Number:
                  </span>{" "}
                  {q.snapshot.reraNumber}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">
                    Possession Date:
                  </span>{" "}
                  {q.snapshot.possessionDate}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
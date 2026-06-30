"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Download,
  Envelope,
  FileText,
  Phone,
  User,
  WhatsappLogo,
} from "phosphor-react";
import { apiFetch } from "../../../../../../lib/apiClient";

type QuotationLine = { label: string; amount?: number | null };

type QuotationApi = {
  id: string;
  base_price?: number | null;
  parking_price?: number | null;
  infrastructure_cost?: number | null;
  development_charges?: number | null;
  water_charges?: number | null;
  mseb_charges?: number | null;
  legal_charges?: number | null;
  stamp_duty?: number | null;
  registration_fee?: number | null;
  gst?: number | null;
  vat?: number | null;
  one_time_maintenance?: number | null;
  additional_charges?: Array<{ label?: string; amount?: number | null }>;
  discount_name?: string | null;
  discount_price?: number | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  customer_email?: string | null;
  quotation_status: string;
  quotation_version: number;
  rejection_reason?: string | null;
  valid_till?: string | null;
  created_at: string;
};

function pick(n: unknown): number {
  return typeof n === "number" && !Number.isNaN(n) ? n : 0;
}

/** Line-item display: L / Cr / full INR like design refs */
function formatInrLine(amount: number): string {
  if (amount === 0) return "₹0";
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 4 })} Cr`;
  }
  if (abs >= 100_000) {
    const L = amount / 100_000;
    const s = Number.isInteger(L) ? L.toFixed(0) : L.toFixed(1);
    return `₹${s} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatTotalPrimary(amount: number): string {
  const cr = amount / 10_000_000;
  if (cr >= 1) {
    return `₹${cr.toFixed(4)} Cr`;
  }
  if (amount >= 100_000) {
    const L = amount / 100_000;
    return `₹${L.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function QuotationPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const quotationId = searchParams.get("quotationId");

  const [quotation, setQuotation] = useState<QuotationApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId || !quotationId) {
      setLoading(false);
      setError("Missing lead or quotation.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{
          data?: { quotation?: QuotationApi };
        }>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/quotations/${encodeURIComponent(quotationId)}`
        );
        const q = res.data?.quotation;
        if (!cancelled) {
          if (q) setQuotation(q);
          else setError("Quotation not found.");
        }
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Failed to load quotation.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, quotationId]);

  const { mainLines, addonLines, total } = useMemo(() => {
      if (!quotation) {
        return {
          mainLines: [] as QuotationLine[],
          addonLines: [] as QuotationLine[],
          total: 0,
        };
      }

      const q = quotation;
      const mainDefs: [string, number][] = [
        ["Base Price", pick(q.base_price)],
        ["Parking", pick(q.parking_price)],
        ["Infrastructure", pick(q.infrastructure_cost)],
        ["Development Charges", pick(q.development_charges)],
        ["Water Charges", pick(q.water_charges)],
        ["MSEB Charges", pick(q.mseb_charges)],
        ["Legal Charges", pick(q.legal_charges)],
        ["Stamp Duty", pick(q.stamp_duty)],
        ["Registration Fee", pick(q.registration_fee)],
        ["GST", pick(q.gst)],
        ["VAT", pick(q.vat)],
        ["One Time Maintenance", pick(q.one_time_maintenance)],
      ];

      const mainLines: QuotationLine[] = mainDefs
        .filter(([, v]) => v !== 0)
        .map(([label, amount]) => ({ label, amount }));

      const rawAddl = Array.isArray(q.additional_charges)
        ? q.additional_charges
        : [];
      const addonLines: QuotationLine[] = rawAddl
        .map((row) => ({
          label: String(row.label ?? "").trim() || "Charge",
          amount: pick(row.amount),
        }))
        .filter((r) => r.amount !== 0);

      const mainSum = mainLines.reduce((s, l) => s + pick(l.amount), 0);
      const addonSum = addonLines.reduce((s, l) => s + pick(l.amount), 0);
      const subtotal = mainSum + addonSum;
      const disc = pick(q.discount_price);
      const total = subtotal - disc;

      return { mainLines, addonLines, total };
    }, [quotation]);

  const statusLower = quotation?.quotation_status?.toLowerCase() ?? "";
  const isApproved = statusLower === "approved";
  const isRejected = statusLower === "rejected";
  const statusBadge = isApproved
    ? "APPROVED"
    : isRejected
      ? "REJECTED"
      : "UNAPPROVED";

  const createdLabel = quotation?.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    : "—";

  const backHref = leadId
    ? `/sales/lead-list/lead-detail/negotiation/overveiw?leadId=${encodeURIComponent(leadId)}`
    : "/sales/lead-list";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-6">
        <p className="text-sm text-[#667085]">Loading quotation…</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] p-6">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-base)]"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <p className="text-sm text-red-600">{error || "Not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] pb-28">
      <div className="max-w-lg mx-auto px-4 pt-4 sm:pt-6">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#344054] hover:text-[var(--primary-base)]"
        >
          <ArrowLeft size={18} weight="bold" />
          Back to negotiation
        </button>

        {/* Header card */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAECF0] shadow-sm">
              <FileText size={22} className="text-[#667085]" weight="duotone" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#101828] truncate">
                Quotation v{quotation.quotation_version}
              </h1>
              <p className="text-xs text-[#667085] mt-0.5">
                Created {createdLabel}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
              isApproved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isRejected
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {statusBadge}
          </span>
        </div>

        {isRejected && quotation.rejection_reason?.trim() ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 mb-1">
              Manager rejection note
            </p>
            <p className="text-sm leading-snug">{quotation.rejection_reason}</p>
          </div>
        ) : null}

        {/* Price breakdown */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
          Price breakdown
        </p>
        <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-3 sm:p-4 shadow-sm mb-4">
          <div className="space-y-0">
            {mainLines.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EAECF0]/80 last:border-0"
              >
                <span className="text-sm text-[#344054]">{row.label}</span>
                <span className="text-sm font-medium text-[#101828] tabular-nums shrink-0">
                  {formatInrLine(pick(row.amount))}
                </span>
              </div>
            ))}
          </div>

          {addonLines.length > 0 && (
            <>
              <div className="my-3 border-t border-dashed border-[#D0D5DD]" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                Add-ons
              </p>
              <div className="space-y-0">
                {addonLines.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EAECF0]/80 last:border-0"
                  >
                    <span className="text-sm text-[#344054]">{row.label}</span>
                    <span className="text-sm font-medium text-[#101828] tabular-nums shrink-0">
                      {formatInrLine(pick(row.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {pick(quotation.discount_price) !== 0 && (
            <>
              <div className="my-3 border-t border-dashed border-[#D0D5DD]" />
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-[#344054]">
                  Discount
                  {quotation.discount_name
                    ? ` (${quotation.discount_name})`
                    : ""}
                </span>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">
                  − {formatInrLine(pick(quotation.discount_price))}
                </span>
              </div>
            </>
          )}

          <div className="mt-3 pt-3 border-t border-[#D0D5DD] flex items-center justify-between gap-3">
            <span className="text-base font-bold text-[#101828]">Total</span>
            <span className="text-base font-bold text-[var(--primary-base)] tabular-nums">
              {formatTotalPrimary(total)}
            </span>
          </div>
        </div>

        {/* Customer */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
          Customer
        </p>
        <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-3 sm:p-4 shadow-sm space-y-3 mb-6">
          {quotation.customer_name ? (
            <div className="flex items-center gap-3 text-sm text-[#344054]">
              <User size={18} className="text-[#98A2B3] shrink-0" />
              <span>{quotation.customer_name}</span>
            </div>
          ) : null}
          {quotation.customer_contact ? (
            <div className="flex items-center gap-3 text-sm text-[#344054]">
              <Phone size={18} className="text-[#98A2B3] shrink-0" />
              <span>{quotation.customer_contact}</span>
            </div>
          ) : null}
          {quotation.customer_email ? (
            <div className="flex items-center gap-3 text-sm text-[#344054]">
              <Envelope size={18} className="text-[#98A2B3] shrink-0" />
              <span className="break-all">{quotation.customer_email}</span>
            </div>
          ) : null}
          {quotation.valid_till ? (
            <div className="flex items-center gap-3 text-sm text-[#344054]">
              <Calendar size={18} className="text-[#98A2B3] shrink-0" />
              <span>Valid till: {quotation.valid_till}</span>
            </div>
          ) : null}
          {!quotation.customer_name &&
            !quotation.customer_contact &&
            !quotation.customer_email &&
            !quotation.valid_till && (
              <p className="text-xs text-[#667085]">No customer details.</p>
            )}
        </div>
      </div>

      {/* Sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#EAECF0] bg-white/95 backdrop-blur-sm px-4 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!isApproved}
              onClick={() => {
                if (!isApproved) return;
                // Placeholder: wire PDF when backend is ready
                window.print();
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#EAECF0] text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Download
            </button>
            <button
              type="button"
              disabled={!isApproved}
              onClick={() => {
                if (!isApproved) return;
                // Share is handled from negotiation after approval; optional deep-link later
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#EAECF0] text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <WhatsappLogo size={18} />
              WhatsApp
            </button>
          </div>
          <p className="text-center text-[11px] text-[#98A2B3]">
            Available after manager approval
          </p>
        </div>
      </div>
    </div>
  );
}

export default function QuotationPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-6">
          <p className="text-sm text-[#667085]">Loading…</p>
        </div>
      }
    >
      <QuotationPreviewContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Copy,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Building2,
  CalendarClock,
  BadgeInfo,
  FileText,
} from "lucide-react";
import { getLeadById, updateLead, type LeadResponse, type UpdateLeadPayload } from "@/lib/leadsApi";
import { apiFetch } from "@/lib/apiClient";
import {
  listBookingDocuments,
  type BookingDocumentRow,
} from "@/lib/bookingDocuments";

type DetailFormState = {
  name: string;
  phone: string;
  email: string;
  alternate_phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  source: string;
  source_detail: string;
  budget_min: string;
  budget_max: string;
  lead_temperature: string;
  status: string;
  stage: string;
  priority: string;
  notes: string;
};

const emptyForm = (): DetailFormState => ({
  name: "",
  phone: "",
  email: "",
  alternate_phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  source: "",
  source_detail: "",
  budget_min: "",
  budget_max: "",
  lead_temperature: "",
  status: "",
  stage: "",
  priority: "",
  notes: "",
});

function toStringValue(value?: string | null) {
  return value ?? "";
}

function toNumericValue(value?: number | null) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function formatBudget(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "N/A";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max as number)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

type QuotationLine = { label: string; amount?: number | null };
type QuotationApi = {
  id: string;
  quotation_status: string;
  quotation_version: number;
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
  additional_charges?: Array<{ label?: string; amount?: number | null }> | null;
  discount_name?: string | null;
  discount_price?: number | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  customer_email?: string | null;
  valid_till?: string | null;
  created_at?: string | null;
  rejection_reason?: string | null;
};

function quotationComputedTotal(q: QuotationApi): number {
  const add = (n: unknown) => (typeof n === "number" && !Number.isNaN(n) ? n : 0);
  let t =
    add(q.base_price) +
    add(q.parking_price) +
    add(q.infrastructure_cost) +
    add(q.development_charges) +
    add(q.water_charges) +
    add(q.mseb_charges) +
    add(q.legal_charges) +
    add(q.stamp_duty) +
    add(q.registration_fee) +
    add(q.gst) +
    add(q.vat) +
    add(q.one_time_maintenance);
  t -= add(q.discount_price);
  const extras = q.additional_charges;
  if (Array.isArray(extras)) {
    for (const c of extras) {
      t += add(c?.amount);
    }
  }
  return t;
}

function pick(n: unknown): number {
  return typeof n === "number" && !Number.isNaN(n) ? n : 0;
}

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

function toPayload(form: DetailFormState): UpdateLeadPayload {
  return {
    name: form.name.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    alternate_phone: form.alternate_phone.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
    source: form.source.trim() || undefined,
    source_detail: form.source_detail.trim() || undefined,
    budget_min: form.budget_min.trim() ? Number(form.budget_min) : undefined,
    budget_max: form.budget_max.trim() ? Number(form.budget_max) : undefined,
    lead_temperature: form.lead_temperature.trim() || undefined,
    status: form.status.trim() || undefined,
    stage: form.stage.trim() || undefined,
    priority: form.priority.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [lead, setLead] = useState<LeadResponse | null>(null);
  const [form, setForm] = useState<DetailFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isNegotiationLoading, setIsNegotiationLoading] = useState(false);
  const [negotiationSummary, setNegotiationSummary] = useState<{
    status?: string;
    finalPrice?: number;
  } | null>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<{
    status?: string;
    finalPrice?: number;
    tokenAmount?: number;
  } | null>(null);
  const [bookingDocuments, setBookingDocuments] = useState<BookingDocumentRow[]>(
    []
  );
  const [isBookingDocumentsLoading, setIsBookingDocumentsLoading] =
    useState(false);

  const [quotations, setQuotations] = useState<QuotationApi[]>([]);
  const [isQuotationsLoading, setIsQuotationsLoading] = useState(false);
  const [rejectModalQuotationId, setRejectModalQuotationId] = useState<string | null>(
    null
  );
  const [rejectModalReason, setRejectModalReason] = useState("");
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const scrollTo = searchParams.get("scrollTo");
  const quotationsPreviewRef = useRef<HTMLDivElement | null>(null);
  const didAutoScrollRef = useRef(false);

  const latestApprovedQuotationId = useMemo(() => {
    const approved = quotations.filter(
      (q) => q.quotation_status?.toLowerCase() === "approved"
    );
    if (approved.length === 0) return null;

    return approved.reduce((best, cur) => {
      if (cur.quotation_version > best.quotation_version) return cur;
      if (cur.quotation_version < best.quotation_version) return best;

      const bestTime = best.created_at ? new Date(best.created_at).getTime() : 0;
      const curTime = cur.created_at ? new Date(cur.created_at).getTime() : 0;
      return curTime >= bestTime ? cur : best;
    }, approved[0]).id;
  }, [quotations]);

  const [quotationPreview, setQuotationPreview] = useState<QuotationApi | null>(
    null
  );
  const [isQuotationPreviewLoading, setIsQuotationPreviewLoading] =
    useState(false);
  const [quotationPreviewError, setQuotationPreviewError] = useState<string | null>(
    null
  );

  const loadLead = async () => {
    if (!id) {
      setError("Lead id is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await getLeadById(id);
      setLead(data);
      setForm({
        name: toStringValue(data.name),
        phone: toStringValue(data.phone),
        email: toStringValue(data.email),
        alternate_phone: toStringValue(data.alternate_phone),
        address: toStringValue(data.address),
        city: toStringValue(data.city),
        state: toStringValue(data.state),
        pincode: toStringValue(data.pincode),
        source: toStringValue(data.source),
        source_detail: toStringValue(data.source_detail),
        budget_min: toNumericValue(data.budget_min),
        budget_max: toNumericValue(data.budget_max),
        lead_temperature: toStringValue(data.lead_temperature),
        status: toStringValue(data.status),
        stage: toStringValue(data.stage),
        priority: toStringValue(data.priority),
        notes: toStringValue(data.notes),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNegotiationSummary = async (leadId: string) => {
    try {
      setIsNegotiationLoading(true);
      const [negRes, pbRes] = await Promise.all([
        apiFetch<any>(`/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`),
        apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(
            leadId
          )}/negotiation/price-breakdown`
        ),
      ]);
      const neg = negRes.data?.negotiation ?? {};
      const pb = pbRes.data?.price_breakdown ?? {};
      const finalPriceRaw = pb?.final_price;
      const finalPrice =
        typeof finalPriceRaw === "number"
          ? finalPriceRaw
          : Number(finalPriceRaw ?? 0) || undefined;
      setNegotiationSummary({
        status: typeof neg.status === "string" ? neg.status : undefined,
        finalPrice,
      });
    } catch {
      setNegotiationSummary(null);
    } finally {
      setIsNegotiationLoading(false);
    }
  };

  const loadBookingDocuments = async (leadId: string) => {
    try {
      setIsBookingDocumentsLoading(true);
      const list = await listBookingDocuments(leadId);
      setBookingDocuments(Array.isArray(list) ? list : []);
    } catch {
      setBookingDocuments([]);
    } finally {
      setIsBookingDocumentsLoading(false);
    }
  };

  const loadBookingSummary = async (leadId: string) => {
    try {
      setIsBookingLoading(true);
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/booking`
      );
      const booking = res.data?.booking ?? {};
      const finalPriceRaw = booking?.final_total_price;
      const tokenAmountRaw = booking?.token_amount;
      const finalPrice =
        typeof finalPriceRaw === "number"
          ? finalPriceRaw
          : Number(finalPriceRaw ?? 0) || undefined;
      const tokenAmount =
        typeof tokenAmountRaw === "number"
          ? tokenAmountRaw
          : Number(tokenAmountRaw ?? 0) || undefined;
      setBookingSummary({
        status: typeof booking.booking_status === "string" ? booking.booking_status : undefined,
        finalPrice,
        tokenAmount,
      });
    } catch {
      setBookingSummary(null);
    } finally {
      setIsBookingLoading(false);
    }
  };

  const loadQuotations = async (leadId: string) => {
    try {
      setIsQuotationsLoading(true);
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/quotations?page=1&limit=20`
      );
      const list = (res.data?.quotations ?? []) as QuotationApi[];
      setQuotations(Array.isArray(list) ? list : []);
    } catch {
      setQuotations([]);
    } finally {
      setIsQuotationsLoading(false);
    }
  };

  useEffect(() => {
    void loadLead();
    if (id) {
      void loadNegotiationSummary(id);
      void loadBookingSummary(id);
      void loadBookingDocuments(id);
      void loadQuotations(id);
    }
  }, [id]);

  // Fetch latest approved quotation full details (so we can show proper preview UI)
  useEffect(() => {
    if (!id) return;

    if (!latestApprovedQuotationId) {
      setQuotationPreview(null);
      setQuotationPreviewError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsQuotationPreviewLoading(true);
      setQuotationPreviewError(null);
      try {
        const res = await apiFetch<{
          data?: { quotation?: QuotationApi };
        }>(
          `/api/v1/leads/${encodeURIComponent(
            id
          )}/quotations/${encodeURIComponent(latestApprovedQuotationId)}`
        );

        const q = res.data?.quotation ?? null;
        if (!cancelled) {
          setQuotationPreview(q);
          if (!q) setQuotationPreviewError("Quotation not found.");
        }
      } catch (err: any) {
        if (cancelled) return;
        setQuotationPreview(null);
        setQuotationPreviewError(
          err?.message || "Failed to load approved quotation preview"
        );
      } finally {
        if (!cancelled) setIsQuotationPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, latestApprovedQuotationId]);

  // Auto-scroll to quotation preview when user opens lead from Sales tab
  useEffect(() => {
    if (scrollTo !== "quotations") return;
    if (didAutoScrollRef.current) return;
    if (isQuotationsLoading) return;
    if (quotations.length === 0) return;
    if (!quotationsPreviewRef.current) return;

    quotationsPreviewRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    didAutoScrollRef.current = true;
  }, [scrollTo, isQuotationsLoading, quotations.length]);

  const assignedTo = useMemo(() => {
    if (!lead?.assigned_to_user_id) return "Unassigned";
    return `${lead.assigned_to_user_type || "user"} • ${lead.assigned_to_user_id}`;
  }, [lead]);

  const quotationPreviewComputed = useMemo(() => {
    const q = quotationPreview;
    if (!q) {
      return {
        mainLines: [] as QuotationLine[],
        addonLines: [] as QuotationLine[],
        total: 0,
        discount: 0,
      };
    }

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

    const discount = pick(q.discount_price);
    const total = subtotal - discount;

    return { mainLines, addonLines, total, discount };
  }, [quotationPreview]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateLead(id, toPayload(form));
      setLead(updated);
      setSuccess("Lead updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[var(--surface-neutral)] min-h-full">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--primary-base)]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadLead()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-dark)] hover:bg-[var(--hover-bg)]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              href="/all-leads"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-base)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
            >
              All Leads
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
            Loading lead details...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">
            {success}
          </div>
        )}

        {lead && (
          <>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-neutral)] flex items-center justify-center font-semibold text-[var(--text-primary)]">
                      <User size={18} />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-dark)]">
                        {lead.name}
                      </h1>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Lead ID: {lead.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-neutral)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <Phone size={13} />
                      {lead.phone}
                    </span>
                    {lead.email && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-neutral)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">
                        <Mail size={13} />
                        {lead.email}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-neutral)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <MapPin size={13} />
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "N/A"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-neutral)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <BadgeInfo size={13} />
                      {lead.lead_temperature}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[420px]">
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Current Status</p>
                    <p className="text-base font-semibold text-[var(--text-dark)] mt-1">{lead.status}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Assigned To</p>
                    <p className="text-base font-semibold text-[var(--text-dark)] mt-1">{assignedTo}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Project</p>
                    <p className="text-base font-semibold text-[var(--text-dark)] mt-1">{lead.project_title || "N/A"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Created At</p>
                    <p className="text-base font-semibold text-[var(--text-dark)] mt-1">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-dark)]">Update Lead</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Save changes to the lead profile and status.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
                  <Field label="Phone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
                  <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
                  <Field label="Alternate Phone" value={form.alternate_phone} onChange={(value) => setForm((prev) => ({ ...prev, alternate_phone: value }))} />
                  <Field label="City" value={form.city} onChange={(value) => setForm((prev) => ({ ...prev, city: value }))} />
                  <Field label="State" value={form.state} onChange={(value) => setForm((prev) => ({ ...prev, state: value }))} />
                  <Field label="Pincode" value={form.pincode} onChange={(value) => setForm((prev) => ({ ...prev, pincode: value }))} />
                  <Field label="Source" value={form.source} onChange={(value) => setForm((prev) => ({ ...prev, source: value }))} />
                  <Field label="Source Detail" value={form.source_detail} onChange={(value) => setForm((prev) => ({ ...prev, source_detail: value }))} />
                  <Field label="Budget Min" type="number" value={form.budget_min} onChange={(value) => setForm((prev) => ({ ...prev, budget_min: value }))} />
                  <Field label="Budget Max" type="number" value={form.budget_max} onChange={(value) => setForm((prev) => ({ ...prev, budget_max: value }))} />
                  <Field label="Priority" value={form.priority} onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <SelectField
                    label="Lead Temperature"
                    value={form.lead_temperature}
                    onChange={(value) => setForm((prev) => ({ ...prev, lead_temperature: value }))}
                    options={[
                      { value: "veryhot", label: "Very Hot" },
                      { value: "hot", label: "Hot" },
                      { value: "warm", label: "Warm" },
                      { value: "cold", label: "Cold" },
                    ]}
                  />
                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                    options={[
                      { value: "unqualified", label: "Unqualified" },
                      { value: "called", label: "Called" },
                      { value: "qualified", label: "Qualified" },
                      { value: "visit", label: "Visit" },
                      { value: "negotiation", label: "Negotiation" },
                      { value: "deal", label: "Deal" },
                      { value: "dropped", label: "Dropped" },
                      { value: "rejected", label: "Rejected" },
                    ]}
                  />
                  <SelectField
                    label="Stage"
                    value={form.stage}
                    onChange={(value) => setForm((prev) => ({ ...prev, stage: value }))}
                    options={[
                      { value: "", label: "None" },
                      { value: "qualification", label: "Qualification" },
                      { value: "communication", label: "Communication" },
                      { value: "site_visit", label: "Site Visit" },
                      { value: "negotiation", label: "Negotiation" },
                      { value: "booking", label: "Booking" },
                    ]}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={5}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="Internal notes"
                  />
                </div>

                {/* Negotiation summary & actions for Manager/GM */}
                <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        Negotiation
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        View latest negotiation submitted by Sales and approve or reject.
                      </p>
                    </div>
                    {isNegotiationLoading && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        Loading...
                      </span>
                    )}
                  </div>
                  {negotiationSummary ? (
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-secondary)]">Status</p>
                        <p className="text-sm font-medium text-[var(--text-dark)]">
                          {negotiationSummary.status || "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Final Deal Price
                        </p>
                        <p className="text-sm font-medium text-[var(--text-dark)]">
                          {negotiationSummary.finalPrice != null
                            ? `₹${negotiationSummary.finalPrice.toLocaleString("en-IN")}`
                            : "—"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!id) return;
                            setError("");
                            setSuccess("");
                            try {
                              await apiFetch(
                                `/api/v1/leads/${encodeURIComponent(
                                  id
                                )}/negotiation/approve`,
                                { method: "POST" }
                              );
                              setSuccess("Negotiation approved successfully.");
                              await loadNegotiationSummary(id);
                            } catch (err: any) {
                              setError(
                                err?.message ||
                                  "Failed to approve negotiation. Please try again."
                              );
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-[var(--primary-base)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
                        >
                          Approve Negotiation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError(
                              "Negotiation rejection flow is not implemented yet. Please coordinate with Sales manually."
                            );
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)]"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">
                      No negotiation submitted for approval yet.
                    </p>
                  )}
                </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 sm:p-6 shadow-sm">
                {/* Quotations — separate card */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-dark)]">
                        Quotations
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Sales drafts list and approve/reject.
                      </p>
                    </div>
                    {isQuotationsLoading && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        Loading...
                      </span>
                    )}
                  </div>

                  {/* Approved quotation preview */}
                  <div
                    ref={quotationsPreviewRef}
                    className="rounded-xl border border-[var(--border-color)] bg-white p-4 space-y-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        Approved quotation preview
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Jo Sales ne quotation me bheja tha (breakdown + customer)
                      </p>
                    </div>

                    {isQuotationPreviewLoading ? (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Loading preview...
                      </p>
                    ) : quotationPreview ? (
                      (() => {
                        const isApprovedPreview =
                          quotationPreview.quotation_status?.toLowerCase() ===
                          "approved";

                        const createdLabel = quotationPreview.created_at
                          ? new Date(quotationPreview.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "numeric",
                                year: "numeric",
                              }
                            )
                          : "—";

                        return (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAECF0] shadow-sm">
                                  <FileText
                                    size={22}
                                    className="text-[#667085]"
                                    strokeWidth={2}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm sm:text-base font-bold text-[#101828] truncate">
                                    Quotation v{quotationPreview.quotation_version}
                                  </h3>
                                  <p className="text-xs text-[#667085] mt-0.5">
                                    Created {createdLabel}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                                  isApprovedPreview
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 bg-white text-slate-600"
                                }`}
                              >
                                {isApprovedPreview ? "APPROVED" : "UNAPPROVED"}
                              </span>
                            </div>

                            <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-3 sm:p-4 shadow-sm">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                                Price breakdown
                              </p>

                              <div className="space-y-0">
                                {quotationPreviewComputed.mainLines.map((row) => (
                                  <div
                                    key={row.label}
                                    className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EAECF0]/80 last:border-0"
                                  >
                                    <span className="text-sm text-[#344054]">
                                      {row.label}
                                    </span>
                                    <span className="text-sm font-medium text-[#101828] tabular-nums shrink-0">
                                      {formatInrLine(pick(row.amount))}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {quotationPreviewComputed.addonLines.length > 0 && (
                                <>
                                  <div className="my-3 border-t border-dashed border-[#D0D5DD]" />
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                                    Add-ons
                                  </p>
                                  <div className="space-y-0">
                                    {quotationPreviewComputed.addonLines.map((row) => (
                                      <div
                                        key={row.label}
                                        className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EAECF0]/80 last:border-0"
                                      >
                                        <span className="text-sm text-[#344054]">
                                          {row.label}
                                        </span>
                                        <span className="text-sm font-medium text-[#101828] tabular-nums shrink-0">
                                          {formatInrLine(pick(row.amount))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}

                              {pick(quotationPreviewComputed.discount) !== 0 && (
                                <>
                                  <div className="my-3 border-t border-dashed border-[#D0D5DD]" />
                                  <div className="flex items-center justify-between gap-3 py-2">
                                    <span className="text-sm text-[#344054]">
                                      Discount
                                      {quotationPreview.discount_name
                                        ? ` (${quotationPreview.discount_name})`
                                        : ""}
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">
                                      −{" "}
                                      {formatInrLine(
                                        pick(quotationPreviewComputed.discount)
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}

                              <div className="mt-3 pt-3 border-t border-[#D0D5DD] flex items-center justify-between gap-3">
                                <span className="text-base font-bold text-[#101828]">
                                  Total
                                </span>
                                <span className="text-base font-bold text-[var(--primary-base)] tabular-nums">
                                  {formatTotalPrimary(
                                    quotationPreviewComputed.total
                                  )}
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                                Customer
                              </p>
                              <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-3 sm:p-4 shadow-sm space-y-3">
                                {quotationPreview.customer_name ? (
                                  <div className="flex items-center gap-3 text-sm text-[#344054]">
                                    <User
                                      size={18}
                                      className="text-[#98A2B3] shrink-0"
                                    />
                                    <span>{quotationPreview.customer_name}</span>
                                  </div>
                                ) : null}

                                {quotationPreview.customer_contact ? (
                                  <div className="flex items-center gap-3 text-sm text-[#344054]">
                                    <Phone
                                      size={18}
                                      className="text-[#98A2B3] shrink-0"
                                    />
                                    <span>{quotationPreview.customer_contact}</span>
                                  </div>
                                ) : null}

                                {quotationPreview.customer_email ? (
                                  <div className="flex items-center gap-3 text-sm text-[#344054]">
                                    <Mail
                                      size={18}
                                      className="text-[#98A2B3] shrink-0"
                                    />
                                    <span className="break-all">
                                      {quotationPreview.customer_email}
                                    </span>
                                  </div>
                                ) : null}

                                {quotationPreview.valid_till ? (
                                  <div className="flex items-center gap-3 text-sm text-[#344054]">
                                    <CalendarClock
                                      size={18}
                                      className="text-[#98A2B3] shrink-0"
                                    />
                                    <span>
                                      Valid till: {quotationPreview.valid_till}
                                    </span>
                                  </div>
                                ) : null}

                                {!quotationPreview.customer_name &&
                                !quotationPreview.customer_contact &&
                                !quotationPreview.customer_email &&
                                !quotationPreview.valid_till ? (
                                  <p className="text-xs text-[#667085]">
                                    No customer details.
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-1">
                        {quotationPreviewError ? (
                          <p className="text-xs text-red-600">
                            {quotationPreviewError}
                          </p>
                        ) : (
                          <p className="text-xs text-[#667085]">
                            No approved quotation available yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {quotations.length > 0 ? (
                    <div className="space-y-2">
                      <div className="overflow-x-auto rounded-lg border border-[var(--border-color)] bg-white">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-neutral)]">
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                Version
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                Preview
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                Status
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] min-w-[120px]">
                                Customer
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap text-right">
                                Total
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                Valid till
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] min-w-[140px]">
                                Rejection note
                              </th>
                              <th className="px-3 py-2 font-semibold text-[var(--text-secondary)] text-right whitespace-nowrap">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotations.map((q) => {
                              const status = q.quotation_status;
                              const s = (status ?? "").toLowerCase();
                              const canApprove = s !== "approved" && s !== "rejected";
                              const canReject = s !== "approved" && s !== "rejected";
                              const total = quotationComputedTotal(q);
                              return (
                                <tr
                                  key={q.id}
                                  className="border-b border-[var(--border-color)] last:border-0 align-top"
                                >
                                  <td className="px-3 py-2.5 font-medium text-[var(--text-dark)] tabular-nums">
                                    v{q.quotation_version}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    {id ? (
                                      <Link
                                        href={`/all-leads/${encodeURIComponent(id)}/quotation/${encodeURIComponent(q.id)}`}
                                        className="text-[11px] font-medium text-[var(--primary-base)] hover:underline"
                                      >
                                        Preview
                                      </Link>
                                    ) : (
                                      <span className="text-[var(--text-secondary)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 capitalize text-[var(--text-dark)]">
                                    {status}
                                  </td>
                                  <td className="px-3 py-2.5 text-[var(--text-dark)] max-w-[180px]">
                                    <span className="line-clamp-2 break-words">
                                      {q.customer_name || "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-dark)] whitespace-nowrap">
                                    {formatInrLine(total)}
                                  </td>
                                  <td className="px-3 py-2.5 text-[var(--text-dark)] whitespace-nowrap">
                                    {q.valid_till || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-[var(--text-dark)] max-w-[200px]">
                                    {status === "rejected" &&
                                    q.rejection_reason?.trim() ? (
                                      <span className="line-clamp-3 break-words text-[11px] leading-snug">
                                        {q.rejection_reason}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-secondary)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                      <button
                                        type="button"
                                        disabled={!canApprove}
                                        onClick={async () => {
                                          if (!id) return;
                                          setError("");
                                          setSuccess("");
                                          try {
                                            await apiFetch(
                                              `/api/v1/leads/${encodeURIComponent(
                                                id
                                              )}/quotations/${encodeURIComponent(
                                                q.id
                                              )}/approve`,
                                              { method: "POST" }
                                            );
                                            setSuccess("Quotation approved successfully.");
                                            await loadQuotations(id);
                                          } catch (err: any) {
                                            setError(
                                              err?.message ||
                                                "Failed to approve quotation. Please try again."
                                            );
                                          }
                                        }}
                                        className="inline-flex items-center justify-center rounded-md bg-[var(--primary-base)] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!canReject}
                                        onClick={() => {
                                          setError("");
                                          setRejectModalQuotationId(q.id);
                                          setRejectModalReason("");
                                        }}
                                        className="inline-flex items-center justify-center rounded-md border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {rejectModalQuotationId ? (
                        <div
                          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="reject-quotation-title"
                        >
                          <div className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-white p-4 shadow-lg space-y-3">
                            <h3
                              id="reject-quotation-title"
                              className="text-sm font-semibold text-[var(--text-dark)]"
                            >
                              Reject quotation
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Sales team will see this reason on the quotation.
                            </p>
                            <textarea
                              value={rejectModalReason}
                              onChange={(e) => setRejectModalReason(e.target.value)}
                              rows={4}
                              placeholder="Reason for rejection (required)"
                              className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-dark)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]/30"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isRejectSubmitting}
                                onClick={() => {
                                  setRejectModalQuotationId(null);
                                  setRejectModalReason("");
                                }}
                                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isRejectSubmitting ||
                                  rejectModalReason.trim().length === 0
                                }
                                onClick={async () => {
                                  if (!id || !rejectModalQuotationId) return;
                                  const reason = rejectModalReason.trim();
                                  if (!reason) return;
                                  setError("");
                                  setSuccess("");
                                  setIsRejectSubmitting(true);
                                  try {
                                    await apiFetch(
                                      `/api/v1/leads/${encodeURIComponent(
                                        id
                                      )}/quotations/${encodeURIComponent(
                                        rejectModalQuotationId
                                      )}/reject`,
                                      {
                                        method: "POST",
                                        body: JSON.stringify({
                                          rejection_reason: reason,
                                        }),
                                      }
                                    );
                                    setSuccess("Quotation rejected successfully.");
                                    setRejectModalQuotationId(null);
                                    setRejectModalReason("");
                                    await loadQuotations(id);
                                  } catch (err: any) {
                                    setError(
                                      err?.message ||
                                        "Failed to reject quotation. Please try again."
                                    );
                                  } finally {
                                    setIsRejectSubmitting(false);
                                  }
                                }}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isRejectSubmitting ? "Submitting…" : "Confirm reject"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">
                      No quotations found for this lead.
                    </p>
                  )}
                </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 sm:p-6 shadow-sm">
                {/* Booking summary & actions for Manager/GM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-dark)]">
                        Booking
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        View booking details submitted by Sales and confirm or cancel.
                      </p>
                    </div>
                    {isBookingLoading && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        Loading...
                      </span>
                    )}
                  </div>
                  {bookingSummary ? (
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-secondary)]">Status</p>
                        <p className="text-sm font-medium text-[var(--text-dark)]">
                          {bookingSummary.status || "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Final Deal Price
                        </p>
                        <p className="text-sm font-medium text-[var(--text-dark)]">
                          {bookingSummary.finalPrice != null
                            ? `₹${bookingSummary.finalPrice.toLocaleString("en-IN")}`
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-secondary)]">Token Amount</p>
                        <p className="text-sm font-medium text-[var(--text-dark)]">
                          {bookingSummary.tokenAmount != null
                            ? `₹${bookingSummary.tokenAmount.toLocaleString("en-IN")}`
                            : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!id) return;
                            setError("");
                            setSuccess("");
                            try {
                              await apiFetch(
                                `/api/v1/leads/${encodeURIComponent(
                                  id
                                )}/booking/confirm`,
                                { method: "POST" }
                              );
                              setSuccess("Booking confirmed successfully.");
                              await loadBookingSummary(id);
                            } catch (err: any) {
                              setError(
                                err?.message ||
                                  "Failed to confirm booking. Please try again."
                              );
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-[var(--primary-base)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
                        >
                          Confirm Booking
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!id) return;
                            setError("");
                            setSuccess("");
                            try {
                              await apiFetch(
                                `/api/v1/leads/${encodeURIComponent(
                                  id
                                )}/booking/cancel`,
                                { method: "POST" }
                              );
                              setSuccess("Booking cancelled successfully.");
                              await loadBookingSummary(id);
                            } catch (err: any) {
                              setError(
                                err?.message ||
                                  "Failed to cancel booking. Please try again."
                              );
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">
                      No booking has been created for this lead yet.
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                    <p className="text-xs font-semibold text-[var(--text-dark)] mb-2">
                      Sales booking documents (B2)
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      Files uploaded from the booking flow; links are temporary
                      signed URLs.
                    </p>
                    {isBookingDocumentsLoading ? (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Loading…
                      </p>
                    ) : bookingDocuments.length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)]">
                        No documents uploaded yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {bookingDocuments.map((d) => (
                          <li
                            key={d.id}
                            className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-neutral)] px-3 py-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-[var(--text-dark)] capitalize">
                                {d.document_type.replace(/_/g, " ")}
                              </span>
                              {d.quotation_id ? (
                                <span className="text-[10px] text-[var(--text-secondary)]">
                                  Quotation: {d.quotation_id.slice(0, 8)}…
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[var(--text-secondary)] truncate mt-0.5">
                              {d.document_name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {d.document_front_photo_url &&
                              d.document_front_photo_url.startsWith("http") ? (
                                <a
                                  href={d.document_front_photo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-[var(--primary-base)] hover:underline"
                                >
                                  View file
                                </a>
                              ) : null}
                              {d.document_back_photo_url &&
                              d.document_back_photo_url.startsWith("http") ? (
                                <a
                                  href={d.document_back_photo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-[var(--primary-base)] hover:underline"
                                >
                                  View back
                                </a>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={18} className="text-[var(--primary-base)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-dark)]">Lead Summary</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Budget" value={formatBudget(lead.budget_min, lead.budget_max)} />
                    <InfoRow label="Project Title" value={lead.project_title || "N/A"} />
                    <InfoRow label="Project ID" value={lead.project_id || "N/A"} />
                    <InfoRow label="Assigned Type" value={lead.assigned_to_user_type || "N/A"} />
                    <InfoRow label="Assigned At" value={formatDate(lead.assigned_at)} />
                    <InfoRow label="Sales Accepted At" value={formatDate(lead.sales_accepted_at)} />
                    <InfoRow label="Tags" value={lead.tags?.length ? lead.tags.join(", ") : "N/A"} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarClock size={18} className="text-[var(--primary-base)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-dark)]">Quick Info</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Lead ID" value={lead.id} />
                    <InfoRow label="Organization ID" value={lead.organization_id} />
                    <InfoRow label="Source Detail" value={lead.source_detail || "N/A"} />
                    <InfoRow label="Created" value={formatDate(lead.created_at)} />
                    <InfoRow label="Updated" value={formatDate(lead.updated_at)} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const displayValue = looksLikeUuid ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

  const canCopy = value.trim().length > 0;
  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors (permissions / unsupported)
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--border-color)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className="text-[var(--text-dark)] font-medium text-right break-all"
          title={looksLikeUuid ? value : undefined}
        >
          {displayValue}
        </span>
        {looksLikeUuid && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] bg-white px-2 py-1 text-xs font-medium text-[var(--text-dark)] hover:bg-[var(--hover-bg)]"
            aria-label={`Copy ${label}`}
          >
            <Copy size={14} />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </span>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, MapPin, Buildings, Tag, User, Phone, Envelope, ShieldCheck, Star, Sparkle, Shield, Pencil, ShareNetwork } from "phosphor-react";
import { PriceBreakdownCard } from "../../../components/ui/card/priceBreakdownCard";
import type { QuotationData } from "../../../components/ui/card/quotationCard";
import { apiFetch } from "../../../lib/apiClient";
import {
  fetchProjectById,
  formatAreaType,
  formatPossessionDate,
  projectToCardProps,
  type ProjectDetailApi,
} from "../../../lib/projectDetailApi";
import { formatPriceBand } from "../../../lib/projectInventoryProjects";

type ApiOk<T> = { success?: boolean; data?: T };
type PriceLine = { label?: string; amount?: number | null };

type QuotationApi = {
  id: string;
  lead_id: string;
  project_id?: string | null;
  unit_id?: string | null;
  addon_ids?: string[];
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
  additional_charges?: PriceLine[];
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

type QuotationListLookupApi = {
  quotation_id?: string;
  lead_id?: string;
  quotation_status?: string;
  created_at?: string;
  final_price?: number;
  project_title?: string;
  project_cover_photo_url?: string | null;
  project_type?: string;
  project_status?: string;
  city?: string | null;
  state?: string | null;
  minimum_unit_price?: number | null;
  maximum_unit_price?: number | null;
  unit_name?: string;
  wing?: string | null;
  floor?: number | null;
  carpet_area?: number | null;
  unit_type?: string;
  customer_name?: string | null;
  customer_contact?: string | null;
  customer_email?: string | null;
};

type ProjectSearchResultApi = {
  id?: string;
  project_title?: string;
  city?: string | null;
  state?: string | null;
};

type UnitApi = {
  id: string;
  name?: string;
  floor?: number | null;
  wing?: string | null;
  unit_type?: string;
  carpet_area?: number | null;
};

type AuthStateLocal = {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
};

type LeadQuotationListItem = {
  id: string;
  quotation_status?: string;
  quotation_version?: number;
  customer_name?: string | null;
  created_at?: string;
};

function pick(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function formatInrAmount(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatFloorLabel(floor: number | null | undefined): string {
  if (floor == null || Number.isNaN(floor)) return "N/A";
  const x = Math.trunc(floor);
  const mod10 = Math.abs(x) % 10;
  const mod100 = Math.abs(x) % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  return `${x}${suffix} Floor`;
}

function formatUnitTypeLabel(x?: string): string {
  const raw = (x ?? "").trim();
  if (!raw) return "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchQuotationById(leadId: string, quotationId: string): Promise<QuotationApi> {
  const res = await apiFetch<ApiOk<{ quotation?: QuotationApi }>>(
    `/api/v1/leads/${encodeURIComponent(leadId)}/quotations/${encodeURIComponent(quotationId)}`
  );
  const q = res.data?.quotation;
  if (!q?.id) {
    throw new Error("Quotation not found");
  }
  return q;
}

async function fetchQuotationFromLeadList(
  leadId: string,
  quotationId: string
): Promise<QuotationApi | null> {
  const res = await apiFetch<ApiOk<{ quotations?: QuotationApi[] }>>(
    `/api/v1/leads/${encodeURIComponent(leadId)}/quotations?page=1&limit=100`
  );
  const rows = res.data?.quotations ?? [];
  const found = rows.find((x) => x.id === quotationId);
  return found ?? null;
}

async function fetchLeadQuotationHistory(
  leadId: string
): Promise<LeadQuotationListItem[]> {
  const res = await apiFetch<ApiOk<{ quotations?: LeadQuotationListItem[] }>>(
    `/api/v1/leads/${encodeURIComponent(leadId)}/quotations?page=1&limit=50`
  );
  return res.data?.quotations ?? [];
}

async function resolveLeadIdFromQuotationId(
  quotationId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    page: "1",
    limit: "20",
    q: quotationId,
  });
  const res = await apiFetch<ApiOk<{ quotations?: QuotationListLookupApi[] }>>(
    `/api/v1/quotations?${params.toString()}`
  );
  const rows = res.data?.quotations ?? [];
  const exact = rows.find((r) => r.quotation_id === quotationId);
  const picked = exact ?? rows[0];
  const lead = picked?.lead_id?.trim();
  return lead || null;
}

async function fetchQuotationRowFromOrgList(
  quotationId: string
): Promise<QuotationListLookupApi | null> {
  const params = new URLSearchParams({
    page: "1",
    limit: "20",
    q: quotationId,
    tab: "all",
    sort: "date",
    order: "desc",
  });
  const res = await apiFetch<ApiOk<{ quotations?: QuotationListLookupApi[] }>>(
    `/api/v1/quotations?${params.toString()}`
  );
  const rows = res.data?.quotations ?? [];
  const exact = rows.find((r) => r.quotation_id === quotationId);
  return exact ?? rows[0] ?? null;
}

async function searchProjectByTitle(
  query: string
): Promise<ProjectDetailApi | null> {
  const q = query.trim();
  if (!q) return null;
  const params = new URLSearchParams({ q, limit: "5" });
  const res = await apiFetch<
    ApiOk<{ results?: ProjectSearchResultApi[] }>
  >(`/api/v1/projects/search?${params.toString()}`);
  const results = res.data?.results ?? [];
  const first = results[0];
  const id = first?.id?.trim();
  if (!id) return null;
  try {
    return await fetchProjectById(id);
  } catch {
    return null;
  }
}

async function fetchUnitById(projectId: string, unitId: string): Promise<UnitApi | null> {
  const res = await apiFetch<ApiOk<UnitApi>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}`
  );
  return res.data?.id ? res.data : null;
}

const categoryColors = {
  Residential: "bg-[#E8F5E9] text-[#2E7D32]",
  Mixed: "bg-[#FFF9C4] text-[#FBC02D]",
  Commercial: "bg-[#E8EAF6] text-[#3F51B5]",
};

const statusColors = {
  Ongoing: "bg-[#FFE0B2] text-[#E65100]",
  Upcoming: "bg-[#FFE0B2] text-[#E65100]",
  "Ready Move": "bg-[#E8F5E9] text-[#2E7D32]",
};

function statusPillClass(status: QuotationData["status"]): string {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "draft") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function humanQuotationNumber(id: string, version?: number): string {
  const short = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  if (typeof version === "number" && Number.isFinite(version) && version > 0) {
    return `QT-${short}-V${version}`;
  }
  return `QT-${short}`;
}

function QuotationDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("id");
  const leadIdParam = searchParams.get("leadId");
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [rawQuotation, setRawQuotation] = useState<QuotationApi | null>(null);
  const [quotationHistory, setQuotationHistory] = useState<LeadQuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClientEditOpen, setIsClientEditOpen] = useState(false);
  const [isClientEditSaving, setIsClientEditSaving] = useState(false);
  const [isPriceEditOpen, setIsPriceEditOpen] = useState(false);
  const [isPriceEditSaving, setIsPriceEditSaving] = useState(false);
  const [clientForm, setClientForm] = useState({
    customer_name: "",
    customer_contact: "",
    customer_email: "",
  });
  const [priceForm, setPriceForm] = useState({
    base_price: "",
    parking_price: "",
    discount_name: "",
    discount_price: "",
    valid_till: "",
  });

  const loadQuotationDetail = useCallback(async () => {
    if (!quotationId) {
      setError("Missing quotation id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Start from org-level row first: avoids noisy 500 from broken single-detail endpoint.
      const row = await fetchQuotationRowFromOrgList(quotationId);
      if (!row?.quotation_id) {
        throw new Error("Failed to get quotation");
      }
      let effectiveLeadId =
        row.lead_id?.trim() || leadIdParam?.trim() || "";
      if (!effectiveLeadId) {
        effectiveLeadId = (await resolveLeadIdFromQuotationId(quotationId)) ?? "";
      }
      if (!effectiveLeadId) {
        throw new Error("Unable to resolve lead id for this quotation.");
      }

      const floorText =
        row.floor != null && Number.isFinite(row.floor)
          ? formatFloorLabel(row.floor)
          : "N/A";
      const rowCarpet =
        row.carpet_area != null && Number.isFinite(row.carpet_area)
          ? `${row.carpet_area} sq.ft.`
          : "N/A";
      const configLabel = [formatUnitTypeLabel(row.unit_type), rowCarpet !== "N/A" ? rowCarpet : ""]
        .filter(Boolean)
        .join(" - ");

      let project: ProjectDetailApi | null = null;
      // Without project_id from org list response, prefer list-derived fields for stable render.
      // Keep project fetch optional only if we can infer id from single-quotation endpoint via lead list.
      let q: QuotationApi | null = null;
      try {
        q = await fetchQuotationFromLeadList(effectiveLeadId, quotationId);
      } catch {
        q = null;
      }

      const projectId = q?.project_id?.trim() || "";
      const unitId = q?.unit_id?.trim() || "";

      let unit: UnitApi | null = null;

      if (projectId) {
        try {
          project = await fetchProjectById(projectId);
        } catch {
          project = null;
        }
      } else if (row.project_title?.trim()) {
        // When quotation detail endpoint is unstable and project_id is unavailable,
        // enrich card by searching project with title from org quotation list row.
        try {
          project = await searchProjectByTitle(row.project_title);
        } catch {
          project = null;
        }
      }
      if (projectId && unitId) {
        try {
          unit = await fetchUnitById(projectId, unitId);
        } catch {
          unit = null;
        }
      }

      const unitChargeRows: Array<{ label: string; amount: number }> = q
        ? [
            { label: "Property Base Price", amount: pick(q.base_price) },
            { label: "Parking", amount: pick(q.parking_price) },
            { label: "Infrastructure Cost", amount: pick(q.infrastructure_cost) },
            { label: "Development Charges", amount: pick(q.development_charges) },
            { label: "Water Charges", amount: pick(q.water_charges) },
            { label: "MSEB Charges", amount: pick(q.mseb_charges) },
            { label: "Legal Charges", amount: pick(q.legal_charges) },
            { label: "Stamp Duty", amount: pick(q.stamp_duty) },
            { label: "Registration Fee", amount: pick(q.registration_fee) },
            { label: "GST", amount: pick(q.gst) },
            { label: "VAT", amount: pick(q.vat) },
            { label: "One-Time Maintenance", amount: pick(q.one_time_maintenance) },
          ].filter((x) => x.amount > 0)
        : [];

      const additionalRows = q
        ? q.additional_charges?.map((x) => ({
            label: (x.label ?? "").trim() || "Additional Charge",
            amount: pick(x.amount),
          })).filter((x) => x.amount > 0) ?? []
        : [];

      const discountAmt = q ? pick(q.discount_price) : 0;
      const breakdown =
        unitChargeRows.length > 0 || additionalRows.length > 0
          ? [
              ...unitChargeRows.map((x) => ({
                label: x.label,
                amount: x.amount,
                isDiscount: false,
              })),
              ...additionalRows.map((x) => ({
                label: x.label,
                amount: x.amount,
                isDiscount: false,
              })),
            ]
          : [{ label: "Final Price", amount: pick(row.final_price), isDiscount: false }];
      if (discountAmt > 0) {
        breakdown.push({
          label: `Discount${q?.discount_name ? ` (${q.discount_name})` : ""}`,
          amount: discountAmt,
          isDiscount: true,
        });
      }

      const subtotal =
        unitChargeRows.length > 0 || additionalRows.length > 0
          ? [...unitChargeRows, ...additionalRows].reduce((acc, cur) => acc + cur.amount, 0)
          : pick(row.final_price);
      const finalPrice =
        unitChargeRows.length > 0 || additionalRows.length > 0
          ? Math.max(0, subtotal - discountAmt)
          : pick(row.final_price);

      let authName = "Sales User";
      let authEmail = "N/A";
      let authPhone = "N/A";
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("authState");
          if (raw) {
            const parsed = JSON.parse(raw) as AuthStateLocal;
            authName = parsed.user?.name?.trim() || authName;
            authEmail = parsed.user?.email?.trim() || authEmail;
            authPhone = parsed.user?.phone?.trim() || authPhone;
          }
        } catch {
          // ignore local parse failures
        }
      }

      const cardProject = project ? projectToCardProps(project) : null;
      const carpet = unit?.carpet_area != null ? `${unit.carpet_area} sq.ft.` : "N/A";
      const typeLabel = formatUnitTypeLabel(unit?.unit_type);
      const configuration = [typeLabel, carpet !== "N/A" ? carpet : ""].filter(Boolean).join(" - ");
      const rowConfiguration = configLabel;

      const mapped: QuotationData = {
        id: quotationId,
        leadId: effectiveLeadId,
        status:
          row.quotation_status === "approved"
            ? "approved"
            : row.quotation_status === "draft"
              ? "draft"
              : "pending",
        project: {
          name: cardProject?.name || row.project_title?.trim() || "Project",
          image: cardProject?.image || row.project_cover_photo_url?.trim() || "/property-1 1.png",
          location:
            cardProject?.location ||
            [row.city?.trim(), row.state?.trim()].filter(Boolean).join(" - ") ||
            "N/A",
          configuration:
            configuration ||
            rowConfiguration ||
            cardProject?.configuration ||
            "N/A",
          priceRange:
            cardProject?.priceRange ||
            formatPriceBand(
              row.minimum_unit_price ?? null,
              row.maximum_unit_price ?? null
            ) ||
            formatPriceBand(project?.minimum_unit_price ?? null, project?.maximum_unit_price ?? null) ||
            "N/A",
          category: cardProject?.category || "Residential",
          status: cardProject?.status || "Ongoing",
          features: cardProject?.features || [],
        },
        allocatedFlat: {
          wing: unit?.wing?.trim() || row.wing?.trim() || "N/A",
          flatNo: unit?.name?.trim() || row.unit_name?.trim() || "N/A",
          floor:
            unit != null
              ? formatFloorLabel(unit.floor)
              : floorText,
          reraCarpetArea:
            unit?.carpet_area != null ? `${unit.carpet_area} sq.ft.` : rowCarpet,
        },
        priceBreakdown: breakdown,
        finalPrice,
        assignedRepresentative: {
          salesPerson: authName,
          contactNo: authPhone,
          email: authEmail,
          channelPartner: "N/A",
        },
        clientInfo: {
          customerName: q?.customer_name?.trim() || row.customer_name?.trim() || "N/A",
          contactNo: q?.customer_contact?.trim() || row.customer_contact?.trim() || "N/A",
          email: q?.customer_email?.trim() || row.customer_email?.trim() || "N/A",
        },
        projectSnapshot: project
          ? {
              areaType: formatAreaType(project.area_type),
              reraNumber: project.rera_number?.trim() || "N/A",
              possessionDate: formatPossessionDate(project.expected_possession_date),
            }
          : undefined,
        createdAt: q?.created_at || row.created_at || new Date().toISOString(),
      };

      setRawQuotation(
        q ?? {
          id: quotationId,
          lead_id: effectiveLeadId,
          quotation_status: row.quotation_status || "draft",
          quotation_version: 1,
          created_at: row.created_at || new Date().toISOString(),
          project_id: projectId || undefined,
          unit_id: unitId || undefined,
          customer_name: row.customer_name ?? undefined,
          customer_contact: row.customer_contact ?? undefined,
          customer_email: row.customer_email ?? undefined,
        }
      );
      try {
        setQuotationHistory(await fetchLeadQuotationHistory(effectiveLeadId));
      } catch {
        setQuotationHistory([]);
      }
      setQuotation(mapped);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to load quotation details.";
      setError(msg);
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  }, [leadIdParam, quotationId]);

  useEffect(() => {
    void loadQuotationDetail();
  }, [loadQuotationDetail]);

  const markShared = async (
    sharedViaInput: "whatsapp" | "email" | "pdf_download"
  ) => {
    if (!quotationId || !quotation?.leadId) return;
    await apiFetch(
      `/api/v1/leads/${encodeURIComponent(quotation.leadId)}/quotations/${encodeURIComponent(quotationId)}/share`,
      {
        method: "POST",
        body: { shared_via: sharedViaInput },
      }
    );
    await loadQuotationDetail();
  };

  const handleShare = async (
    sharedViaInput: "whatsapp" | "email" | "pdf_download"
  ) => {
    if (!quotationId || !quotation?.leadId) return;
    try {
      const deepLink = `${window.location.origin}/quotation/quotation-detail?id=${encodeURIComponent(
        quotationId
      )}&leadId=${encodeURIComponent(quotation.leadId)}`;
      const readableNo = humanQuotationNumber(
        quotation.id,
        rawQuotation?.quotation_version
      );

      if (sharedViaInput === "whatsapp") {
        const text = encodeURIComponent(
          `Quotation ${readableNo}\nCustomer: ${quotation.clientInfo.customerName}\nAmount: ${formatInrAmount(
            quotation.finalPrice
          )}\nView: ${deepLink}`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      } else if (sharedViaInput === "email") {
        const subject = encodeURIComponent(`Quotation ${readableNo}`);
        const body = encodeURIComponent(
          `Please review quotation details.\n\nQuotation: ${readableNo}\nCustomer: ${quotation.clientInfo.customerName}\nAmount: ${formatInrAmount(
            quotation.finalPrice
          )}\nLink: ${deepLink}`
        );
        window.location.href = `mailto:${quotation.clientInfo.email === "N/A" ? "" : quotation.clientInfo.email}?subject=${subject}&body=${body}`;
      } else {
        window.print();
      }

      await markShared(sharedViaInput);
      window.alert("Quotation share status updated.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to share quotation.";
      window.alert(msg);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!quotation?.leadId || !rawQuotation?.unit_id) return;
    try {
      const res = await apiFetch<ApiOk<{ quotation?: { id?: string } }>>(
        `/api/v1/leads/${encodeURIComponent(quotation.leadId)}/quotations`,
        {
          method: "POST",
          body: {
            project_id: rawQuotation.project_id ?? undefined,
            unit_id: rawQuotation.unit_id,
            addon_ids: rawQuotation.addon_ids ?? [],
            discount_name: rawQuotation.discount_name ?? undefined,
            discount_price: rawQuotation.discount_price ?? undefined,
            customer_name: rawQuotation.customer_name ?? undefined,
            customer_contact: rawQuotation.customer_contact ?? undefined,
            customer_email: rawQuotation.customer_email ?? undefined,
            valid_till: rawQuotation.valid_till ?? undefined,
          },
        }
      );
      const newId = res.data?.quotation?.id;
      window.alert("New quotation version created.");
      if (newId) {
        router.push(
          `/quotation/quotation-detail?id=${encodeURIComponent(newId)}&leadId=${encodeURIComponent(
            quotation.leadId
          )}`
        );
        return;
      }
      await loadQuotationDetail();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to create new quotation version.";
      window.alert(msg);
    }
  };

  const openPriceEditModal = () => {
    if (!rawQuotation) return;
    setPriceForm({
      base_price:
        rawQuotation.base_price != null ? String(rawQuotation.base_price) : "",
      parking_price:
        rawQuotation.parking_price != null ? String(rawQuotation.parking_price) : "",
      discount_name: rawQuotation.discount_name ?? "",
      discount_price:
        rawQuotation.discount_price != null ? String(rawQuotation.discount_price) : "",
      valid_till: rawQuotation.valid_till ?? "",
    });
    setIsPriceEditOpen(true);
  };

  const savePriceFromModal = async () => {
    if (!quotationId || !quotation?.leadId) return;
    setIsPriceEditSaving(true);
    try {
      const basePrice = Number(priceForm.base_price.trim());
      const parkingPrice = Number(priceForm.parking_price.trim());
      const discountPrice = Number(priceForm.discount_price.trim());
      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(quotation.leadId)}/quotations/${encodeURIComponent(
          quotationId
        )}`,
        {
          method: "PATCH",
          body: {
            base_price:
              priceForm.base_price.trim() === ""
                ? undefined
                : Number.isFinite(basePrice)
                  ? basePrice
                  : undefined,
            parking_price:
              priceForm.parking_price.trim() === ""
                ? undefined
                : Number.isFinite(parkingPrice)
                  ? parkingPrice
                  : undefined,
            discount_name: priceForm.discount_name.trim() || undefined,
            discount_price:
              priceForm.discount_price.trim() === ""
                ? undefined
                : Number.isFinite(discountPrice)
                  ? discountPrice
                  : undefined,
            valid_till: priceForm.valid_till.trim() || undefined,
          },
        }
      );
      setIsPriceEditOpen(false);
      await loadQuotationDetail();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to update quotation pricing.";
      window.alert(msg);
    } finally {
      setIsPriceEditSaving(false);
    }
  };

  const openClientEditModal = () => {
    if (!quotation) return;
    setClientForm({
      customer_name:
        quotation.clientInfo.customerName === "N/A"
          ? ""
          : quotation.clientInfo.customerName,
      customer_contact:
        quotation.clientInfo.contactNo === "N/A" ? "" : quotation.clientInfo.contactNo,
      customer_email:
        quotation.clientInfo.email === "N/A" ? "" : quotation.clientInfo.email,
    });
    setIsClientEditOpen(true);
  };

  const saveClientInfoFromModal = async () => {
    if (!quotationId || !quotation?.leadId) return;
    setIsClientEditSaving(true);
    try {
      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(quotation.leadId)}/quotations/${encodeURIComponent(
          quotationId
        )}`,
        {
          method: "PATCH",
          body: {
            customer_name: clientForm.customer_name.trim() || undefined,
            customer_contact: clientForm.customer_contact.trim() || undefined,
            customer_email: clientForm.customer_email.trim() || undefined,
          },
        }
      );
      setIsClientEditOpen(false);
      await loadQuotationDetail();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to update client information.";
      window.alert(msg);
    } finally {
      setIsClientEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-base)] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (!quotation || error) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {error || "Quotation Not Found"}
          </h2>
          <button
            onClick={() => router.push("/quotation")}
            className="px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6 xl:mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Quotation Detail</h1>
        </div>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">Quotation Number</p>
              <p className="text-sm font-semibold text-slate-900 break-all">
                {humanQuotationNumber(quotation.id, rawQuotation?.quotation_version)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusPillClass(
                quotation.status
              )}`}
            >
              {quotation.status || "pending"}
            </span>
          </div>
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Project Detail */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">Project Detail</h2>
              <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden mb-3">
                <Image
                  src={quotation.project.image}
                  alt={quotation.project.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 60vw"
                  unoptimized={
                    typeof quotation.project.image === "string" &&
                    quotation.project.image.startsWith("http")
                  }
                />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2.5">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-base)]">
                  {quotation.project.name}
                </h3>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                  <span
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                      categoryColors[quotation.project.category as keyof typeof categoryColors] || categoryColors.Residential
                    }`}
                  >
                    {quotation.project.category}
                  </span>
                  <span
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                      statusColors[quotation.project.status as keyof typeof statusColors] || statusColors.Ongoing
                    }`}
                  >
                    {quotation.project.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mb-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} weight="regular" />
                  <span>{quotation.project.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Buildings size={16} weight="regular" />
                  <span>{quotation.project.configuration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag size={16} weight="regular" />
                  <span>{quotation.project.priceRange}</span>
                </div>
              </div>

              {quotation.project.features && quotation.project.features.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {quotation.project.features.map((feature: string, index: number) => (
                    <span
                      key={index}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Allocated Flat Info */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-2.5 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Allocated Flat Info</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Buildings size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Wing</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.allocatedFlat.wing || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Flat No</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.allocatedFlat.flatNo || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkle size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Floor</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.allocatedFlat.floor || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">RERA Carpet Area</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.allocatedFlat.reraCarpetArea || "N/A"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Price Breakdown */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <PriceBreakdownCard
                items={quotation.priceBreakdown}
                finalPrice={quotation.finalPrice}
                onEdit={openPriceEditModal}
              />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="py-2.5 px-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ShareNetwork size={16} weight="regular" />
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare("email")}
                  className="py-2.5 px-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ShareNetwork size={16} weight="regular" />
                  Email
                </button>
                <button
                  onClick={() => handleShare("pdf_download")}
                  className="py-2.5 px-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ShareNetwork size={16} weight="regular" />
                  PDF
                </button>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Assigned Representative */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">Assigned Representative</h2>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Sales Person</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.assignedRepresentative.salesPerson || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Contact No</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.assignedRepresentative.contactNo || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">{quotation.assignedRepresentative.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Channel Partner</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.assignedRepresentative.channelPartner || "N/A"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Client Information */}
            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-2.5 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Client Information</h2>
                <button
                  onClick={openClientEditModal}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={14} className="text-[var(--primary-base)]" weight="regular" />
                </button>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Customer Name</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.clientInfo.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Contact No</p>
                    <p className="text-sm font-semibold text-slate-900">{quotation.clientInfo.contactNo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={18} weight="regular" className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">{quotation.clientInfo.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Snapshot */}
            {quotation.projectSnapshot && (
              <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">Project Snapshot</h2>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Buildings size={18} weight="regular" className="text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Area Type</p>
                      <p className="text-sm font-semibold text-slate-900">{quotation.projectSnapshot.areaType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Shield size={18} weight="regular" className="text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">RERA Number</p>
                      <p className="text-sm font-semibold text-slate-900 break-all">{quotation.projectSnapshot.reraNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Tag size={18} weight="regular" className="text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Possession Date</p>
                      <p className="text-sm font-semibold text-slate-900">{quotation.projectSnapshot.possessionDate}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-2.5 sm:mb-3 text-slate-900">
                Quotation Versions (Lead)
              </h2>
              {quotationHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No quotation versions found.</p>
              ) : (
                <ul className="space-y-2">
                  {quotationHistory.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 break-all">{row.id}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString("en-IN")
                            : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                          {row.quotation_status || "draft"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            row.id !== quotation.id &&
                            quotation.leadId &&
                            router.push(
                              `/quotation/quotation-detail?id=${encodeURIComponent(
                                row.id
                              )}&leadId=${encodeURIComponent(quotation.leadId)}`
                            )
                          }
                          className="text-xs font-semibold text-[var(--primary-base)] hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {isClientEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Update Client Information
              </h3>
              <button
                type="button"
                onClick={() => setIsClientEditOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={clientForm.customer_name}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, customer_name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={clientForm.customer_contact}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, customer_contact: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter contact number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={clientForm.customer_email}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, customer_email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClientEditOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isClientEditSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClientInfoFromModal}
                className="rounded-lg bg-[var(--primary-base)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                disabled={isClientEditSaving}
              >
                {isClientEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPriceEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Update Price Breakdown
              </h3>
              <button
                type="button"
                onClick={() => setIsPriceEditOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Base Price
                </label>
                <input
                  type="number"
                  value={priceForm.base_price}
                  onChange={(e) =>
                    setPriceForm((p) => ({ ...p, base_price: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter base price"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Parking Price
                </label>
                <input
                  type="number"
                  value={priceForm.parking_price}
                  onChange={(e) =>
                    setPriceForm((p) => ({ ...p, parking_price: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter parking price"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Discount Name
                </label>
                <input
                  type="text"
                  value={priceForm.discount_name}
                  onChange={(e) =>
                    setPriceForm((p) => ({ ...p, discount_name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter discount reason"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Discount Price
                </label>
                <input
                  type="number"
                  value={priceForm.discount_price}
                  onChange={(e) =>
                    setPriceForm((p) => ({ ...p, discount_price: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  placeholder="Enter discount amount"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Valid Till
                </label>
                <input
                  type="date"
                  value={priceForm.valid_till}
                  onChange={(e) =>
                    setPriceForm((p) => ({ ...p, valid_till: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPriceEditOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isPriceEditSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePriceFromModal}
                className="rounded-lg bg-[var(--primary-base)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                disabled={isPriceEditSaving}
              >
                {isPriceEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuotationDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-base)] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading quotation...</p>
        </div>
      </div>
    }>
      <QuotationDetailContent />
    </Suspense>
  );
}

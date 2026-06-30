"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, ChatCircle, PaperPlaneTilt, Microphone, X, Buildings, MapPin, Calendar, LinkSimple, Download, Trash, ArrowClockwise, Plus, User, Envelope, CaretDown, CaretUp, SlidersHorizontal, Check } from "phosphor-react";
import { RemarksSection } from "../../../../../../components/ui/remarksSection";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { ProjectCard } from "../../../../../../components/ui/card/projectCard";
import { PriceBreakdownItem } from "../../../../../../components/ui/card/priceBreakdownCard";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import Image from "next/image";
import { apiFetch } from "../../../../../../lib/apiClient";
import { getLeadSummary } from "../../../../../../lib/leads";
import type { LeadResponse, LeadSummary } from "../../../../../../lib/leads";
import { StatusType } from "../../../../../../components/ui/badges";
import { toast } from "sonner";
import { useAppSelector } from "../../../../../../store/hooks";

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  sent: boolean;
}

interface Property {
  id: number;
  name: string;
  location: string;
  tags: string[];
  image: string;
  backendId?: string; // project id (for fetching units)
}


interface Unit {
  backendId: string;
  displayId: string;
  status: "available" | "booked" | "selected";
}

interface FollowUpData {
  id: number;
  backendId?: string;
  fullName: string;
  avatar: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
}

export default function NegotiationOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const userType = useAppSelector((state) => state.auth.user?.user_type);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const effectiveUserType = hasMounted ? userType : undefined;
  const isSalesUser = effectiveUserType === "sales";
  const isManagerUser =
    effectiveUserType === "manager" ||
    effectiveUserType === "general-manager" ||
    (effectiveUserType as string | undefined) === "general_manager";
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [newRemark, setNewRemark] = useState("");
  const [isDiscountDrawerOpen, setIsDiscountDrawerOpen] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Follow-ups table data (real backend)
  const [followUpsData, setFollowUpsData] = useState<FollowUpData[]>([]);
  const refreshFollowUps = async () => {
    if (!leadId) return;
    try {
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(
          leadId
        )}/stages/by-type/negotiation`
      );
      const apiFollowUps: Array<any> = res.data?.follow_ups ?? [];
      if (!Array.isArray(apiFollowUps) || apiFollowUps.length === 0) {
        setFollowUpsData([]);
        return;
      }

      const mapped: FollowUpData[] = apiFollowUps.map((f, index) => {
        const d = f.followup_date ? new Date(f.followup_date) : null;
        const dateStr = d ? d.toLocaleDateString() : "";
        const timeStr = d
          ? d.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        const statusRaw = (f.status || "").toLowerCase();
        const status: FollowUpData["status"] =
          statusRaw === "completed"
            ? "completed"
            : statusRaw === "missed"
              ? "missed"
              : "pending";

        const remarkText = (f.remark ?? "").trim();

        return {
          id: index + 1,
          backendId: f.id,
          fullName: remarkText || "Follow-up",
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(String(f.id ?? index))}`,
          date: dateStr,
          time: timeStr,
          status,
        };
      });

      setFollowUpsData(mapped);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[NegotiationOverview] Failed to load follow-ups", err);
      setFollowUpsData([]);
    }
  };

  useEffect(() => {
    if (!leadId) return;
    // Load follow-ups for current negotiation stage.
    void refreshFollowUps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Discount form state
  const [discountForm, setDiscountForm] = useState({
    companyDiscount: "75000",
    yourCommission: "100000",
    extraDiscount: "25000",
    reason: "Client mentioned a similar project nearby offering lower pricing. Giving this discount helps us stay competitive and close the deal.",
  });

  // Calculate remaining commission and total discount
  const remainingCommission = Math.max(0, parseInt(discountForm.yourCommission) - parseInt(discountForm.extraDiscount));
  const totalDiscount = parseInt(discountForm.companyDiscount) + parseInt(discountForm.extraDiscount);

  type LeadByIdBackend = {
    success: boolean;
    message: string;
    data: {
      lead: LeadResponse;
    };
  };

  // Lead data (Lead Profile card)
  const [leadData, setLeadData] = useState<{
    id: number;
    name: string;
    phone: string;
    email: string;
    avatar: string;
    budget: string;
    propertyName: string;
    timeAgo: string;
    location: string;
    status: StatusType;
    source: string;
    projectId: string | null;
  }>(() => ({
    id: 1,
    name: "—",
    phone: "—",
    email: "",
    avatar: "https://i.pravatar.cc/150?u=lead",
    budget: "—",
    propertyName: "—",
    timeAgo: "—",
    location: "—",
    status: "cold",
    source: "—",
    projectId: null,
  }));

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        const res = await apiFetch<LeadByIdBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}`
        );
        const lead = res.data.lead;

        const status: StatusType =
          (lead.lead_temperature as StatusType | null) ?? "cold";

        const budget =
          lead.budget_min != null && lead.budget_max != null
            ? `₹${lead.budget_min}L - ₹${lead.budget_max}L`
            : lead.budget_min != null
              ? `₹${lead.budget_min}L`
              : lead.budget_max != null
                ? `Up to ₹${lead.budget_max}L`
                : "N/A";

        setLeadData({
          id: 1,
          name: lead.name ?? "—",
          phone: lead.phone ?? "—",
          email: lead.email ?? "",
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(
            lead.id ?? leadId
          )}`,
          budget,
          propertyName: lead.project_title ?? "—",
          timeAgo: lead.created_at
            ? new Date(lead.created_at).toLocaleString()
            : "—",
          location: lead.city ?? "—",
          status,
          source: lead.source ?? "—",
          projectId: lead.project_id ?? null,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[NegotiationOverview] Failed to load lead profile",
          err
        );
      }
    };

    void run();
  }, [leadId]);

  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        // Prefer real property-visit projects (can be multiple).
        const stageRes = await apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/property_visit`
        );
        const apiVisits: Array<{ project_id?: string | null }> =
          stageRes.data?.visits ?? [];

        const projectIds = Array.from(
          new Set(
            apiVisits
              .map((v) => v.project_id ?? null)
              .filter((x): x is string => typeof x === "string" && x.length > 0)
          )
        );

        // Fallback: interested_property from summary (single project).
        if (projectIds.length === 0) {
          const summary: LeadSummary = await getLeadSummary(leadId);
          const interested = summary.interested_property;
          if (interested?.project_id) {
            projectIds.push(interested.project_id);
          }
        }

        if (projectIds.length === 0) {
          setProperties([]);
          return;
        }

        const projectResponses = await Promise.all(
          projectIds.map((pid) =>
            apiFetch<any>(`/api/v1/projects/${encodeURIComponent(pid)}`)
          )
        );

        const mapped: Property[] = projectResponses.map((res, idx) => {
          const p = res.data ?? {};
          const image =
            p.project_cover_photo_url ||
            p.project_exterior_images_urls?.[0] ||
            p.project_interior_images_urls?.[0] ||
            "https://i.pravatar.cc/150?u=project";

          const city = p.city ?? "";
          const state = p.state ?? "";
          const fullAddress = p.full_address ?? "";
          const location = fullAddress
            ? String(fullAddress)
            : [city, state].filter(Boolean).join(" - ") || "—";

          const tags: string[] = Array.isArray(p.amenities) ? p.amenities : [];

          return {
            id: idx + 1,
            name: p.project_title ?? "—",
            location,
            tags,
            image,
            backendId: projectIds[idx],
          };
        });

        setProperties(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[NegotiationOverview] Failed to load selected properties", err);
        setProperties([]);
      }
    };

    void run();
  }, [leadId]);

  // Units fetch (real backend values) for the selected project(s).
  useEffect(() => {
    const run = async () => {
      const projectId = properties[0]?.backendId;
      if (!projectId) {
        setUnits([]);
        return;
      }

      try {
        const res = await apiFetch<any>(
          `/api/v1/projects/${encodeURIComponent(projectId)}/units?page=1&limit=200`
        );
        const apiUnits: Array<{
          id?: string;
          unit_code?: string | null;
          name?: string;
          status?: string;
        }> = res.data?.units ?? [];

        const mapped: Unit[] = apiUnits.map((u) => {
          const unitCode = u.unit_code ?? u.name ?? "";
          const backendStatus = (u.status ?? "").toLowerCase();

          // Backend statuses:
          // available | under_negotiation | booked | unavailable | not_for_sale
          const isBookedLike =
            backendStatus === "booked" ||
            backendStatus === "unavailable" ||
            backendStatus === "not_for_sale" ||
            backendStatus === "under_negotiation";

          return {
            backendId: String(u.id ?? ""),
            displayId: String(unitCode),
            status: isBookedLike ? "booked" : "available",
          };
        });

        // Remove empty IDs and keep UI snappy
        setUnits(
          mapped
            .filter((u) => u.backendId.trim().length > 0 && u.displayId.trim().length > 0)
            .slice(0, 50)
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[NegotiationOverview] Failed to load units", err);
        setUnits([]);
      }
    };

    void run();
  }, [properties]);

  // Chat messages
  const chatMessages: ChatMessage[] = [
    {
      id: 1,
      text: "Sir, your total deal price is ₹2.26 Cr",
      time: "4:27 PM",
      sent: true,
    },
    {
      id: 2,
      text: "That's a bit high. Can you adjust something?",
      time: "4:28 PM",
      sent: false,
    },
    {
      id: 3,
      text: "We've already added a ₹75L discount. The base price is fixed from builder side.",
      time: "4:29 PM",
      sent: true,
    },
    {
      id: 4,
      text: "I'm okay with ₹2 Cr — that's my final offer.",
      time: "4:30 PM",
      sent: false,
    },
    {
      id: 5,
      text: "Let me check with my manager and get back. Will also remind you of the current festive offer that ends this week.",
      time: "4:31 PM",
      sent: true,
    },
  ];

  // Price breakdown: computed real values from backend.
  const [priceItems, setPriceItems] = useState<PriceBreakdownItem[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [needsNegotiationCreate, setNeedsNegotiationCreate] = useState(false);
  const [isCreatingNegotiation, setIsCreatingNegotiation] = useState(false);
  const [negotiationStatus, setNegotiationStatus] = useState<string | null>(null);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);
  const [isQuotationDrawerOpen, setIsQuotationDrawerOpen] = useState(false);
  const [isDifferentProjectQuotationDrawerOpen, setIsDifferentProjectQuotationDrawerOpen] =
    useState(false);
  const [differentProjectQuotationProjectId, setDifferentProjectQuotationProjectId] = useState<string>("");
  const [differentProjectQuotationUnits, setDifferentProjectQuotationUnits] = useState<Unit[]>([]);
  const [isDifferentProjectQuotationUnitsLoading, setIsDifferentProjectQuotationUnitsLoading] =
    useState(false);
  const [differentProjectQuotationSelectedUnitId, setDifferentProjectQuotationSelectedUnitId] =
    useState<string | null>(null);
  const [quotationForm, setQuotationForm] = useState<{
    customerName: string;
    customerContact: string;
    customerEmail: string;
    validTill: string; // YYYY-MM-DD
    basePrice: string;
    discountName: string;
    discountPrice: string;
    additionalCharges: Array<{ label: string; amount: number }>;
  }>({
    customerName: "",
    customerContact: "",
    customerEmail: "",
    validTill: "",
    basePrice: "",
    discountName: "Discount",
    discountPrice: "",
    additionalCharges: [],
  });
  const [newAdditionalCharge, setNewAdditionalCharge] = useState<{
    label: string;
    amount: string;
  }>({ label: "", amount: "" });

  /** Create Quotation drawer: collapsible “more” + add-ons list loaded when drawer opens */
  const [quotationDrawerMoreOpen, setQuotationDrawerMoreOpen] = useState(false);
  const [quotationAddonsList, setQuotationAddonsList] = useState<
    Array<{ id: string; title: string; price: number }>
  >([]);

  type LeadQuotation = {
    id: string;
    quotation_status: string;
    quotation_version: number;
    customer_name?: string | null;
    rejection_reason?: string | null;
  };
  const [leadQuotations, setLeadQuotations] = useState<LeadQuotation[]>([]);
  const [isLeadQuotationsLoading, setIsLeadQuotationsLoading] = useState(false);
  /** Same gate as Example mobile: Booking CTA checks approved quotations before navigating. */
  const [isBookingGateLoading, setIsBookingGateLoading] = useState(false);

  const refreshPriceBreakdown = async () => {
    if (!leadId) return;
    setIsPriceLoading(true);
    try {
      // 1) Price breakdown must work first (it contains all computed lines).
      const breakdownRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(
          leadId
        )}/negotiation/price-breakdown`
      );
      const pb = breakdownRes.data?.price_breakdown ?? {};

      const discountTitle: string =
        // Discount title is stored in negotiation; price-breakdown response doesn't provide it.
        "Discount";

      const unitCharges: Array<any> = Array.isArray(pb.unit_charges)
        ? pb.unit_charges
        : [];
      const addons: Array<any> = Array.isArray(pb.addons) ? pb.addons : [];
      const discountAmount: number | null =
        typeof pb.discount_amount === "number" ? pb.discount_amount : null;

      const items: PriceBreakdownItem[] = [
        ...unitCharges
          .map((c) => ({
            label: String(c.label ?? ""),
            amount: typeof c.amount === "number" ? c.amount : Number(c.amount ?? 0),
          }))
          .filter((x) => x.label && x.amount !== 0),
        ...addons
          .map((a) => ({
            label: String(a.label ?? ""),
            amount: typeof a.amount === "number" ? a.amount : Number(a.amount ?? 0),
          }))
          .filter((x) => x.label && x.amount !== 0),
      ];

      if (discountAmount != null && discountAmount !== 0) {
        items.push({
          label: discountTitle,
          amount: -Math.abs(discountAmount),
          isDiscount: true,
        });
      }

      setPriceItems(items);
      setFinalPrice(typeof pb.final_price === "number" ? pb.final_price : 0);
    } catch (err: any) {
      const status: number | undefined = err?.status;

      // For 404, negotiation draft abhi create nahi hua hota – yeh expected hai,
      // is case mein console.error nahi karna (sirf silent auto-create).
      if (status !== 404) {
        // eslint-disable-next-line no-console
        console.error("[NegotiationOverview] Failed to load price breakdown", err);
      }
      const backendMsg =
        (err?.data as any)?.message ||
        (err?.data as any)?.error ||
        err?.message ||
        "Failed to load price breakdown";

      if (status === 404) {
        // Negotiation stage exists, but negotiation draft row may not be created yet.
        setNeedsNegotiationCreate(true);
      } else if (status === 403) {
        toast.error(
          "You don't have permission for this lead (lead must be assigned to you)."
        );
      } else {
        toast.error(backendMsg);
      }
      setPriceItems([]);
      setFinalPrice(0);
      setNegotiationStatus(null);
    }

    // 2) Sync selections/discount drawer in parallel (doesn't block price rendering).
    try {
      const negRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`
      );
      const neg = negRes.data?.negotiation ?? {};

      setNegotiationStatus(typeof neg.status === "string" ? neg.status : null);

      if (Array.isArray(neg.addon_ids)) {
        setSelectedAddOns(new Set(neg.addon_ids.map(String)));
      }
      if (typeof neg.unit_id === "string" && neg.unit_id) {
        setSelectedUnit(neg.unit_id);
      }

      if (typeof neg.discount_title === "string" && neg.discount_title) {
        // Update discount title if user is using drawer.
        setDiscountForm((prev) => ({
          ...prev,
          reason: neg.discount_title,
        }));
      }

      if (neg.user_commission != null) {
        setDiscountForm((prev) => ({
          ...prev,
          yourCommission: String(Math.round(Number(neg.user_commission) || 0)),
        }));
      }
      if (neg.discount_amount != null) {
        setDiscountForm((prev) => ({
          ...prev,
          companyDiscount: String(Math.round(Number(neg.discount_amount) || 0)),
          extraDiscount: "0",
        }));
      }
    } catch (syncErr) {
      // eslint-disable-next-line no-console
      console.warn("[NegotiationOverview] Sync negotiation selection failed", syncErr);
    } finally {
      setIsPriceLoading(false);
    }
  };

  const openQuotationDrawer = async () => {
    if (!leadId) return;
    if (!isSalesUser) return;
    if (isCreatingQuotation) return;

    try {
      // Fetch latest negotiation so we can prefill base/discount/customer fields.
      const negRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`
      );
      const neg = negRes.data?.negotiation ?? {};

      const negUnitBase =
        typeof neg?.unit?.base_price === "number" ? neg.unit.base_price : null;

      const discountPriceRaw =
        typeof neg.discount_amount === "number" ? neg.discount_amount : null;
      const discountNameRaw =
        typeof neg.discount_title === "string" && neg.discount_title.trim()
          ? neg.discount_title.trim()
          : "Discount";

      // Prefill customer details from lead profile we already loaded.
      // (Backend accepts these as optional pointers; still we send what we have.)
      const customerName =
        leadData?.name && leadData.name !== "—" ? leadData.name : "";
      const customerContact =
        leadData?.phone && leadData.phone !== "—" ? leadData.phone : "";
      const customerEmail =
        leadData?.email && leadData.email !== "—" ? leadData.email : "";

      setQuotationForm({
        customerName,
        customerContact,
        customerEmail,
        validTill: "",
        basePrice:
          negUnitBase != null && Number(negUnitBase) > 0
            ? String(Math.round(negUnitBase))
            : "",
        discountName: discountNameRaw,
        discountPrice:
          discountPriceRaw != null && Number(discountPriceRaw) !== 0
            ? String(discountPriceRaw)
            : "",
        additionalCharges: [],
      });

      setNewAdditionalCharge({ label: "", amount: "" });
      setQuotationDrawerMoreOpen(false);

      const projectIdForAddons =
        (typeof neg.project_id === "string" && neg.project_id) ||
        properties[0]?.backendId ||
        "";
      if (projectIdForAddons) {
        try {
          const addonsRes = await apiFetch<any>(
            `/api/v1/projects/${encodeURIComponent(
              projectIdForAddons
            )}/addons?page=1&limit=200&status=active`
          );
          const apiAddons: Array<any> = addonsRes.data?.addons ?? [];
          setQuotationAddonsList(
            apiAddons.map((a) => ({
              id: String(a.id),
              title: String(a.title ?? "Add-on"),
              price:
                typeof a.price === "number" ? a.price : Number(a.price ?? 0),
            }))
          );
        } catch {
          setQuotationAddonsList([]);
        }
      } else {
        setQuotationAddonsList([]);
      }

      setIsQuotationDrawerOpen(true);
      await refreshPriceBreakdown();
    } catch (err: any) {
      toast.error(err?.message || "Failed to load negotiation for quotation");
    }
  };

  const mapApiUnitsToUiUnits = (
    apiUnits: Array<{
      id?: string | number;
      unit_code?: string | null;
      name?: string | null;
      status?: string | null;
    }>
  ): Unit[] => {
    const mapped: Unit[] = apiUnits.map((u) => {
      const unitCode = u.unit_code ?? u.name ?? "";
      const backendStatus = (u.status ?? "").toLowerCase();

      // Backend statuses:
      // available | under_negotiation | booked | unavailable | not_for_sale
      const isBookedLike =
        backendStatus === "booked" ||
        backendStatus === "unavailable" ||
        backendStatus === "not_for_sale" ||
        backendStatus === "under_negotiation";

      return {
        backendId: String(u.id ?? ""),
        displayId: String(unitCode),
        status: isBookedLike ? "booked" : "available",
      };
    });

    return mapped
      .filter((u) => u.backendId.trim().length > 0 && u.displayId.trim().length > 0)
      .slice(0, 50);
  };

  const fetchDifferentProjectUnits = async (projectId: string) => {
    if (!projectId) return [];
    setIsDifferentProjectQuotationUnitsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/units?page=1&limit=200`
      );
      const apiUnits: Array<any> = res.data?.units ?? [];
      return mapApiUnitsToUiUnits(apiUnits);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[NegotiationOverview] Failed to load units for project", err);
      return [];
    } finally {
      setIsDifferentProjectQuotationUnitsLoading(false);
    }
  };

  const syncNegotiationForQuotationSelection = async (
    projectId: string,
    unitId: string
  ) => {
    if (!leadId) return;

    try {
      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`,
        {
          method: "PATCH",
          body: { project_id: projectId, unit_id: unitId },
        }
      );
    } catch (err: any) {
      const status: number | undefined = err?.status;
      if (status === 404) {
        // Negotiation draft exists nahi hota, so create it for selected project/unit.
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`,
          {
            method: "POST",
            body: {
              project_id: projectId,
              unit_id: unitId,
              addon_ids: [],
            },
          }
        );
      } else {
        toast.error(err?.message || "Failed to sync negotiation selection");
        return;
      }
    }

    await refreshPriceBreakdown();
  };

  const openDifferentProjectQuotationDrawer = async () => {
    if (!leadId) return;
    if (!isSalesUser) return;
    if (isCreatingQuotation) return;

    // Close other drawers to avoid UI overlap.
    setIsQuotationDrawerOpen(false);
    setIsDiscountDrawerOpen(false);

    try {
      const negRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`
      );
      const neg = negRes.data?.negotiation ?? {};

      const discountPriceRaw =
        typeof neg.discount_amount === "number" ? neg.discount_amount : null;
      const discountNameRaw =
        typeof neg.discount_title === "string" && neg.discount_title.trim()
          ? neg.discount_title.trim()
          : "Discount";

      const customerName =
        leadData?.name && leadData.name !== "—" ? leadData.name : "";
      const customerContact =
        leadData?.phone && leadData.phone !== "—" ? leadData.phone : "";
      const customerEmail =
        leadData?.email && leadData.email !== "—" ? leadData.email : "";

      setQuotationForm({
        customerName,
        customerContact,
        customerEmail,
        validTill: "",
        // Different project drawer me base price override / extra charges show nahi kar rahe.
        basePrice: "",
        discountName: discountNameRaw,
        discountPrice:
          discountPriceRaw != null && Number(discountPriceRaw) !== 0
            ? String(discountPriceRaw)
            : "",
        additionalCharges: [],
      });

      const initProjectId =
        (typeof neg.project_id === "string" && neg.project_id) ||
        properties[0]?.backendId ||
        "";

      setDifferentProjectQuotationProjectId(initProjectId);
      setDifferentProjectQuotationUnits([]);
      setDifferentProjectQuotationSelectedUnitId(null);

      if (initProjectId) {
        const unitsForProject = await fetchDifferentProjectUnits(initProjectId);
        setDifferentProjectQuotationUnits(unitsForProject);

        const initUnitId =
          typeof neg.unit_id === "string" && neg.unit_id ? neg.unit_id : null;
        const isInitUnitPresent =
          initUnitId &&
          unitsForProject.some((u) => String(u.backendId) === String(initUnitId));

        const firstAvailableUnitId =
          unitsForProject.find((u) => u.status !== "booked")?.backendId ||
          unitsForProject[0]?.backendId ||
          null;

        const unitToSelect = isInitUnitPresent ? initUnitId : firstAvailableUnitId;
        setDifferentProjectQuotationSelectedUnitId(unitToSelect);

        if (unitToSelect) {
          await syncNegotiationForQuotationSelection(initProjectId, unitToSelect);
        }
      }

      setIsDifferentProjectQuotationDrawerOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to open project quotation drawer");
    }
  };

  const handleDifferentProjectChange = async (projectId: string) => {
    setDifferentProjectQuotationProjectId(projectId);
    setDifferentProjectQuotationUnits([]);
    setDifferentProjectQuotationSelectedUnitId(null);

    if (!projectId) return;

    const unitsForProject = await fetchDifferentProjectUnits(projectId);
    setDifferentProjectQuotationUnits(unitsForProject);

    const firstAvailableUnitId =
      unitsForProject.find((u) => u.status !== "booked")?.backendId ||
      unitsForProject[0]?.backendId ||
      null;

    setDifferentProjectQuotationSelectedUnitId(firstAvailableUnitId);

    if (firstAvailableUnitId) {
      await syncNegotiationForQuotationSelection(projectId, firstAvailableUnitId);
    }
  };

  const handleDifferentProjectUnitClick = async (unitId: string) => {
    if (!differentProjectQuotationProjectId) return;
    setDifferentProjectQuotationSelectedUnitId(unitId);
    await syncNegotiationForQuotationSelection(
      differentProjectQuotationProjectId,
      unitId
    );
  };

  const handleSubmitDifferentProjectQuotation = async () => {
    if (!leadId) return;
    if (!isSalesUser) return;
    if (isCreatingQuotation) return;
    if (!differentProjectQuotationProjectId || !differentProjectQuotationSelectedUnitId)
      return;

    setIsCreatingQuotation(true);
    try {
      // Re-fetch negotiation so addon_ids & discount state stay consistent.
      const negRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`
      );
      const neg = negRes.data?.negotiation ?? {};

      const projectId =
        differentProjectQuotationProjectId ||
        (typeof neg.project_id === "string" && neg.project_id) ||
        "";
      const unitId =
        differentProjectQuotationSelectedUnitId ||
        (typeof neg.unit_id === "string" && neg.unit_id) ||
        "";

      if (!projectId || !unitId) {
        toast.error("Missing project/unit info for quotation.");
        return;
      }

      const addonIDs: string[] = Array.isArray(neg.addon_ids)
        ? neg.addon_ids.map(String)
        : [];

      const body: any = {
        project_id: projectId,
        unit_id: unitId,
        addon_ids: addonIDs,
      };

      const discountPriceNum = parseFloat(quotationForm.discountPrice);
      if (!Number.isNaN(discountPriceNum) && discountPriceNum !== 0) {
        body.discount_name = quotationForm.discountName.trim() || "Discount";
        body.discount_price = discountPriceNum;
      }

      if (quotationForm.customerName.trim()) {
        body.customer_name = quotationForm.customerName.trim();
      }
      if (quotationForm.customerContact.trim()) {
        body.customer_contact = quotationForm.customerContact.trim();
      }
      if (quotationForm.customerEmail.trim()) {
        body.customer_email = quotationForm.customerEmail.trim();
      }
      if (quotationForm.validTill.trim()) {
        body.valid_till = quotationForm.validTill.trim();
      }

      const createRes = await apiFetch<{
        data?: { quotation?: { id?: string } };
      }>(`/api/v1/leads/${encodeURIComponent(leadId)}/quotations`, {
        method: "POST",
        body,
      });

      await refreshLeadQuotations();
      toast.success("Quotation created");
      setIsDifferentProjectQuotationDrawerOpen(false);

      const newQid = createRes.data?.quotation?.id;
      if (newQid) {
        router.push(
          `/sales/lead-list/lead-detail/negotiation/quotation-preview?leadId=${encodeURIComponent(
            leadId
          )}&quotationId=${encodeURIComponent(newQid)}`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create quotation");
    } finally {
      setIsCreatingQuotation(false);
    }
  };

  const handleSubmitQuotation = async () => {
    if (!leadId) return;
    if (!isSalesUser) return;
    if (isCreatingQuotation) return;

    setIsCreatingQuotation(true);
    try {
      // Re-fetch negotiation so project/unit/addons are guaranteed to be current.
      const negRes = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`
      );
      const neg = negRes.data?.negotiation ?? {};

      const projectId =
        (typeof neg.project_id === "string" && neg.project_id) ||
        properties[0]?.backendId ||
        "";
      const unitId =
        (typeof neg.unit_id === "string" && neg.unit_id) || selectedUnit || "";

      if (!projectId || !unitId) {
        toast.error("Missing project/unit info for quotation.");
        return;
      }

      const addonIDs: string[] =
        selectedAddOns.size > 0
          ? Array.from(selectedAddOns)
          : Array.isArray(neg.addon_ids)
            ? neg.addon_ids.map(String)
            : [];

      const body: any = {
        project_id: projectId,
        unit_id: unitId,
        addon_ids: addonIDs,
      };

      const basePriceNum = parseFloat(quotationForm.basePrice);
      if (!Number.isNaN(basePriceNum) && basePriceNum > 0) {
        body.base_price = basePriceNum;
      }

      const discountPriceNum = parseFloat(quotationForm.discountPrice);
      if (!Number.isNaN(discountPriceNum) && discountPriceNum !== 0) {
        body.discount_name = quotationForm.discountName.trim() || "Discount";
        body.discount_price = discountPriceNum;
      }

      if (quotationForm.additionalCharges.length > 0) {
        body.additional_charges = quotationForm.additionalCharges
          .filter((c) => c.label.trim() && c.amount > 0)
          .map((c) => ({ label: c.label.trim(), amount: c.amount }));
      }

      if (quotationForm.customerName.trim()) {
        body.customer_name = quotationForm.customerName.trim();
      }
      if (quotationForm.customerContact.trim()) {
        body.customer_contact = quotationForm.customerContact.trim();
      }
      if (quotationForm.customerEmail.trim()) {
        body.customer_email = quotationForm.customerEmail.trim();
      }

      if (quotationForm.validTill.trim()) {
        body.valid_till = quotationForm.validTill.trim();
      }

      const createRes = await apiFetch<{
        data?: { quotation?: { id?: string } };
      }>(`/api/v1/leads/${encodeURIComponent(leadId)}/quotations`, {
        method: "POST",
        body,
      });

      await refreshLeadQuotations();
      toast.success("Quotation created");
      setIsQuotationDrawerOpen(false);

      const newQid = createRes.data?.quotation?.id;
      if (newQid) {
        router.push(
          `/sales/lead-list/lead-detail/negotiation/quotation-preview?leadId=${encodeURIComponent(
            leadId
          )}&quotationId=${encodeURIComponent(newQid)}`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create quotation");
    } finally {
      setIsCreatingQuotation(false);
    }
  };

  /** Example mobile: quotation create entry points are always shown for sales (no negotiation-approved gate). */
  const canCreateQuotation = isSalesUser;

  useEffect(() => {
    if (!leadId) return;
    if (!hasMounted) return;
    if (!isSalesUser) return;
    void refreshPriceBreakdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, hasMounted, isSalesUser]);

  const refreshLeadQuotations = async () => {
    if (!leadId) return;
    setIsLeadQuotationsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/quotations?page=1&limit=20`
      );
      const list = res.data?.quotations ?? [];
      setLeadQuotations(
        Array.isArray(list)
          ? list.map((q: any) => ({
              id: String(q.id ?? ""),
              quotation_status: String(q.quotation_status ?? ""),
              quotation_version: Number(q.quotation_version ?? 0),
              customer_name:
                typeof q.customer_name === "string" ? q.customer_name : null,
              rejection_reason:
                typeof q.rejection_reason === "string" && q.rejection_reason.trim()
                  ? q.rejection_reason
                  : null,
            }))
          : []
      );
    } catch {
      setLeadQuotations([]);
    } finally {
      setIsLeadQuotationsLoading(false);
    }
  };

  useEffect(() => {
    if (!leadId) return;
    if (!hasMounted) return;
    // Quotations are lead-scoped; refresh whenever user lands on this page.
    void refreshLeadQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, hasMounted]);

  // Units
  const [units, setUnits] = useState<Unit[]>([]);

  // Keep selected unit valid once units are loaded/refreshed.
  useEffect(() => {
    if (!units.length) return;
    const firstAvailable = units.find((u) => u.status !== "booked");
    if (!firstAvailable) return;

    // If nothing is selected yet, default to the first available unit.
    if (!selectedUnit) {
      setSelectedUnit(firstAvailable.backendId);
      return;
    }

    const exists = units.some(
      (u) => u.backendId === selectedUnit && u.status !== "booked"
    );
    if (exists) return;

    setSelectedUnit(firstAvailable.backendId);
  }, [units, selectedUnit]);

  // If stage is already "negotiation" but backend draft row doesn't exist yet,
  // auto-create it (matches @Example behavior).
  useEffect(() => {
    if (!needsNegotiationCreate) return;
    if (!isSalesUser) return;
    if (!leadId) return;
    if (isCreatingNegotiation) return;
    if (properties.length === 0) return;
    if (units.length === 0) return;

    const projectId = properties[0]?.backendId;
    const unitId =
      selectedUnit ?? units.find((u) => u.status !== "booked")?.backendId;
    if (!projectId || !unitId) return;

    void (async () => {
      setIsCreatingNegotiation(true);
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`,
          {
            method: "POST",
            body: {
              project_id: projectId,
              unit_id: unitId,
              addon_ids: Array.from(selectedAddOns),
            },
          }
        );
        setNeedsNegotiationCreate(false);
        toast.success("Negotiation draft created");
        await refreshPriceBreakdown();
      } catch (err: any) {
        toast.error(err?.message || "Failed to create negotiation draft");
      } finally {
        setIsCreatingNegotiation(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    needsNegotiationCreate,
    isSalesUser,
    leadId,
    properties,
    units,
    selectedUnit,
    selectedAddOns,
  ]);

  // Remarks
  const [stageId, setStageId] = useState<string | null>(null);
  const [stageRemarksRaw, setStageRemarksRaw] = useState<string>("");
  const [remarks, setRemarks] = useState<string[]>([]);

  const splitStageRemarksToBullets = (raw: string): string[] => {
    const normalized = raw ?? "";
    if (!normalized.trim()) return [];
    return normalized
      .split(/\r?\n+/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) =>
        r
          .replace(/^[-•\u2022]\s*/, "")
          .replace(/^\d+\.\s*/, "")
          .trim()
      );
  };

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      if (!hasMounted) return;

      // Backend behavior:
      // - Presales: can add remarks to any stage
      // - Sales: remarks are allowed only for `property_visit` stage
      const stageTypeForRemarks = isSalesUser ? "property_visit" : "negotiation";
      try {
        const res = await apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(
            leadId
          )}/stages/by-type/${encodeURIComponent(stageTypeForRemarks)}`
        );
        const stage = res.data?.stage ?? null;
        const id = stage?.id ?? null;
        const raw = typeof stage?.remarks === "string" ? stage.remarks : "";

        setStageId(id);
        setStageRemarksRaw(raw);
        setRemarks(splitStageRemarksToBullets(raw));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[NegotiationOverview] Failed to load negotiation remarks", err);
        setStageId(null);
        setStageRemarksRaw("");
        setRemarks([]);
      }
    };

    void run();
  }, [leadId, hasMounted, isSalesUser]);

  // Follow-up data
  const followUpText = "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Prevent body scroll when any full-screen drawer is open
  useEffect(() => {
    if (
      isDiscountDrawerOpen ||
      isQuotationDrawerOpen ||
      isDifferentProjectQuotationDrawerOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    isDiscountDrawerOpen,
    isQuotationDrawerOpen,
    isDifferentProjectQuotationDrawerOpen,
  ]);

  useEffect(() => {
    if (!isQuotationDrawerOpen) {
      setQuotationDrawerMoreOpen(false);
    }
  }, [isQuotationDrawerOpen]);

  const handleUnitClick = async (unitId: string, status: string) => {
    if (!leadId) return;
    if (status === "booked") return;

    setSelectedUnit(unitId);
    try {
      await apiFetch(`/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`, {
        method: "PATCH",
        body: { unit_id: unitId },
      });
      toast.success("Unit updated");
      await refreshPriceBreakdown();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update unit");
    }
  };

  /** Toggle add-on from Create Quotation drawer and sync negotiation for live price preview */
  const handleQuotationDrawerAddonToggle = async (addonId: string) => {
    if (!leadId) return;
    const next = new Set(selectedAddOns);
    if (next.has(addonId)) next.delete(addonId);
    else next.add(addonId);
    setSelectedAddOns(next);
    try {
      await apiFetch(`/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`, {
        method: "PATCH",
        body: { addon_ids: Array.from(next) },
      });
      await refreshPriceBreakdown();
    } catch (err: any) {
      const status: number | undefined = err?.status;
      if (status === 404) {
        setNeedsNegotiationCreate(true);
        toast.error("Saving add-ons… create negotiation draft first, then retry.");
      } else {
        toast.error(err?.message || "Failed to update add-ons");
      }
    }
  };

  const handleAddRemark = () => {
    if (!leadId || !stageId) return;
    const trimmed = newRemark.trim();
    if (!trimmed) return;

    const prevRaw = stageRemarksRaw ?? "";
    const nextRaw = prevRaw.trimEnd()
      ? `${prevRaw.trimEnd()}\n${trimmed}`
      : trimmed;

    void (async () => {
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/${encodeURIComponent(
            stageId
          )}/remarks`,
          {
            method: "PATCH",
            body: { remarks: nextRaw },
          }
        );

        setStageRemarksRaw(nextRaw);
        setRemarks(splitStageRemarksToBullets(nextRaw));
        setNewRemark("");
        toast.success("Remark added");
      } catch (err: any) {
        const backendMsg: string = err?.message || "";
        if (backendMsg.includes("Lead is not assigned to you")) {
          toast.error(
            isSalesUser
              ? "You can only add remarks if the lead is assigned to you (and Sales remarks are allowed only on property visit stage)."
              : "You can only add remarks if the lead is assigned to you."
          );
          return;
        }
        toast.error(backendMsg || "Failed to add remark. Please try again.");
      }
    })();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newRemark.trim()) {
      handleAddRemark();
    }
  };

  const handleAddFollowUp = () => {
    if (!leadId || !stageId) return;
    const trimmed = followUpText.trim();
    if (!trimmed) return;

    const prevRaw = stageRemarksRaw ?? "";
    const nextRaw = prevRaw.trimEnd()
      ? `${prevRaw.trimEnd()}\n${trimmed}`
      : trimmed;

    void (async () => {
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/${encodeURIComponent(
            stageId
          )}/remarks`,
          {
            method: "PATCH",
            body: { remarks: nextRaw },
          }
        );

        setStageRemarksRaw(nextRaw);
        setRemarks(splitStageRemarksToBullets(nextRaw));
        toast.success("Follow-up added to remarks");
      } catch (err: any) {
        const backendMsg: string = err?.message || "";
        if (backendMsg.includes("Lead is not assigned to you")) {
          toast.error(
            isSalesUser
              ? "Follow-up remark not allowed: lead must be assigned to you (Sales allowed only on property visit stage)."
              : "Follow-up remark not allowed: lead must be assigned to you."
          );
          return;
        }
        toast.error(backendMsg || "Failed to add follow-up. Please try again.");
      }
    })();
  };

  const handleReject = async () => {
    if (!leadId) return;

    // Sales "Reject" means reject the lead (not negotiation), reusing rejected-form flow.
    if (isSalesUser) {
      router.push(
        `/sales/lead-list/rejected-form?leadId=${encodeURIComponent(leadId)}`
      );
      return;
    }

    // Manager/GM "Reject" means reject negotiation draft.
    if (isManagerUser) {
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation/reject`,
          { method: "POST", body: {} }
        );
        toast.success("Negotiation rejected");
        await refreshPriceBreakdown();
      } catch (err: any) {
        toast.error(err?.message || "Failed to reject negotiation");
      }
    }
  };

  const handleApprove = async () => {
    if (!leadId) return;

    const tryForwardToBooking = async () => {
      // Manager/GM: forward negotiation -> booking after negotiation approve (presales rules).
      // If stage mismatch, best-effort negotiation then booking.
      const attemptForward = async (nextStage: "negotiation" | "booking") => {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/forward-stage`,
          { method: "POST", body: { next_stage: nextStage } }
        );
      };

      try {
        await attemptForward("booking");
        return;
      } catch (err: any) {
        const msg: string = err?.message || "";
        if (
          msg.includes("INVALID_CURRENT_STAGE") ||
          msg.includes("INVALID_NEXT_STAGE") ||
          msg.includes("INVALID")
        ) {
          // Best-effort: align lead stage then retry booking.
          try {
            await attemptForward("negotiation");
          } catch {
            // ignore
          }
          try {
            await attemptForward("booking");
          } catch {
            // ignore
          }
          return;
        }
        // ignore other errors
      }
    };

    // Sales primary CTA — same as Example mobile "Booking": require manager-approved quotation, then go to booking.
    if (isSalesUser) {
      if (isBookingGateLoading) return;
      setIsBookingGateLoading(true);
      try {
        // Gate FIRST: at least one approved quotation (even if lead.stage is already `booking`
        // from an older visit — manager may have rejected all quotes since).
        const res = await apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/quotations?page=1&limit=20`
        );
        const list = res.data?.quotations ?? [];
        const approved = Array.isArray(list)
          ? list.filter(
              (q: { quotation_status?: string }) =>
                String(q.quotation_status ?? "").toLowerCase() === "approved"
            )
          : [];
        await refreshLeadQuotations();
        if (approved.length === 0) {
          toast.error("No approved quotation", {
            description:
              "None of your quotations is approved by the manager. Please get at least one quotation approved before proceeding to booking.",
            duration: 8000,
          });
          return;
        }

        // Fresh stage: user may return from booking while UI still shows negotiation tab;
        // DB stage is already `booking` — forward-stage would return INVALID_CURRENT_STAGE.
        const freshLead = await apiFetch<LeadByIdBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}`
        );
        const freshStage = freshLead.data?.lead?.stage;
        if (freshStage === "booking") {
          router.push(
            `/sales/lead-list/lead-detail/booking/overveiw?leadId=${encodeURIComponent(leadId)}`
          );
          return;
        }
        try {
          await apiFetch(
            `/api/v1/leads/${encodeURIComponent(leadId)}/forward-stage`,
            { method: "POST", body: { next_stage: "booking" } }
          );
        } catch (fwdErr: any) {
          const msg = String(fwdErr?.message ?? "");
          if (msg.includes("INVALID_CURRENT_STAGE")) {
            try {
              const again = await apiFetch<LeadByIdBackend>(
                `/api/v1/leads/${encodeURIComponent(leadId)}`
              );
              if (again.data?.lead?.stage === "booking") {
                router.push(
                  `/sales/lead-list/lead-detail/booking/overveiw?leadId=${encodeURIComponent(leadId)}`
                );
                return;
              }
            } catch {
              // fall through to generic error
            }
          }
          if (
            msg.includes("QUOTATION_APPROVAL_REQUIRED") ||
            msg.toLowerCase().includes("quotation")
          ) {
            toast.error(
              fwdErr?.message ||
                "Manager must approve a quotation before booking."
            );
          } else {
            toast.error(
              fwdErr?.message ||
                "Could not move lead to booking stage. Try again."
            );
          }
          return;
        }
        router.push(
          `/sales/lead-list/lead-detail/booking/overveiw?leadId=${encodeURIComponent(leadId)}`
        );
      } catch (err: any) {
        toast.error(err?.message || "Could not load quotations");
      } finally {
        setIsBookingGateLoading(false);
      }
      return;
    }

    // Manager/GM "Approved" => approve negotiation.
    if (isManagerUser) {
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation/approve`,
          { method: "POST", body: {} }
        );
        toast.success("Negotiation approved");
        await tryForwardToBooking();
      } catch (err: any) {
        toast.error(err?.message || "Failed to approve negotiation");
      }
    }
  };

  // Follow-ups handlers
  const handleSelectFollowUp = (id: string | number) => {
    const numId = typeof id === "string" ? parseInt(id) : id;
    setSelectedFollowUps((prev) =>
      prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === filteredFollowUps.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(filteredFollowUps.map((item) => item.id));
    }
  };

  const handleExport = () => {
    console.log("Exporting follow-ups:", selectedFollowUps.length > 0 ? selectedFollowUps : "all");
  };

  const handleRefresh = () => {
    console.log("Refreshing follow-ups");
    setSearchQuery("");
    setSelectedFollowUps([]);
    void refreshFollowUps();
  };

  const handleDelete = () => {
    console.log("Deleting selected follow-ups:", selectedFollowUps);
    // Filter out deleted items
    const updatedData = followUpsData.filter((item) => !selectedFollowUps.includes(item.id));
    setSelectedFollowUps([]);
  };

  // Filter follow-ups based on search
  const filteredFollowUps = followUpsData.filter((item) =>
    item.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Follow-ups columns
  const followUpColumns: Column<FollowUpData>[] = [
    {
      key: "fullName",
      header: "FULL NAME",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={row.avatar}
              alt={row.fullName}
              fill
              className="rounded-full object-cover"
              sizes="32px"
            />
          </div>
          <span className="text-sm text-[#2D3748] font-medium">{row.fullName}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "DATE",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#2D3748]">{row.date}</span>
      ),
    },
    {
      key: "time",
      header: "TIME",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#2D3748]">{row.time}</span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      sortable: false,
      render: (row) => {
        const statusConfig = {
          pending: { color: "#F6AD55", text: "Pending" },
          completed: { color: "#38B2AC", text: "Completed" },
          missed: { color: "#DC2626", text: "Missed" },
        };
        const config = statusConfig[row.status];
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            ></span>
            <span className="text-sm text-[#2D3748]">{config.text}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Tabs */}
        <div className="flex gap-4 sm:gap-6 md:gap-8 lg:gap-10 border-b border-[var(--sidebar-border-color)] mb-4 sm:mb-5 lg:mb-6 xl:mb-8 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "overview"
              ? "text-[var(--primary-base)]"
              : "text-[var(--sidebar-text-sub)]"
          }`}
        >
          Overview
          {activeTab === "overview" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("followups")}
          className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "followups"
              ? "text-[var(--primary-base)]"
              : "text-[var(--sidebar-text-sub)]"
          }`}
        >
          Follow Ups
          {activeTab === "followups" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
          )}
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-7">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Lead Profile */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-900">
                Lead Profile
              </h2>
              <div className="space-y-4">
                <DataCard
                  id={leadData.id}
                  name={leadData.name}
                  phone={leadData.phone}
                  avatar={leadData.avatar}
                  budget={leadData.budget}
                  propertyName={leadData.propertyName}
                  timeAgo={leadData.timeAgo}
                  location={leadData.location}
                  status={leadData.status}
                  source={leadData.source}
                />
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <button className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[var(--primary-hover)] transition-colors">
                    <Phone size={16} className="sm:w-[18px] sm:h-[18px]" weight="regular" />
                    <span>Call Now</span>
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        leadId
                          ? `/sales/lead-list/chat-now?leadId=${leadId}`
                          : "/sales/lead-list/chat-now"
                      )
                    }
                    className="bg-white border-2 border-[var(--primary-base)] text-[var(--primary-base)] py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[var(--primary-selected)] transition-colors"
                  >
                    <ChatCircle size={16} className="sm:w-[18px] sm:h-[18px]" weight="regular" />
                    <span>Chat Now</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Selected Property */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                  Selected Property
                </h2>
                <button
                  onClick={() => {
                    if (!leadId) return;
                    toast.message("Add More: opening Property Visit step");
                    router.push(
                      `/sales/lead-list/lead-detail/site-visit/overveiw?leadId=${encodeURIComponent(
                        leadId
                      )}`
                    );
                  }}
                  className="text-[var(--primary-base)] text-xs sm:text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <span>+</span>
                  <span className="hidden sm:inline">Add More</span>
                </button>
              </div>
              {/* Mobile/Tablet: Horizontal Scroll */}
              <div className="md:hidden overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5 pb-2 scrollbar-hide">
                <div className="flex gap-3 sm:gap-4 min-w-max">
                  {properties.length === 0 ? (
                    <p className="text-sm text-[#718096] px-2 py-4 whitespace-nowrap">
                      No properties found for this lead.
                    </p>
                  ) : (
                    properties.map((property) => (
                    <div key={property.id} className="w-[280px] sm:w-[320px] flex-shrink-0">
                      <ProjectCard
                        image={property.image}
                        name={property.name}
                        location={property.location}
                        features={property.tags}
                        imageHeight="h-28 sm:h-32"
                        variant="default"
                      />
                    </div>
                    ))
                  )}
                </div>
              </div>
              {/* Desktop: Grid Layout */}
              <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {properties.length === 0 ? (
                  <p className="text-sm text-[#718096] col-span-1 lg:col-span-2 py-4">
                    No properties found for this lead.
                  </p>
                ) : (
                  properties.map((property) => (
                    <ProjectCard
                      key={property.id}
                      image={property.image}
                      name={property.name}
                      location={property.location}
                      features={property.tags}
                      imageHeight="h-28 sm:h-32"
                      variant="default"
                    />
                  ))
                )}
              </div>
            </section>

            {/* Quotations — below Selected Property, full width of left column (same as Selected Property card) */}
            {isSalesUser && (
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors w-full min-w-0">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-900">
                  Quotations{" "}
                  <span className="font-normal text-slate-500 text-xs sm:text-sm">
                    (sent by sales)
                  </span>
                </h2>
                {(() => {
                  const total = leadQuotations.length;
                  const approvedCount = leadQuotations.filter(
                    (q) => q.quotation_status === "approved"
                  ).length;
                  const draftCount = leadQuotations.filter(
                    (q) => q.quotation_status === "draft"
                  ).length;
                  const rejectedCount = leadQuotations.filter(
                    (q) => q.quotation_status === "rejected"
                  ).length;
                  const sharedCount = leadQuotations.filter(
                    (q) => q.quotation_status === "shared"
                  ).length;

                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <p className="text-[11px] sm:text-xs text-slate-500 min-w-0">
                          {total} total
                          {negotiationStatus ? (
                            <>
                              {" "}
                              · Negotiation:{" "}
                              <span className="font-medium text-slate-700">
                                {negotiationStatus}
                              </span>
                            </>
                          ) : null}
                        </p>

                        <div className="flex shrink-0 gap-1 flex-wrap justify-end">
                          {approvedCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">
                              Approved: {approvedCount}
                            </span>
                          )}
                          {draftCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                              Draft: {draftCount}
                            </span>
                          )}
                          {rejectedCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">
                              Rejected: {rejectedCount}
                            </span>
                          )}
                          {sharedCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                              Shared: {sharedCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {isLeadQuotationsLoading ? (
                        <p className="text-[11px] text-slate-500 py-0.5">
                          Loading…
                        </p>
                      ) : total === 0 ? (
                        <p className="text-[11px] text-slate-500 py-0.5">
                          No quotations created yet.
                        </p>
                      ) : (
                        <ul className="space-y-1.5" role="list">
                          {leadQuotations.map((q) => {
                            const status = q.quotation_status || "draft";
                            const statusChip =
                              status === "approved"
                                ? "bg-green-50 text-green-700"
                                : status === "shared"
                                  ? "bg-blue-50 text-blue-700"
                                  : status === "rejected"
                                    ? "bg-red-50 text-red-700"
                                    : status === "revised"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-slate-100 text-slate-700";

                            const openQuotationPreview = () => {
                              if (!leadId) return;
                              router.push(
                                `/sales/lead-list/lead-detail/negotiation/quotation-preview?leadId=${encodeURIComponent(
                                  leadId
                                )}&quotationId=${encodeURIComponent(q.id)}`
                              );
                            };

                            return (
                              <li
                                key={q.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Open quotation v${q.quotation_version}`}
                                onClick={() => {
                                  openQuotationPreview();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openQuotationPreview();
                                  }
                                }}
                                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/90 px-2 py-1.5 sm:px-2.5 sm:py-1.5 cursor-pointer transition-colors hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-base)] focus-visible:ring-offset-1"
                              >
                                <div className="min-w-0 flex-1 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                                  <span className="text-[11px] sm:text-xs font-medium text-slate-800">
                                    Quotation v{q.quotation_version}
                                  </span>
                                  {status === "rejected" && q.rejection_reason ? (
                                    <p className="text-[10px] text-red-800 leading-snug line-clamp-2">
                                      <span className="font-semibold">Manager: </span>
                                      {q.rejection_reason}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openQuotationPreview();
                                    }}
                                    className="text-[11px] font-medium text-[var(--primary-base)] hover:underline whitespace-nowrap"
                                  >
                                    Preview
                                  </button>
                                  <span
                                    className={`shrink-0 capitalize text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusChip}`}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  );
                })()}
              </section>
            )}

          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Negotiation Thread */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-900">
                Negotiation Thread
              </h2>
              <div
                ref={chatBoxRef}
                className="bg-[var(--surface-neutral)] rounded-xl p-3 sm:p-4 md:p-5 min-h-[250px] sm:min-h-[300px] md:min-h-[380px] max-h-[350px] sm:max-h-[400px] md:max-h-[500px] overflow-y-auto flex flex-col gap-3 sm:gap-4 chat-scrollbar"
              >
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm rounded-2xl ${
                      message.sent
                        ? "bg-[var(--primary-base)] text-white self-end rounded-br-sm shadow-sm"
                        : "bg-white text-[var(--sidebar-text-main)] self-start border border-[var(--sidebar-border-color)] rounded-bl-sm shadow-sm"
                    }`}
                  >
                    <div className="leading-relaxed break-words">{message.text}</div>
                    <div
                      className={`text-[10px] sm:text-[11px] mt-1.5 opacity-70 ${
                        message.sent ? "text-right" : "text-left"
                      }`}
                    >
                      {message.time}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Remarks */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-900">
                Remarks
              </h2>
              
              <RemarksSection remarks={remarks} className="mb-3 sm:mb-4 md:mb-6" />

              {/* Follow-up Card */}
              <div className="bg-white border border-[#E3E6F0] rounded-xl p-3 sm:p-4 md:p-6 shadow-sm mb-3 sm:mb-4 md:mb-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-[#718096] max-w-[75%] sm:max-w-[80%]">
                    {followUpText}
                  </span>
                  <button
                    onClick={handleAddFollowUp}
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-[32px] md:h-[32px] flex-shrink-0 rounded-full border border-[#E3E6F0] bg-[#F8FAFC] flex items-center justify-center text-base sm:text-lg font-semibold hover:bg-[#E3E6F0] transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Remark Input */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 bg-[#F8F9FC] border border-[#E3E6F0] rounded-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 flex items-center gap-1.5 sm:gap-2 md:gap-3">
                  <span className="text-sm sm:text-base md:text-lg">😊</span>
                  <input
                    type="text"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a new remark..."
                    className="flex-1 border-none bg-transparent outline-none text-xs sm:text-sm md:text-base text-[#2D3748] placeholder:text-[#718096]"
                  />
                  <div className="flex gap-2 sm:gap-3 md:gap-4 text-sm sm:text-base md:text-lg text-[#718096]">
                    <span className="cursor-pointer hover:scale-110 transition-transform">🔗</span>
                    <span className="cursor-pointer hover:scale-110 transition-transform">📷</span>
                  </div>
                </div>
                <button
                  onClick={newRemark.trim() ? handleAddRemark : undefined}
                  className={`w-9 h-9 sm:w-10 sm:h-10 md:w-[40px] md:h-[40px] flex-shrink-0 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all ${
                    newRemark.trim() ? "cursor-pointer" : "cursor-default"
                  }`}
                  disabled={!newRemark.trim()}
                  title={newRemark.trim() ? "Send remark" : "Voice input"}
                >
                  {newRemark.trim() ? (
                    <PaperPlaneTilt size={16} className="sm:w-[18px] sm:h-[18px]" weight="fill" />
                  ) : (
                    <Microphone size={16} className="sm:w-[18px] sm:h-[18px]" weight="fill" />
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Primary actions — full width below grid */}
        <div className="mt-4 sm:mt-5 lg:mt-6">
          {(() => {
            return (
              <div>
                {/* Reject | Create Quotation (sales) | Booking / Approved — same row on sm+ */}
                <div
                  className={
                    canCreateQuotation
                      ? "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
                      : "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                  }
                >
                  <button
                    onClick={handleReject}
                    className="w-full bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <X size={18} weight="regular" className="flex-shrink-0" />
                    <span>Rejected</span>
                  </button>

                  {canCreateQuotation && (
                    <button
                      type="button"
                      onClick={() => void openQuotationDrawer()}
                      disabled={isCreatingQuotation}
                      className="w-full bg-white border border-[var(--primary-base)] text-[var(--primary-base)] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Create Quotation</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={isSalesUser && isBookingGateLoading}
                    className="w-full bg-[var(--primary-base)] text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <span>
                      {isSalesUser
                        ? isBookingGateLoading
                          ? "Checking…"
                          : "Booking"
                        : "Approved"}
                    </span>
                    <span className="text-lg sm:text-xl">≫</span>
                  </button>
                </div>

                {canCreateQuotation && (
                  <button
                    type="button"
                    onClick={() => void openDifferentProjectQuotationDrawer()}
                    className="w-full bg-white border border-[#EAECF0] text-[#344054] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Plus size={18} weight="regular" className="text-[var(--primary-base)]" />
                    <span>Create for a different project</span>
                    <span className="text-lg text-[#718096]">›</span>
                  </button>
                )}

              </div>
            );
          })()}
        </div>
        </>
      ) : (
        <div>
          <DataTable
            data={filteredFollowUps}
            columns={followUpColumns}
            getRowId={(row) => row.id}
            searchPlaceholder="Search..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onColumnClick={() => {
              console.log("Column visibility");
            }}
            actions={[
              {
                label: "Export",
                icon: <Download size={16} weight="regular" />,
                onClick: handleExport,
                variant: "default",
                showLabel: false,
              },
              {
                label: "Refresh",
                icon: <ArrowClockwise size={16} weight="regular" />,
                onClick: handleRefresh,
                variant: "default",
                showLabel: false,
              },
              {
                label: "Delete",
                icon: <Trash size={16} weight="regular" />,
                onClick: handleDelete,
                variant: "danger",
                showLabel: false,
                disabled: selectedFollowUps.length === 0,
              },
            ]}
            selectable={true}
            selectedRows={selectedFollowUps}
            onSelectRow={handleSelectFollowUp}
            onSelectAll={handleSelectAllFollowUps}
            pagination={true}
            currentPage={followUpPage}
            totalPages={Math.ceil(filteredFollowUps.length / itemsPerPage)}
            totalItems={filteredFollowUps.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setFollowUpPage}
            onItemsPerPageChange={setItemsPerPage}
            emptyMessage="No follow-ups found"
            renderActions={(row) => (
              <button
                className="text-[var(--primary-base)] text-sm font-medium hover:underline"
                onClick={() => {
                  // Navigate to follow-up detail page
                  const query =
                    leadId && row.backendId
                      ? `?leadId=${encodeURIComponent(leadId)}&followUpId=${encodeURIComponent(
                          String(row.backendId)
                        )}`
                      : leadId
                        ? `?leadId=${encodeURIComponent(leadId)}`
                        : "";
                  router.push(
                    `/sales/lead-list/lead-detail/negotiation/overveiw/follow-up-detail${query}`
                  );
                }}
              >
                View Detail
              </button>
            )}
          />
        </div>
      )}
      </div>

      {/* Discount Side Drawer */}
      {isDiscountDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setIsDiscountDrawerOpen(false)}
          />

          {/* Side Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isDiscountDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-[#EAECF0] sticky top-0 bg-white z-10">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#344054]">Discount Popup</h2>
              <button
                onClick={() => setIsDiscountDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
                aria-label="Close"
              >
                <X size={20} weight="regular" className="text-[#344054]" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 md:space-y-5 overflow-y-auto h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
              {/* Company Discount */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Company Discount
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Buildings size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={`₹${parseInt(discountForm.companyDiscount || "0").toLocaleString("en-IN")}`}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[₹,]/g, "");
                      if (!isNaN(Number(value)) && value !== "") {
                        setDiscountForm({ ...discountForm, companyDiscount: value });
                      } else if (value === "") {
                        setDiscountForm({ ...discountForm, companyDiscount: "0" });
                      }
                    }}
                    className="w-full pl-10 pr-10 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-[#98A2B3]">▼</span>
                  </div>
                </div>
              </div>

              {/* Your Commission */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Your Commission:
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <MapPin size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={`₹${parseInt(discountForm.yourCommission || "0").toLocaleString("en-IN")}`}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[₹,]/g, "");
                      if (!isNaN(Number(value)) && value !== "") {
                        setDiscountForm({ ...discountForm, yourCommission: value });
                      } else if (value === "") {
                        setDiscountForm({ ...discountForm, yourCommission: "0" });
                      }
                    }}
                    className="w-full pl-10 pr-10 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-[#98A2B3]">▼</span>
                  </div>
                </div>
              </div>

              {/* Extra Discount */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Extra Discount (from your commission)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <MapPin size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={`₹${parseInt(discountForm.extraDiscount || "0").toLocaleString("en-IN")}`}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[₹,]/g, "");
                      if (!isNaN(Number(value)) && value !== "") {
                        setDiscountForm({ ...discountForm, extraDiscount: value });
                      } else if (value === "") {
                        setDiscountForm({ ...discountForm, extraDiscount: "0" });
                      }
                    }}
                    className="w-full pl-10 pr-10 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LinkSimple size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                </div>
              </div>

              {/* Remaining Commission */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Remaining Commission:
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Calendar size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={`₹${remainingCommission.toLocaleString("en-IN")}`}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-[#EAECF0] rounded-lg bg-[#F9FAFB] text-[#344054] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[#98A2B3] mt-1">Auto Calculated</p>
              </div>

              {/* Total Discount */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Total Discount
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Calendar size={18} weight="regular" className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={`₹${totalDiscount.toLocaleString("en-IN")}`}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-[#EAECF0] rounded-lg bg-[#F9FAFB] text-[#344054] cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Reason For Discount */}
              <div>
                <label className="block text-sm font-medium text-[#344054] mb-2">
                  Reason For Discount
                </label>
                <textarea
                  value={discountForm.reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent resize-none"
                  placeholder="Enter reason for discount..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 border-t border-[#EAECF0] sticky bottom-0 bg-white">
              <button
                onClick={() => setIsDiscountDrawerOpen(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 border border-[#344054] rounded-lg text-xs sm:text-sm font-medium text-[#344054] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void (async () => {
                    if (!leadId) return;
                    try {
                      const companyDiscount = parseInt(
                        discountForm.companyDiscount || "0",
                        10
                      );
                      const extraDiscount = parseInt(
                        discountForm.extraDiscount || "0",
                        10
                      );
                      const totalDiscountAmount = companyDiscount + extraDiscount;

                      const userCommission = parseInt(
                        discountForm.yourCommission || "0",
                        10
                      );

                      await apiFetch(
                        `/api/v1/leads/${encodeURIComponent(leadId)}/negotiation`,
                        {
                          method: "PATCH",
                          body: {
                            discount_amount: totalDiscountAmount,
                            discount_title:
                              discountForm.reason.trim() || "Discount",
                            user_commission: userCommission,
                          },
                        }
                      );

                      toast.success("Discount updated");
                      await refreshPriceBreakdown();
                      setIsDiscountDrawerOpen(false);
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to update discount");
                    }
                  })();
                }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[var(--primary-base)] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Quotation Side Drawer — New Quotation layout */}
      {isQuotationDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setIsQuotationDrawerOpen(false)}
          />

          <div
            className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
              isQuotationDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[#EAECF0] shrink-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#101828]">
                  New Quotation
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                  Fill details to generate quotation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuotationDrawerOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={20} weight="regular" className="text-[#344054]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-5">
              {/* Project (read-only, pre-filled) */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                  Project
                </p>
                <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-sky-100 text-sky-600 shrink-0">
                    <Buildings size={22} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1D2939] truncate">
                      {properties[0]?.name ?? "—"}
                    </p>
                    {properties[0]?.location ? (
                      <p className="text-xs text-[#667085] truncate mt-0.5">
                        {properties[0].location}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Unit (required) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                    Unit
                  </p>
                  <span className="text-[10px] font-semibold text-red-500 uppercase">
                    required
                  </span>
                </div>
                {units.length === 0 ? (
                  <p className="text-xs text-[#667085]">Loading units…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {units.map((unit) => {
                      const isBooked = unit.status === "booked";
                      const isSelected = selectedUnit === unit.backendId;
                      return (
                        <button
                          key={unit.backendId}
                          type="button"
                          disabled={isBooked}
                          onClick={() =>
                            void handleUnitClick(unit.backendId, unit.status)
                          }
                          className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border-2 transition-all ${
                            isBooked
                              ? "border-red-200 bg-red-50/50 text-red-400 cursor-not-allowed line-through"
                              : isSelected
                                ? "border-[var(--primary-base)] bg-[var(--primary-selected)] text-[var(--primary-base)] shadow-sm scale-[1.02]"
                                : "border-emerald-200 bg-white text-emerald-700 hover:border-[var(--primary-base)]"
                          }`}
                        >
                          {unit.displayId}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add-ons (optional) */}
              {quotationAddonsList.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                    Add-ons{" "}
                    <span className="font-normal normal-case text-[#667085]">
                      (optional)
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quotationAddonsList.map((a) => {
                      const on = selectedAddOns.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => void handleQuotationDrawerAddonToggle(a.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all text-left ${
                            on
                              ? "border-[var(--primary-base)] bg-[var(--primary-selected)] text-[var(--primary-base)]"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {a.title}
                          <span className="text-[#667085]">
                            {" "}
                            (₹{a.price.toLocaleString("en-IN")})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collapsible: Discount, Customer Info & More */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setQuotationDrawerMoreOpen(!quotationDrawerMoreOpen)
                  }
                  className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:py-3.5 bg-sky-50/90 hover:bg-sky-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-base)]">
                    <SlidersHorizontal size={20} weight="duotone" />
                    Discount, Customer Info &amp; More
                  </span>
                  {quotationDrawerMoreOpen ? (
                    <CaretUp size={18} className="text-[var(--primary-base)] shrink-0" />
                  ) : (
                    <CaretDown size={18} className="text-[var(--primary-base)] shrink-0" />
                  )}
                </button>

                {quotationDrawerMoreOpen && (
                  <div className="p-3 sm:p-4 space-y-5 border-t border-slate-100 bg-white">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                        Discount
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={quotationForm.discountName}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              discountName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-[#EAECF0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                          placeholder="Discount Name / Reason"
                        />
                        <input
                          value={quotationForm.discountPrice}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              discountPrice: e.target.value.replace(
                                /[^\d.]/g,
                                ""
                              ),
                            })
                          }
                          className="w-full px-3 py-2.5 border border-[#EAECF0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                          placeholder="Amount (₹)"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                        Customer info
                      </p>
                      <div className="space-y-3">
                        <div className="relative">
                          <label className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[10px] font-medium text-[#667085]">
                            Customer Name
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 pt-3 pb-2.5 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:border-transparent">
                            <User
                              size={18}
                              className="text-[#98A2B3] shrink-0"
                            />
                            <input
                              value={quotationForm.customerName}
                              onChange={(e) =>
                                setQuotationForm({
                                  ...quotationForm,
                                  customerName: e.target.value,
                                })
                              }
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] focus:ring-0 outline-none"
                              placeholder=" "
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[10px] font-medium text-[#667085]">
                            Phone
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 pt-3 pb-2.5 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:border-transparent">
                            <Phone
                              size={18}
                              className="text-[#98A2B3] shrink-0"
                            />
                            <input
                              value={quotationForm.customerContact}
                              onChange={(e) =>
                                setQuotationForm({
                                  ...quotationForm,
                                  customerContact: e.target.value,
                                })
                              }
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] focus:ring-0 outline-none"
                              placeholder=" "
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[10px] font-medium text-[#667085]">
                            Email
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 pt-3 pb-2.5 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:border-transparent">
                            <Envelope
                              size={18}
                              className="text-[#98A2B3] shrink-0"
                            />
                            <input
                              type="email"
                              value={quotationForm.customerEmail}
                              onChange={(e) =>
                                setQuotationForm({
                                  ...quotationForm,
                                  customerEmail: e.target.value,
                                })
                              }
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] focus:ring-0 outline-none"
                              placeholder=" "
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[10px] font-medium text-[#667085]">
                            Valid Till (YYYY-MM-DD)
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 pt-3 pb-2.5 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:border-transparent">
                            <Calendar
                              size={18}
                              className="text-[#98A2B3] shrink-0"
                            />
                            <input
                              type="date"
                              value={quotationForm.validTill}
                              onChange={(e) =>
                                setQuotationForm({
                                  ...quotationForm,
                                  validTill: e.target.value,
                                })
                              }
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] focus:ring-0 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                        Base price override{" "}
                        <span className="font-normal normal-case text-[#667085]">
                          (optional)
                        </span>
                      </p>
                      <input
                        value={quotationForm.basePrice}
                        onChange={(e) =>
                          setQuotationForm({
                            ...quotationForm,
                            basePrice: e.target.value.replace(/[^\d.]/g, ""),
                          })
                        }
                        className="w-full px-3 py-2.5 border border-[#EAECF0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                        placeholder="Leave blank to use negotiation unit base"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                          Additional charges{" "}
                          <span className="font-normal normal-case text-[#667085]">
                            (optional)
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const label = newAdditionalCharge.label.trim();
                            const amountNum = parseFloat(
                              newAdditionalCharge.amount
                            );
                            if (!label) return;
                            if (Number.isNaN(amountNum) || amountNum <= 0)
                              return;
                            setQuotationForm({
                              ...quotationForm,
                              additionalCharges: [
                                ...quotationForm.additionalCharges,
                                { label, amount: amountNum },
                              ],
                            });
                            setNewAdditionalCharge({ label: "", amount: "" });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--primary-base)] text-white text-[11px] font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
                          disabled={!newAdditionalCharge.label.trim()}
                        >
                          <Plus size={14} weight="bold" />
                          Add
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={newAdditionalCharge.label}
                          onChange={(e) =>
                            setNewAdditionalCharge({
                              ...newAdditionalCharge,
                              label: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-[#EAECF0] rounded-lg text-sm"
                          placeholder="Label"
                        />
                        <input
                          value={newAdditionalCharge.amount}
                          onChange={(e) =>
                            setNewAdditionalCharge({
                              ...newAdditionalCharge,
                              amount: e.target.value.replace(/[^\d.]/g, ""),
                            })
                          }
                          className="w-full px-3 py-2 border border-[#EAECF0] rounded-lg text-sm"
                          placeholder="Amount"
                        />
                      </div>
                      {quotationForm.additionalCharges.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {quotationForm.additionalCharges.map((c, idx) => (
                            <div
                              key={`${c.label}-${idx}`}
                              className="flex items-center justify-between gap-2 border border-[#EAECF0] rounded-lg px-2.5 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#344054] truncate">
                                  {c.label}
                                </p>
                                <p className="text-[11px] text-[#98A2B3]">
                                  ₹{c.amount.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuotationForm({
                                    ...quotationForm,
                                    additionalCharges:
                                      quotationForm.additionalCharges.filter(
                                        (_, i) => i !== idx
                                      ),
                                  })
                                }
                                className="p-1.5 rounded-lg border border-[#EAECF0] hover:bg-[#F9FAFB]"
                                aria-label="Remove"
                              >
                                <Trash
                                  size={14}
                                  className="text-[#667085]"
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer: price preview + primary CTA */}
            <div className="shrink-0 border-t border-[#EAECF0] bg-white p-4 space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 px-3 py-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200">
                  <MapPin size={16} className="text-slate-400" weight="regular" />
                </div>
                <div className="min-w-0 text-xs text-[#667085] leading-snug">
                  {isPriceLoading ? (
                    <span>Updating price…</span>
                  ) : selectedUnit && finalPrice > 0 ? (
                    <span>
                      <span className="font-semibold text-[#344054]">
                        Estimated total
                      </span>
                      {": "}
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span>Select a unit to see live price preview</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitQuotation()}
                disabled={isCreatingQuotation || !selectedUnit}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--primary-base)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Check size={20} weight="bold" />
                {isCreatingQuotation
                  ? "Creating…"
                  : `Create Quotation • ₹${(selectedUnit && finalPrice > 0 ? finalPrice : 0).toLocaleString("en-IN")}`}
              </button>

              <button
                type="button"
                onClick={() => setIsQuotationDrawerOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-[#667085] hover:text-[#344054] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create for a different project Side Drawer */}
      {isDifferentProjectQuotationDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setIsDifferentProjectQuotationDrawerOpen(false)}
          />

          <div
            className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[#EAECF0] shrink-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#101828]">
                  Create for a different project
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                  Select project & unit, then fill details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDifferentProjectQuotationDrawerOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={20} weight="regular" className="text-[#344054]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-5">
              {/* Project */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                    Project
                  </p>
                  <span className="text-[10px] font-semibold text-red-500 uppercase">
                    required
                  </span>
                </div>

                <select
                  value={differentProjectQuotationProjectId}
                  onChange={(e) => void handleDifferentProjectChange(e.target.value)}
                  className="w-full px-4 py-3 border border-[#EAECF0] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent cursor-pointer"
                >
                  <option value="">Tap to select project</option>
                  {properties.map((p) => (
                    <option key={p.backendId} value={p.backendId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                    Unit
                  </p>
                  <span className="text-[10px] font-semibold text-red-500 uppercase">
                    required
                  </span>
                </div>

                {!differentProjectQuotationProjectId ? (
                  <p className="text-xs text-[#667085]">Select a project first</p>
                ) : isDifferentProjectQuotationUnitsLoading ? (
                  <p className="text-xs text-[#667085]">Loading units…</p>
                ) : differentProjectQuotationUnits.length === 0 ? (
                  <p className="text-xs text-[#667085]">
                    No units available for this project
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {differentProjectQuotationUnits.map((unit) => {
                      const isBooked = unit.status === "booked";
                      const isSelected =
                        differentProjectQuotationSelectedUnitId === unit.backendId;
                      return (
                        <button
                          key={unit.backendId}
                          type="button"
                          disabled={isBooked}
                          onClick={() => void handleDifferentProjectUnitClick(unit.backendId)}
                          className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border-2 transition-all ${
                            isBooked
                              ? "border-red-200 bg-red-50/50 text-red-400 cursor-not-allowed line-through"
                              : isSelected
                                ? "border-[var(--primary-base)] bg-[var(--primary-selected)] text-[var(--primary-base)] shadow-sm scale-[1.02]"
                                : "border-emerald-200 bg-white text-emerald-700 hover:border-[var(--primary-base)]"
                          }`}
                        >
                          {unit.displayId}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discount + Customer Info (only the fields shown in mock) */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm p-3 sm:p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                    Discount
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={quotationForm.discountName}
                      onChange={(e) =>
                        setQuotationForm({
                          ...quotationForm,
                          discountName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-[#EAECF0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                      placeholder="Discount Name / Reason"
                    />
                    <input
                      value={quotationForm.discountPrice}
                      onChange={(e) =>
                        setQuotationForm({
                          ...quotationForm,
                          discountPrice: e.target.value.replace(/[^\d.]/g, ""),
                        })
                      }
                      className="w-full px-3 py-2.5 border border-[#EAECF0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
                      placeholder="Amount (₹)"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                    Customer info
                  </p>
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="block text-xs font-medium text-[#667085] mb-2">
                        Customer Name
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 py-2">
                        <User size={18} className="text-[#98A2B3] shrink-0" />
                        <input
                          value={quotationForm.customerName}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              customerName: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] outline-none"
                          placeholder=" "
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium text-[#667085] mb-2">
                        Phone
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 py-2">
                        <Phone size={18} className="text-[#98A2B3] shrink-0" />
                        <input
                          value={quotationForm.customerContact}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              customerContact: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] outline-none"
                          placeholder=" "
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium text-[#667085] mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 py-2">
                        <Envelope size={18} className="text-[#98A2B3] shrink-0" />
                        <input
                          type="email"
                          value={quotationForm.customerEmail}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              customerEmail: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] outline-none"
                          placeholder=" "
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium text-[#667085] mb-2">
                        Valid Till (YYYY-MM-DD)
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] px-3 py-2">
                        <Calendar size={18} className="text-[#98A2B3] shrink-0" />
                        <input
                          type="date"
                          value={quotationForm.validTill}
                          onChange={(e) =>
                            setQuotationForm({
                              ...quotationForm,
                              validTill: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#101828] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: price preview + primary CTA */}
            <div className="shrink-0 border-t border-[#EAECF0] bg-white p-4 space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 px-3 py-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200">
                  <MapPin size={16} className="text-slate-400" weight="regular" />
                </div>
                <div className="min-w-0 text-xs text-[#667085] leading-snug">
                  {isPriceLoading ? (
                    <span>Updating price…</span>
                  ) : differentProjectQuotationSelectedUnitId && finalPrice > 0 ? (
                    <span>
                      <span className="font-semibold text-[#344054]">
                        Estimated total
                      </span>
                      {": "}
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span>Select a unit to see live price preview</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitDifferentProjectQuotation()}
                disabled={
                  isCreatingQuotation || !differentProjectQuotationSelectedUnitId
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--primary-base)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Check size={20} weight="bold" />
                {isCreatingQuotation
                  ? "Creating…"
                  : `Create Quotation • ₹${(differentProjectQuotationSelectedUnitId && finalPrice > 0 ? finalPrice : 0).toLocaleString("en-IN")}`}
              </button>

              <button
                type="button"
                onClick={() => setIsDifferentProjectQuotationDrawerOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-[#667085] hover:text-[#344054] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

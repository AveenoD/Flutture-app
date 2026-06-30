"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Home,
  CalendarCheck,
  Clock,
  Hand,
  TrendingUp,
  Star,
  PenSquare,
  MessageSquare,
  Plus,
  Phone,
  UserPlus,
  MapPin,
  BookOpen,
  Circle,
  XCircle,
  AlertCircle,
  CheckCircle,
  Search,
  Download,
  RefreshCw,
  Trash2,
  Columns,
  Eye,
  Edit,
  ArrowLeft,
} from "lucide-react";
import KPICard from "@/components/ui/kpiCard";
import { listLeads, LeadResponse } from "@/lib/leadsApi";
import { blockUser, getUserById, updateUser, UserDetail } from "@/lib/usersApi";
import { listTeams, TeamListItem } from "@/lib/teamsApi";

type EditEmployeeForm = {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  dob: string;
  employee_id: string;
  team_id: string;
  avatar_url: string;
  status: "active" | "inactive" | "suspended" | "on_leave";
};

function EmployeeDetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"performance" | "activity">(
    "performance"
  );
  const [user, setUser] = useState<UserDetail | null>(null);
  const [leadRows, setLeadRows] = useState<LeadResponse[]>([]);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [teamAssignError, setTeamAssignError] = useState<string | null>(null);
  const [teamAssignSuccess, setTeamAssignSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [suspendSuccess, setSuspendSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditEmployeeForm>({
    name: "",
    email: "",
    phone: "",
    gender: "male",
    dob: "",
    employee_id: "",
    team_id: "",
    avatar_url: "",
    status: "active",
  });

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setError("Employee id is missing.");
      return;
    }
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserById(id);
        setUser(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load employee details"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [searchParams]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadMetrics = async () => {
      setMetricsLoading(true);
      setMetricsError(null);

      try {
        const [leadResult, teamResult] = await Promise.allSettled([
          listLeads({ page: 1, limit: 1000 }),
          listTeams(),
        ]);

        if (cancelled) return;

        setLeadRows(
          leadResult.status === "fulfilled" && Array.isArray(leadResult.value.leads)
            ? leadResult.value.leads
            : []
        );
        setTeams(
          teamResult.status === "fulfilled" && Array.isArray(teamResult.value.teams)
            ? teamResult.value.teams
            : []
        );

        if (leadResult.status === "rejected" || teamResult.status === "rejected") {
          setMetricsError("Some employee metrics could not be loaded.");
        }
      } catch (err) {
        if (!cancelled) {
          setMetricsError(
            err instanceof Error ? err.message : "Failed to load employee metrics"
          );
        }
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    };

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const formatDateForInput = (value?: string | null) =>
    value ? value.split("T")[0] : "";

  const openEditProfile = () => {
    if (!user) return;

    setEditError(null);
    setEditSuccess(null);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: (user.gender as EditEmployeeForm["gender"]) || "male",
      dob: formatDateForInput(user.dob),
      employee_id: user.employee_id || "",
      team_id: user.team_id || "",
      avatar_url: user.avatar_url || "",
      status: (user.status as EditEmployeeForm["status"]) || "active",
    });
    setIsEditOpen(true);
  };

  const openAddToTeam = () => {
    setTeamAssignError(null);
    setTeamAssignSuccess(null);
    setSelectedTeamId(user?.team_id || "");
    setIsTeamModalOpen(true);
  };

  const closeAddToTeam = () => {
    setIsTeamModalOpen(false);
    setTeamAssignError(null);
    setTeamAssignSuccess(null);
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedTeamId.trim()) {
      setTeamAssignError("Please select a team.");
      return;
    }

    setIsSavingTeam(true);
    setTeamAssignError(null);
    setTeamAssignSuccess(null);

    try {
      const updated = await updateUser(user.id, { team_id: selectedTeamId.trim() });
      setUser(updated);
      setTeamAssignSuccess("Employee added to team successfully.");
      setIsTeamModalOpen(false);
    } catch (err) {
      setTeamAssignError(err instanceof Error ? err.message : "Failed to add employee to team");
    } finally {
      setIsSavingTeam(false);
    }
  };

  const closeEditProfile = () => {
    setIsEditOpen(false);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSuspendUser = async () => {
    if (!user || user.status !== "active") return;

    const confirmed = window.confirm(
      "Suspend this employee? They will lose access until reactivated by GM."
    );
    if (!confirmed) return;

    setIsSuspending(true);
    setSuspendError(null);
    setSuspendSuccess(null);

    try {
      await blockUser(user.id, { status: "suspended" });
      setUser((prev) => (prev ? { ...prev, status: "suspended" } : prev));
      setSuspendSuccess("Employee suspended successfully.");
    } catch (err) {
      setSuspendError(
        err instanceof Error ? err.message : "Failed to suspend employee"
      );
    } finally {
      setIsSuspending(false);
    }
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingEdit(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const updated = await updateUser(user.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        gender: editForm.gender,
        dob: editForm.dob || undefined,
        employee_id: editForm.employee_id.trim(),
        team_id: editForm.team_id.trim() ? editForm.team_id.trim() : null,
        avatar_url: editForm.avatar_url.trim() ? editForm.avatar_url.trim() : null,
        status: editForm.status,
      });

      setUser(updated);
      setEditSuccess("Profile updated successfully.");
      setIsEditOpen(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update employee profile"
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const kpiData = useMemo(() => {
    const targetUserId = user?.id;
    const targetUserType = user?.user_type?.toLowerCase();

    const normalizeStage = (stage?: string | null) =>
      (stage || "").trim().toLowerCase().replace(/-/g, "_");

    const relevantLeads = leadRows.filter((lead) => {
      if (!targetUserId) return false;
      const directAssignment =
        lead.assigned_to_user_id === targetUserId &&
        (!targetUserType || lead.assigned_to_user_type === targetUserType);
      const presalesFallback =
        targetUserType === "presales" && lead.presales_user_id === targetUserId;
      const salesFallback =
        targetUserType === "sales" && lead.sales_user_id === targetUserId;
      return directAssignment || presalesFallback || salesFallback;
    });

    const totalAssigned = relevantLeads.length;
    const propertyVisited = relevantLeads.filter((lead) => {
      const stage = normalizeStage(lead.stage);
      return stage === "site_visit" || stage === "property_visit";
    }).length;
    const bookingsClosed = relevantLeads.filter((lead) => {
      const stage = normalizeStage(lead.stage);
      return lead.status === "deal" || stage === "booking" || stage === "deal_closed";
    }).length;
    const rejected = relevantLeads.filter((lead) => lead.status === "rejected").length;

    const responseDurations = relevantLeads
      .map((lead) => {
        if (!lead.assigned_at) return null;
        const createdAt = new Date(lead.created_at).getTime();
        const assignedAt = new Date(lead.assigned_at).getTime();
        if (Number.isNaN(createdAt) || Number.isNaN(assignedAt) || assignedAt < createdAt) {
          return null;
        }
        return assignedAt - createdAt;
      })
      .filter((value): value is number => value !== null);

    const avgResponseMillis =
      responseDurations.length > 0
        ? Math.round(
            responseDurations.reduce((sum, value) => sum + value, 0) /
              responseDurations.length
          )
        : 0;

    const conversionRate =
      totalAssigned > 0 ? (bookingsClosed / totalAssigned) * 100 : 0;

    const teamRatingScore = (() => {
      if (!user?.team_id) return null;
      const team = teams.find((item) => item.id === user.team_id);
      return typeof team?.team_rating_score === "number" ? team.team_rating_score : null;
    })();

    const formatMillis = (millis: number) => {
      if (!millis || millis <= 0) return "0m";
      const totalMinutes = Math.round(millis / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    return [
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-primary)] text-[var(--primary-base)] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : String(totalAssigned),
        label: "Leads Assigned",
        trend: totalAssigned > 0 ? "real data" : "no leads",
        trendUp: true,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-purple)] text-[var(--purple)] flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : String(propertyVisited),
        label: "Property Visited",
        trend: "real data",
        trendUp: true,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-warning)] text-[var(--warning)] flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : String(bookingsClosed),
        label: "Bookings Closed",
        trend: "real data",
        trendUp: true,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-success)] text-[var(--success)] flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : formatMillis(avgResponseMillis),
        label: "Avg. Response Time",
        trend: "real data",
        trendUp: false,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-error)] text-[var(--error)] flex items-center justify-center">
            <Hand className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : String(rejected),
        label: "Rejected",
        trend: "real data",
        trendUp: false,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-success)] text-[var(--success)] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        ),
        value: metricsLoading ? "..." : `${conversionRate.toFixed(1)}%`,
        label: "Conversion Rate",
        trend: "real data",
        trendUp: true,
      },
      {
        icon: (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-purple)] text-[var(--purple)] flex items-center justify-center">
            <Star className="w-4 h-4" />
          </div>
        ),
        value:
          metricsLoading || teamRatingScore === null
            ? metricsLoading
              ? "..."
              : "N/A"
            : `${(teamRatingScore / 2).toFixed(1)}/5`,
        label: "Client Satisfaction",
        trend: teamRatingScore === null ? "team score" : "team rating",
        trendUp: true,
      },
    ];
  }, [leadRows, metricsLoading, teams, user?.id, user?.team_id, user?.user_type]);

  const activityLeadsData = useMemo(() => {
    const targetUserId = user?.id;
    const targetUserType = user?.user_type?.toLowerCase();
    if (!targetUserId) return [];

    const relevantLeads = leadRows.filter((lead) => {
      const directAssignment =
        lead.assigned_to_user_id === targetUserId &&
        (!targetUserType || lead.assigned_to_user_type === targetUserType);
      const presalesFallback =
        targetUserType === "presales" && lead.presales_user_id === targetUserId;
      const salesFallback =
        targetUserType === "sales" && lead.sales_user_id === targetUserId;
      return directAssignment || presalesFallback || salesFallback;
    });

    const now = Date.now();
    const toTimeAgo = (iso: string) => {
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return "";
      const diffMs = Math.max(0, now - t);
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 60) return `${minutes} mins ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      return `${days} days ago`;
    };

    const pillTypeFromStatus = (status?: string | null): PillType => {
      const s = (status || "").toLowerCase();
      if (["deal", "qualified", "hot"].includes(s)) return "green";
      if (["warm", "called", "negotiation"].includes(s)) return "blue";
      if (["cold", "unqualified", "landed"].includes(s)) return "orange";
      if (["rejected"].includes(s)) return "red";
      return "blue";
    };

    return relevantLeads.map((lead, index) => {
      const location = [lead.city, lead.state].filter(Boolean).join(", ") || "—";
      const budgetMin = typeof lead.budget_min === "number" ? lead.budget_min : null;
      const budgetMax = typeof lead.budget_max === "number" ? lead.budget_max : null;
      const budget =
        budgetMin !== null && budgetMax !== null
          ? `${Math.round(budgetMin / 100000)}L - ${Math.round(budgetMax / 100000)}L`
          : budgetMin !== null
            ? `${Math.round(budgetMin / 100000)}L+`
            : "—";

      const source = (lead.source || "—").toString();
      const statusLabel = (lead.status || "—").toString();
      const statusType = pillTypeFromStatus(statusLabel);

      return {
        id: lead.id || index + 1,
        name: lead.name || "—",
        phone: lead.phone || "—",
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id || String(index + 1))}`,
        budget,
        programName: lead.project_title || lead.project_id || "—",
        time: toTimeAgo(lead.created_at),
        location,
        status: statusLabel,
        statusType,
        sources: source,
        sourcesType: statusType,
      };
    });
  }, [leadRows, user?.id, user?.user_type]);

  const activityBookingsData = useMemo(() => {
    const targetUserId = user?.id;
    const targetUserType = user?.user_type?.toLowerCase();
    if (!targetUserId) return [];

    const normalizeStage = (stage?: string | null) =>
      (stage || "").trim().toLowerCase().replace(/-/g, "_");

    const relevantLeads = leadRows.filter((lead) => {
      const directAssignment =
        lead.assigned_to_user_id === targetUserId &&
        (!targetUserType || lead.assigned_to_user_type === targetUserType);
      const presalesFallback =
        targetUserType === "presales" && lead.presales_user_id === targetUserId;
      const salesFallback =
        targetUserType === "sales" && lead.sales_user_id === targetUserId;
      return directAssignment || presalesFallback || salesFallback;
    });

    const bookingLeads = relevantLeads.filter((lead) => {
      const stage = normalizeStage(lead.stage);
      const status = (lead.status || "").toLowerCase();
      return status === "deal" || stage === "booking" || stage === "deal_closed";
    });

    return bookingLeads.map((lead, index) => {
      const amount =
        typeof lead.budget_min === "number" || typeof lead.budget_max === "number"
          ? `₹${Math.round((lead.budget_max ?? lead.budget_min ?? 0)).toLocaleString("en-IN")}`
          : "—";

      return {
        id: lead.id || index + 1,
        name: lead.name || "—",
        phone: lead.phone || "—",
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id || String(index + 1))}`,
        bookingId: (lead.id || "—").toString().slice(0, 8).toUpperCase(),
        project: lead.project_title || "—",
        unit: lead.project_id || "—",
        amount,
        agent: user?.name || "—",
        status: (lead.status || lead.stage || "—").toString(),
        statusType: ((lead.status || "").toLowerCase() === "deal" ? "green" : "blue") as PillType,
      };
    });
  }, [leadRows, user?.id, user?.name, user?.user_type]);

  const activityTeamsData = useMemo(() => {
    const teamId = user?.team_id?.trim();
    if (!teamId) return [];

    const team = teams.find((t) => t.id === teamId);
    if (!team) return [];

    const formatLabel = (value: string) =>
      value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

    const tags = [
      ...(team.labels || []).map((l) => formatLabel(l)),
      team.team_type ? formatLabel(team.team_type) : "",
    ].filter(Boolean);

    return [
      {
        id: team.id,
        name: team.team_title,
        leader: team.manager_name || "—",
        avatar: team.team_logo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(team.id)}`,
        members: team.member_count ?? 0,
        projects: team.project_assigned_ids?.length ?? 0,
        tags: tags.length ? tags.slice(0, 3) : ["—"],
      },
    ];
  }, [teams, user?.team_id]);

  return (
    <div className="p-6 bg-[var(--background)] min-h-full">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-base)] transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Error / Loading */}
      {loading && (
        <div className="mb-4 rounded-md bg-[var(--surface-primary)] px-4 py-2 text-sm text-[var(--primary-base)]">
          Loading employee details...
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-[var(--surface-error)] px-4 py-2 text-sm text-[var(--error)]">
          {error}
        </div>
      )}
      {metricsError && !loading && (
        <div className="mb-4 rounded-md bg-[var(--surface-warning)] px-4 py-2 text-sm text-[var(--warning)]">
          {metricsError}
        </div>
      )}
      {suspendError && (
        <div className="mb-4 rounded-md bg-[var(--surface-error)] px-4 py-2 text-sm text-[var(--error)]">
          {suspendError}
        </div>
      )}
      {suspendSuccess && (
        <div className="mb-4 rounded-md bg-[var(--surface-success)] px-4 py-2 text-sm text-[var(--success)]">
          {suspendSuccess}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-[var(--background)] rounded-xl p-5 mb-5 border border-[var(--border-color)] shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex gap-4">
            <div className="relative w-[70px] h-[70px] rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={
                  user?.avatar_url && user.avatar_url.trim() !== ""
                    ? user.avatar_url
                    : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
                }
                alt={user?.name || "Employee avatar"}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-1">
                {user?.name || "Employee"}{" "}
                <span className="bg-[var(--surface-success)] text-[var(--success)] px-2 py-0.5 rounded text-[10px] font-bold ml-1 inline-flex items-center gap-1">
                  <Circle className="w-1.5 h-1.5 fill-current" />
                  Online
                </span>
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                {user?.employee_id
                  ? `Employee ID: ${user.employee_id}`
                  : "Employee profile"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-xs text-[var(--primary-base)]">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {user?.email || "--"}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {user?.phone || "--"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={openEditProfile}
              className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-1.5"
            >
              <PenSquare className="w-3 h-3" />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={handleSuspendUser}
              disabled={isSuspending || user?.status !== "active"}
              className="px-3 py-2 rounded-md text-xs font-medium bg-[var(--error)] text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSuspending
                ? "Suspending..."
                : user?.status === "active"
                ? "Suspend"
                : "Suspended"}
            </button>
            <button className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Send Message
            </button>
            <button className="px-3 py-2 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-3 h-3" />
              Assign Project
            </button>
          </div>
        </div>
      </div>

      <h3 className="text-base font-semibold text-[var(--text-dark)] mb-4">Metrices Breakdown</h3>

      {/* Mobile: Horizontal scrollable cards */}
      <div className="block sm:hidden mb-6">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="flex-shrink-0 w-[calc(100vw-3rem)] max-w-[280px]">
              <KPICard
                icon={kpi.icon}
                trend={kpi.trend}
                trendUp={kpi.trendUp}
                value={kpi.value}
                label={kpi.label}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Desktop: Grid layout */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, idx) => (
          <KPICard
            key={idx}
            icon={kpi.icon}
            trend={kpi.trend}
            trendUp={kpi.trendUp}
            value={kpi.value}
            label={kpi.label}
          />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-[var(--border-color)] mb-6">
        <button
          onClick={() => setActiveTab('performance')}
          className={`pb-2.5 text-sm font-semibold transition-colors relative ${
            activeTab === 'performance'
              ? 'text-[var(--primary-base)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Performance Overview
          {activeTab === 'performance' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-2.5 text-sm font-semibold transition-colors relative ${
            activeTab === 'activity'
              ? 'text-[var(--primary-base)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Activity & Tasks
          {activeTab === 'activity' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'performance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left Column */}
          <div className="space-y-5">
            {/* User Journey Metrics */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  User Journey Metrics
                </h3>
                <div className="flex gap-1">
                  <button className="px-2 py-1 text-[10px] rounded bg-[var(--primary-base)] text-white border-none">
                    Week
                  </button>
                  <button className="px-2 py-1 text-[10px] rounded border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)]">
                    Month
                  </button>
                </div>
              </div>
              <div className="h-[250px] w-full relative bg-gradient-to-b from-[var(--surface-primary)] to-[var(--background)] rounded-lg mt-4 flex items-end p-2.5 overflow-hidden">
                <svg
                  className="w-full h-[100px]"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                >
                  <path
                    fill="rgba(0, 130, 224, 0.13)"
                    d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96V320H0Z"
                  />
                  <path
                    fill="none"
                    stroke="var(--primary-base)"
                    strokeWidth="3"
                    d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96"
                  />
                </svg>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  Activity Timeline
                </h3>
                <a
                  href="#"
                  className="text-[var(--primary-base)] text-xs font-semibold hover:underline"
                >
                  View All
                </a>
              </div>
              <TimelineItem
                icon={<UserPlus className="w-3 h-3" />}
                iconBg="bg-[var(--surface-primary)]"
                iconColor="text-[var(--primary-base)]"
                title="New Lead Assigned"
                description="Luxury Apartment inquiry from John Miller - Seaside Heights Project"
                date="11/11/2024"
                time="09:30 AM"
              />
              <TimelineItem
                icon={<Phone className="w-3 h-3" />}
                iconBg="bg-[var(--surface-success)]"
                iconColor="text-[var(--success)]"
                title="Client Call Completed"
                description="Follow up call with Sarah Chen - 15 minutes discussion about payment plans"
                date="11/11/2024"
                time="11:45 PM"
              />
              <TimelineItem
                icon={<MapPin className="w-3 h-3" />}
                iconBg="bg-[var(--surface-purple)]"
                iconColor="text-[var(--purple)]"
                title="Site Visit Conducted"
                description="Showed 2 units at Skyline Towers to the Rodriguez Family"
                date="11/11/2024"
                time="01:20 PM"
              />
              <TimelineItem
                icon={<BookOpen className="w-3 h-3" />}
                iconBg="bg-[var(--surface-warning)]"
                iconColor="text-[var(--warning)]"
                title="Booking Closed"
                description="Custom Penthouse sold (Unit 404) in Marina Bay - $450,000"
                date="11/11/2024"
                time="03:15 PM"
              />
            </div>

            {/* Recent Follow-Ups */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4 text-[var(--primary-base)]" />
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  Recent Follow-Ups
                </h3>
              </div>
              <FollowupItem
                avatar="https://i.pravatar.cc/100?img=11"
                name="Sarah Johnson"
                status="Active"
                statusBg="bg-[var(--surface-success)]"
                statusColor="text-[var(--success)]"
                description="Robert Taylor - Ocean View Residences"
                subDescription="Interested in 2BHK and scheduled a visit"
                time="2 hour ago"
              />
              <FollowupItem
                avatar="https://i.pravatar.cc/100?img=12"
                name="Mike Chan"
                status="No Reply"
                statusBg="bg-[var(--surface-warning)]"
                statusColor="text-[var(--warning)]"
                description="Jennifer Davis - Downtown Plaza"
                subDescription="Left voice mail, will try again tomorrow"
                time="4 hour ago"
              />
              <button className="w-full mt-4 h-[38px] bg-[var(--primary-base)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
                View All Follow-Ups
              </button>
            </div>

            {/* Scheduled Visits */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="w-4 h-4 text-[var(--warning)]" />
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  Scheduled Visits
                </h3>
              </div>
              <div className="flex gap-4 py-3 border-b border-[var(--hover-bg)]">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-[var(--text-dark)] mb-1">
                    Sarah Johnson{' '}
                    <span className="bg-[var(--surface-success)] text-[var(--success)] px-1.5 py-0.5 rounded text-[9px] font-semibold">
                      Confirmed
                    </span>
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)]">Amanda Jameson - Skyline Tower</p>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-sm font-semibold text-[var(--text-dark)]">Today 2:00 PM</div>
                </div>
              </div>
              <div className="flex gap-4 py-3 border-b border-[var(--hover-bg)]">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-[var(--text-dark)] mb-1">
                    Sarah Johnson{' '}
                    <span className="bg-[var(--surface-error)] text-[var(--error)] px-1.5 py-0.5 rounded text-[9px] font-semibold">
                      Pending
                    </span>
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Thomas Miller - Ocean View Residences
                  </p>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-sm font-semibold text-[var(--text-dark)]">Today 4:30 PM</div>
                </div>
              </div>
              <button className="w-full mt-4 h-[38px] bg-[var(--primary-base)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
                View All Visits
              </button>
            </div>

            {/* Missed Follow-Ups */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-4 h-4 text-[var(--error)]" />
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  Missed Follow-Ups
                </h3>
              </div>
              <div className="flex gap-4 py-3">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-[var(--text-dark)] mb-1">Emma Davis</h5>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Thomas Miller - Ocean View Residences
                    <br />
                    Agent Unavailable
                  </p>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-[var(--text-secondary)]">2 hour ago</div>
                </div>
              </div>
              <button className="w-full mt-4 h-[38px] bg-[var(--primary-base)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
                Reschedule All
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Manager Alerts */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">Manager Alerts</h3>
                <span className="text-[10px] text-[var(--error)] cursor-pointer">3 Alerts</span>
              </div>
              <AlertCard
                type="warning"
                title="Communication Analysis"
                time="2 hour ago"
                message="AI detected speech tone in 35% of calls"
              />
              <AlertCard
                type="success"
                title="Follow-up Consistency"
                time="5 hour ago"
                message="Excellent follow-up pattern with 98% consistency"
              />
              <AlertCard
                type="error"
                title="Missed Follow-up"
                time="2 hour ago"
                message="Premium lead from Ocean View Residences missed 2nd follow-up"
              />
              <button className="w-full mt-4 h-[38px] bg-[var(--primary-base)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
                View All Alerts
              </button>
            </div>

            {/* Work Status */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">Work Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <StatusBox value="22" label="Active Workdays" bg="bg-[var(--surface-success)]" color="text-[var(--success)]" />
                <StatusBox
                  value="2"
                  label="Unscheduled Absence"
                  bg="bg-[var(--surface-error)]"
                  color="text-[var(--error)]"
                />
                <StatusBox
                  value="4"
                  label="Approved Leaves"
                  bg="bg-[var(--surface-primary)]"
                  color="text-[var(--primary-base)]"
                />
                <StatusBox
                  value="3"
                  label="Late Check Ins"
                  bg="bg-[var(--surface-warning)]"
                  color="text-[var(--warning)]"
                />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-dark)] mb-2.5">Recent Activity</h4>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[var(--text-secondary)] font-medium py-2">Date</th>
                    <th className="text-left text-[var(--text-secondary)] font-medium py-2">Status</th>
                    <th className="text-left text-[var(--text-secondary)] font-medium py-2">In</th>
                    <th className="text-left text-[var(--text-secondary)] font-medium py-2">Out</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 border-t border-[var(--hover-bg)]">Jan 15</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">
                      <span className="bg-[var(--surface-success)] text-[var(--success)] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Present
                      </span>
                    </td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">09:15</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">06:30</td>
                  </tr>
                  <tr>
                    <td className="py-2 border-t border-[var(--hover-bg)]">Jan 14</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">
                      <span className="bg-[var(--surface-success)] text-[var(--success)] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Present
                      </span>
                    </td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">09:15</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">06:30</td>
                  </tr>
                  <tr>
                    <td className="py-2 border-t border-[var(--hover-bg)]">Jan 13</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">
                      <span className="bg-[var(--surface-warning)] text-[var(--warning)] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Late
                      </span>
                    </td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">10:45</td>
                    <td className="py-2 border-t border-[var(--hover-bg)]">06:30</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Client Feedbacks */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">Client Feedbacks</h3>
              </div>
              <div className="border-b border-[var(--border-color)] pb-2.5 mb-2.5">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-xs text-[var(--text-dark)]">David Park</strong>
                  <span className="text-[10px] text-[var(--warning)]">★★★★★</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] italic mt-1">
                  &quot;Sarah was extremely professional and helped us find the perfect home. Her
                  knowledge is outstanding.&quot;
                </p>
              </div>
            </div>

            {/* Recent Complaint */}
            <div className="bg-[var(--surface-error)] rounded-xl p-5 border border-[var(--error)] shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">Recent Complaint</h3>
                <span className="bg-[var(--error)] text-white px-1.5 py-0.5 rounded text-[9px] font-semibold">
                  Resolved
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                &quot;Issue with document collection timing was handled within 2 hours.&quot;
              </p>
            </div>

            {/* Lead Sources */}
            <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[var(--text-dark)]">Lead Sources</h3>
              </div>
              <div className="w-[150px] h-[150px] mx-auto my-5 rounded-full flex items-center justify-center relative" style={{
                background: `conic-gradient(var(--primary-base) 0% 75%, var(--border-color) 75% 100%)`
              }}>
                <div className="w-[100px] h-[100px] bg-[var(--background)] rounded-full" />
              </div>
              <div className="flex justify-center gap-4 text-[11px] flex-wrap">
                <span className="flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-[var(--primary-base)] text-[var(--primary-base)]" />
                  Assign By Calls (75%)
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-[var(--border-color)] text-[var(--border-color)]" />
                  Walking (25%)
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* All Leads Section */}
          <DataBlock
            title="All Leads"
            searchPlaceholder="Search leads..."
            showAddButton={false}
            data={activityLeadsData}
            columns={leadsColumns}
            type="leads"
          />

          {/* Current Bookings Section */}
          <DataBlock
            title="Current Bookings"
            searchPlaceholder="Search bookings..."
            showAddButton={false}
            data={activityBookingsData}
            columns={bookingsColumns}
            type="bookings"
          />

          {/* Active Team Section */}
          <DataBlock
            title="Active Team"
            searchPlaceholder="Search teams..."
            showAddButton={true}
            addButtonText="+ Add to Team"
            data={activityTeamsData}
            columns={[]}
            type="teams"
            onAddClick={openAddToTeam}
          />

          {/* Team History Section */}
          <DataBlock
            title="Team History"
            searchPlaceholder="Search teams..."
            showAddButton={false}
            data={teamHistoryData}
            columns={teamHistoryColumns}
            type="teamHistory"
          />
        </div>
      )}

      {isEditOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-dark)]">Edit Profile</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Update employee details and save changes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditProfile}
                className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-dark)]"
                aria-label="Close edit profile"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4 px-5 py-5">
              {editError && (
                <div className="rounded-md bg-[var(--surface-error)] px-4 py-2 text-sm text-[var(--error)]">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="rounded-md bg-[var(--surface-success)] px-4 py-2 text-sm text-[var(--success)]">
                  {editSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Name</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Email</span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Phone</span>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Employee ID</span>
                  <input
                    type="text"
                    value={editForm.employee_id}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, employee_id: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Gender</span>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        gender: e.target.value as EditEmployeeForm["gender"],
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Date of Birth</span>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dob: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Team</span>
                  <select
                    value={editForm.team_id}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, team_id: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                  >
                    <option value="">No team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.team_title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-[var(--text-primary)]">Status</span>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value as EditEmployeeForm["status"],
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="block font-medium text-[var(--text-primary)]">Avatar URL</span>
                  <input
                    type="url"
                    value={editForm.avatar_url}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-color)] pt-4">
                <button
                  type="button"
                  onClick={closeEditProfile}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-lg bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTeamModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-dark)]">Add to Team</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Assign this employee to an active team.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddToTeam}
                className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-dark)]"
                aria-label="Close add to team"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTeam} className="space-y-4 px-5 py-5">
              {teamAssignError && (
                <div className="rounded-md bg-[var(--surface-error)] px-4 py-2 text-sm text-[var(--error)]">
                  {teamAssignError}
                </div>
              )}
              {teamAssignSuccess && (
                <div className="rounded-md bg-[var(--surface-success)] px-4 py-2 text-sm text-[var(--success)]">
                  {teamAssignSuccess}
                </div>
              )}

              <label className="space-y-2 text-sm">
                <span className="block font-medium text-[var(--text-primary)]">Team</span>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.team_title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddToTeam}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTeam}
                  className="rounded-lg bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {isSavingTeam ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline Item Component
interface TimelineItemProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  date: string;
  time: string;
}

function TimelineItem({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  date,
  time,
}: TimelineItemProps) {
  return (
    <div className="flex gap-4 py-3 border-b border-[var(--hover-bg)] last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h5 className="text-sm font-medium text-[var(--text-dark)] mb-0.5">{title}</h5>
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{description}</p>
      </div>
      <div className="text-right min-w-[80px]">
        <div className="text-[10px] text-[var(--text-secondary)]">{date}</div>
        <div className="text-[10px] text-[var(--text-secondary)]">{time}</div>
      </div>
    </div>
  );
}

// Followup Item Component
interface FollowupItemProps {
  avatar: string;
  name: string;
  status: string;
  statusBg: string;
  statusColor: string;
  description: string;
  subDescription: string;
  time: string;
}

function FollowupItem({
  avatar,
  name,
  status,
  statusBg,
  statusColor,
  description,
  subDescription,
  time,
}: FollowupItemProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--hover-bg)] last:border-0">
      <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <h5 className="text-sm font-medium text-[var(--text-dark)] mb-0.5">
          {name}{' '}
          <span className={`${statusBg} ${statusColor} px-1.5 py-0.5 rounded text-[9px] font-semibold ml-1`}>
            {status}
          </span>
        </h5>
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
          {description}
          <br />
          {subDescription}
        </p>
      </div>
      <div className="text-right min-w-[100px]">
        <div className="text-xs text-[var(--text-secondary)]">{time}</div>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 bg-[var(--background)] min-h-full">
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-base)] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="rounded-md bg-[var(--surface-primary)] px-4 py-2 text-sm text-[var(--primary-base)]">
            Loading employee details...
          </div>
        </div>
      }
    >
      <EmployeeDetailPageInner />
    </Suspense>
  );
}

// Alert Card Component
interface AlertCardProps {
  type: 'warning' | 'success' | 'error';
  title: string;
  time: string;
  message: string;
}

function AlertCard({ type, title, time, message }: AlertCardProps) {
  const styles = {
    warning: {
      bg: 'bg-[var(--surface-warning)]',
      border: 'border-l-[var(--warning)]',
    },
    success: {
      bg: 'bg-[var(--surface-success)]',
      border: 'border-l-[var(--success)]',
    },
    error: {
      bg: 'bg-[var(--surface-error)]',
      border: 'border-l-[var(--error)]',
    },
  };

  return (
    <div
      className={`${styles[type].bg} p-3 rounded-lg mb-2.5 text-xs border-l-4 ${styles[type].border}`}
    >
      <div className="flex justify-between items-center mb-1">
        <strong className="text-[var(--text-dark)]">{title}</strong>
        <span className="text-[var(--text-tertiary)]">{time}</span>
      </div>
      <div className="text-[var(--text-secondary)]">{message}</div>
    </div>
  );
}

// Status Box Component
interface StatusBoxProps {
  value: string;
  label: string;
  bg: string;
  color: string;
}

function StatusBox({ value, label, bg, color }: StatusBoxProps) {
  return (
    <div className={`${bg} ${color} p-3 rounded-lg text-left`}>
      <strong className="text-lg block">{value}</strong>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}

// Data structures
type PillType = 'green' | 'blue' | 'orange' | 'red';

// NOTE: All Leads in Activity & Tasks uses live API data via `activityLeadsData`.

// NOTE: Current Bookings in Activity & Tasks uses live API data via `activityBookingsData`.

// NOTE: Active Team in Activity & Tasks uses live API data via `activityTeamsData`.

const teamHistoryData: Array<{
  id: number;
  teamName: string;
  teamLeader: string;
  salesRoles: string;
  project: string;
  reportingPeriod: string;
  performance: string;
  performanceType: PillType;
}> = [
  {
    id: 1,
    teamName: 'Luxury Homes Division',
    teamLeader: 'Sarah Johnson',
    salesRoles: 'Property Consultant',
    project: 'Golden Gate Residency',
    reportingPeriod: '2024-06-01 to 2024-12-15',
    performance: 'Average',
    performanceType: 'orange',
  },
  {
    id: 2,
    teamName: 'Residential Team A',
    teamLeader: 'Maaz Khatik',
    salesRoles: 'Sales Manager',
    project: 'Garden View Apartments',
    reportingPeriod: '2023-01-15 to 2023-08-30',
    performance: 'Good',
    performanceType: 'blue',
  },
];

const leadsColumns = [
  'Name & Phone',
  'Budget',
  'Prog. Name & Time',
  'Location',
  'Status',
  'Sources',
  'Action',
];

const bookingsColumns = [
  'Full Name',
  'Booking ID',
  'Project & Unit',
  'Amount',
  'Agent',
  'Status',
  'Action',
];

const teamHistoryColumns = [
  'Team Name',
  'Team Leader',
  'Sales Roles',
  'Project',
  'Reporting Period',
  'Performance',
];

// DataBlock Component
interface DataBlockProps {
  title: string;
  searchPlaceholder: string;
  showAddButton: boolean;
  addButtonText?: string;
  onAddClick?: () => void;
  data: any[];
  columns: string[];
  type: 'leads' | 'bookings' | 'teams' | 'teamHistory';
}

function DataBlock({
  title,
  searchPlaceholder,
  showAddButton,
  addButtonText = '+ Add',
  onAddClick,
  data,
  columns,
  type,
}: DataBlockProps) {
  const [selectAll, setSelectAll] = useState(false);
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="bg-[var(--background)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      {/* Mobile Header (separate card) */}
      <div className="block md:hidden border-b border-[var(--border-color)]">
        <div className="p-5">
          <h3 className="text-base font-semibold text-[var(--text-dark)] mb-4">{title}</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 w-full">
              <button className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                <Columns className="w-3 h-3" />
                Column
              </button>
              <input
                type="text"
                className="flex-1 min-w-0 px-3 py-2 rounded-md text-xs border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-opacity-20 w-full"
                placeholder={searchPlaceholder}
              />
            </div>
            {showAddButton && (
              <button
                type="button"
                onClick={onAddClick}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                {addButtonText}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block border-b border-[var(--border-color)]">
        <div className="p-5">
          <h3 className="text-base font-semibold text-[var(--text-dark)] mb-4">{title}</h3>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                <Columns className="w-3 h-3" />
                Column
              </button>
              <input
                type="text"
                className="flex-1 min-w-0 max-w-[300px] px-3 py-2 rounded-md text-xs border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-opacity-20"
                placeholder={searchPlaceholder}
              />
            </div>
            <div className="flex items-center gap-2">
              {!showAddButton && (
                <>
                  <button className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5">
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                  <button className="px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                  <button className="px-3 py-2 rounded-md text-xs font-medium bg-[var(--error)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}
              {showAddButton && (
                <button
                  type="button"
                  onClick={onAddClick}
                  className="px-3 py-2 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  {addButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {type === 'teams' ? (
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((team) => (
              <div
                key={team.id}
                className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 relative"
              >
                <button className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-dark)] transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={team.avatar}
                      alt={team.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-dark)]">{team.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{team.leader}</div>
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                    <Users className="w-3.5 h-3.5" />
                    {team.members} Members
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                    <BookOpen className="w-3.5 h-3.5" />
                    {team.projects} Projects Assigned
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-5">
                  {team.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium ${
                        idx === 1
                          ? 'bg-[var(--surface-success)] text-[var(--success-text)]'
                          : 'bg-[var(--active-bg)] text-[var(--text-primary)]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="w-full px-3 py-2 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors">
                  View Detail
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-[var(--hover-bg)]">
                  <th className="px-5 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {type === 'leads' &&
                  rows.map((lead) => (
                    <tr key={lead.id} className="border-b border-[var(--border-color)]">
                      <td className="px-5 py-4">
                        <input type="checkbox" className="cursor-pointer" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={lead.avatar}
                              alt={lead.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-dark)]">{lead.name}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{lead.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-[var(--primary-base)]">{lead.budget}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-[var(--text-dark)]">{lead.programName}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{lead.time}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{lead.location}</td>
                      <td className="px-5 py-4">
                        <Pill type={lead.statusType}>{lead.status}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Pill type={lead.sourcesType}>{lead.sources}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/all-leads/${encodeURIComponent(String(lead.id))}`}
                          className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          View Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                {type === 'bookings' &&
                  rows.map((booking) => (
                    <tr key={booking.id} className="border-b border-[var(--border-color)]">
                      <td className="px-5 py-4">
                        <input type="checkbox" className="cursor-pointer" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={booking.avatar}
                              alt={booking.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-dark)]">{booking.name}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{booking.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{booking.bookingId}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-[var(--text-dark)]">{booking.project}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{booking.unit}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-[var(--text-dark)]">{booking.amount}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{booking.agent}</td>
                      <td className="px-5 py-4">
                        <Pill type={booking.statusType}>{booking.status}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/all-leads/${encodeURIComponent(String(booking.id))}`}
                          className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          View Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                {type === 'teamHistory' &&
                  rows.map((history) => (
                    <tr key={history.id} className="border-b border-[var(--border-color)]">
                      <td className="px-5 py-4">
                        <input type="checkbox" className="cursor-pointer" />
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{history.teamName}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{history.teamLeader}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{history.salesRoles}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{history.project}</td>
                      <td className="px-5 py-4 text-sm text-[var(--text-dark)]">{history.reportingPeriod}</td>
                      <td className="px-5 py-4">
                        <Pill type={history.performanceType}>{history.performance}</Pill>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-4">
            {type === 'leads' &&
              rows.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={lead.avatar}
                        alt={lead.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[var(--text-dark)] mb-1">{lead.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{lead.phone}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Budget</span>
                      <span className="text-sm font-semibold text-[var(--primary-base)]">{lead.budget}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Prog. Name & Time</span>
                      <div className="text-right">
                        <div className="text-sm text-[var(--text-dark)]">{lead.programName}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{lead.time}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Location</span>
                      <span className="text-sm text-[var(--text-dark)]">{lead.location}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Status</span>
                      <Pill type={lead.statusType}>{lead.status}</Pill>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Sources</span>
                      <Pill type={lead.sourcesType}>{lead.sources}</Pill>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <Link
                      href={`/all-leads/${encodeURIComponent(String(lead.id))}`}
                      className="inline-flex w-full justify-center px-3 py-2 rounded-md text-xs font-medium border border-[var(--primary-base)] text-[var(--primary-base)] bg-transparent hover:bg-[var(--primary-selected)] transition-colors"
                    >
                      View Detail
                    </Link>
                  </div>
                </div>
              ))}
            {type === 'bookings' &&
              rows.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={booking.avatar}
                        alt={booking.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[var(--text-dark)] mb-1">{booking.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{booking.phone}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Booking ID</span>
                      <span className="text-sm text-[var(--text-dark)]">{booking.bookingId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Project & Unit</span>
                      <div className="text-right">
                        <div className="text-sm text-[var(--text-dark)]">{booking.project}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{booking.unit}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Amount</span>
                      <span className="text-sm font-semibold text-[var(--text-dark)]">{booking.amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Agent</span>
                      <span className="text-sm text-[var(--text-dark)]">{booking.agent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Status</span>
                      <Pill type={booking.statusType}>{booking.status}</Pill>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <Link
                      href={`/all-leads/${encodeURIComponent(String(booking.id))}`}
                      className="inline-flex w-full justify-center px-3 py-2 rounded-md text-xs font-medium border border-[var(--primary-base)] text-[var(--primary-base)] bg-transparent hover:bg-[var(--primary-selected)] transition-colors"
                    >
                      View Detail
                    </Link>
                  </div>
                </div>
              ))}
            {type === 'teamHistory' &&
              rows.map((history) => (
                <div
                  key={history.id}
                  className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                >
                  <div className="text-base font-semibold text-[var(--text-dark)]">{history.teamName}</div>
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Team Leader</span>
                      <span className="text-sm text-[var(--text-dark)]">{history.teamLeader}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Sales Roles</span>
                      <span className="text-sm text-[var(--text-dark)]">{history.salesRoles}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Project</span>
                      <span className="text-sm text-[var(--text-dark)]">{history.project}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Reporting Period</span>
                      <span className="text-xs text-[var(--text-dark)]">{history.reportingPeriod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Performance</span>
                      <Pill type={history.performanceType}>{history.performance}</Pill>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Mobile Action Buttons */}
          {!showAddButton && (
            <div className="md:hidden p-4 border-t border-[var(--border-color)] bg-[var(--background)]">
              <div className="flex gap-3">
                <button className="flex-1 px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-1.5">
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button className="flex-1 px-3 py-2 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
                <button className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-[var(--error)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {(type === 'leads' || type === 'bookings' || type === 'teamHistory') && (
            <div className="hidden md:flex items-center justify-between px-5 py-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
              <div>Row Per Page: 10</div>
              <div className="flex items-center gap-2.5">
                <span>1 - {data.length} of {data.length}</span>
                <button className="px-2 py-1 rounded-md text-xs border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors">
                  &lt;
                </button>
                <button className="px-2 py-1 rounded-md text-xs border border-[var(--border-color)] bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors">
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Pill Component
interface PillProps {
  type: 'green' | 'blue' | 'orange' | 'red';
  children: React.ReactNode;
}

function Pill({ type, children }: PillProps) {
  const styles = {
    green: 'bg-[var(--surface-success)] text-[var(--success-text)]',
    blue: 'bg-[var(--surface-primary)] text-[var(--primary-base)]',
    orange: 'bg-[var(--surface-warning)] text-[var(--warning)]',
    red: 'bg-[var(--surface-error)] text-[var(--error)]',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${styles[type]}`}>
      {children}
    </span>
  );
}

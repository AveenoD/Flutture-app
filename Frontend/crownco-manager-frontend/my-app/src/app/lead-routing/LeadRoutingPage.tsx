"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CaretDown, MagnifyingGlass, Pause, Play, Plus, Trash, X } from "phosphor-react";
import { listUsers, type UserListItem } from "@/lib/usersApi";
import { listTeams, type TeamListItem } from "@/lib/teamsApi";
import {
  createRoutingRule,
  deleteRoutingRule,
  listRoutingRules,
  updateRoutingRule,
  updateRoutingRuleStatus,
  type RoutingRuleApi,
  type RoutingRulePayload,
} from "@/lib/routingRulesApi";

type TargetRole = "presales" | "sales";
type RuleStatus = "active" | "inactive";

const ROUTING_LEAD_SOURCES = ["website", "referral", "99acres", "housing", "meta_ads", "google_ads", "imported"] as const;
type RoutingLeadSource = (typeof ROUTING_LEAD_SOURCES)[number];

const ROUTING_LANGUAGES = ["en", "hi", "mr", "ta", "te", "mixed"] as const;
type RoutingLanguage = (typeof ROUTING_LANGUAGES)[number];

const ROUTING_LEAD_STATUSES = ["landed", "called", "hot", "warm", "cold", "qualified"] as const;
type RoutingLeadStatus = (typeof ROUTING_LEAD_STATUSES)[number];

interface RuleFormState {
  rule_name: string;
  priority: string;
  flow_type_order: string;
  target_role: TargetRole;
  manager_user_id: string;
  affected_lead_sources: string;
  affected_areas: string;
  languages: string;
  affected_lead_statuses: string;
  minimum_budget_range: string;
  maximum_budget_range: string;
  affected_user_ids: string;
  affected_team_ids: string;
  max_pending_leads_per_user: string;
  max_pending_followups_per_user: string;
}

const emptyForm = (): RuleFormState => ({
  rule_name: "",
  priority: "3",
  flow_type_order: "least-busy-first",
  target_role: "presales",
  manager_user_id: "",
  affected_lead_sources: "",
  affected_areas: "",
  languages: "",
  affected_lead_statuses: "",
  minimum_budget_range: "",
  maximum_budget_range: "",
  affected_user_ids: "",
  affected_team_ids: "",
  max_pending_leads_per_user: "",
  max_pending_followups_per_user: "",
});

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toMaybeNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toMaybeInt = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const joinList = (items?: string[] | null) =>
  Array.isArray(items) && items.length > 0 ? items.join(", ") : "Any";

const toCsv = (items?: string[] | null) => (Array.isArray(items) ? items.join(", ") : "");

const supportsTargetRole = (teamType: string, targetRole: TargetRole) => {
  if (targetRole === "presales") return teamType === "presales" || teamType === "mixed";
  return teamType === "sales" || teamType === "mixed";
};

const getPriorityBadge = (priority: number) => {
  if (priority <= 2) return "bg-[#FEE4E2] text-[#B42318]";
  if (priority === 3) return "bg-[#FEF0C7] text-[#B54708]";
  return "bg-[#ECFDF3] text-[#027A48]";
};

const getStatusBadge = (status: string) => {
  if (status === "active") return "bg-[#ECFDF3] text-[#027A48]";
  return "bg-[#F2F4F7] text-[#667085]";
};

const formatTitleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatMoney = (value?: number | null) => {
  if (value === undefined || value === null) return "Any";
  return `₹${value.toLocaleString("en-IN")}`;
};

interface DropdownOption {
  id: string;
  label: string;
}

function MultiSelectDropdown({
  label,
  placeholder,
  helperText,
  options,
  selectedIds,
  onChange,
  emptyStateText,
}: {
  label: string;
  placeholder: string;
  helperText: string;
  options: DropdownOption[];
  selectedIds: string[];
  onChange: (values: string[]) => void;
  emptyStateText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));
  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.slice(0, 2).map((option) => option.label).join(", ") +
        (selectedOptions.length > 2 ? ` +${selectedOptions.length - 2} more` : "");

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((currentId) => currentId !== id));
      return;
    }

    onChange([...selectedIds, id]);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="w-full rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)] flex items-center justify-between gap-3"
        >
          <span className={selectedOptions.length === 0 ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}>
            {summary}
          </span>
          <CaretDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-[var(--border-color)] bg-white shadow-xl">
            <div className="max-h-56 overflow-y-auto p-2">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">{emptyStateText}</div>
              ) : (
                options.map((option) => {
                  const checked = selectedIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover-bg)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option.id)}
                        className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--primary-base)] focus:ring-[var(--primary-base)]"
                      />
                      <span className="flex-1 text-[var(--text-primary)]">{option.label}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-color)] px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-[var(--primary-base)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      {helperText && <p className="text-xs text-[var(--text-secondary)]">{helperText}</p>}
    </div>
  );
}

export default function LeadRoutingPage() {
  const [rules, setRules] = useState<RoutingRuleApi[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | RuleStatus>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RoutingRuleApi | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const [rulesResult, usersResult, teamsResult] = await Promise.allSettled([
      listRoutingRules(),
      listUsers({ page: 1, limit: 100 }),
      listTeams(),
    ]);

    if (rulesResult.status === "fulfilled") {
      setRules(Array.isArray(rulesResult.value) ? rulesResult.value.filter(Boolean) : []);
    } else {
      setError(rulesResult.reason instanceof Error ? rulesResult.reason.message : "Failed to load routing rules");
    }

    if (usersResult.status === "fulfilled") {
      setUsers(Array.isArray(usersResult.value.users) ? usersResult.value.users.filter(Boolean) : []);
    }

    if (teamsResult.status === "fulfilled") {
      setTeams(Array.isArray(teamsResult.value.teams) ? teamsResult.value.teams.filter(Boolean) : []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );
  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const eligibleUsers = useMemo(
    () => users.filter((user) => user.role === form.target_role),
    [users, form.target_role]
  );

  const eligibleTeams = useMemo(
    () => teams.filter((team) => supportsTargetRole(team.team_type, form.target_role)),
    [teams, form.target_role]
  );

  const filteredRules = useMemo(() => {
    const safeRules = Array.isArray(rules) ? rules.filter(Boolean) : [];

    return safeRules
      .filter((rule) => (statusFilter ? rule.rule_status === statusFilter : true))
      .filter((rule) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const assignedNames = [
          ...(rule.affected_team_ids || []).map((id) => teamMap.get(id)?.team_title || id),
          ...(rule.affected_user_ids || []).map((id) => userMap.get(id)?.name || id),
        ].join(" ");

        return (
          rule.rule_name.toLowerCase().includes(q) ||
          rule.target_role.toLowerCase().includes(q) ||
          rule.flow_type_order.toLowerCase().includes(q) ||
          joinList(rule.affected_lead_sources).toLowerCase().includes(q) ||
          joinList(rule.affected_areas).toLowerCase().includes(q) ||
          assignedNames.toLowerCase().includes(q)
        );
      });
  }, [rules, searchQuery, statusFilter, teamMap, userMap]);

  const stats = useMemo(() => {
    const safeRules = Array.isArray(rules) ? rules.filter(Boolean) : [];
    const active = safeRules.filter((rule) => rule.rule_status === "active").length;
    const inactive = safeRules.filter((rule) => rule.rule_status === "inactive").length;
    const presales = safeRules.filter((rule) => rule.target_role === "presales").length;
    const sales = safeRules.filter((rule) => rule.target_role === "sales").length;

    return { total: safeRules.length, active, inactive, presales, sales };
  }, [rules]);

  const openCreateModal = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (rule: RoutingRuleApi) => {
    setEditingRule(rule);
    setForm({
      rule_name: rule.rule_name,
      priority: String(rule.priority),
      flow_type_order: rule.flow_type_order,
      target_role: rule.target_role === "sales" ? "sales" : "presales",
      manager_user_id: rule.manager_user_id ?? "",
      affected_lead_sources: toCsv(rule.affected_lead_sources),
      affected_areas: toCsv(rule.affected_areas),
      languages: toCsv(rule.languages),
      affected_lead_statuses: toCsv(rule.affected_lead_statuses),
      minimum_budget_range: rule.minimum_budget_range?.toString() ?? "",
      maximum_budget_range: rule.maximum_budget_range?.toString() ?? "",
      affected_user_ids: toCsv(rule.affected_user_ids),
      affected_team_ids: toCsv(rule.affected_team_ids),
      max_pending_leads_per_user: rule.max_pending_leads_per_user?.toString() ?? "",
      max_pending_followups_per_user: rule.max_pending_followups_per_user?.toString() ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setForm(emptyForm());
  };

  const submitRule = async () => {
    if (!form.rule_name.trim()) {
      setError("Rule name is required");
      return;
    }

    const payload: RoutingRulePayload = {
      rule_name: form.rule_name.trim(),
      priority: Number(form.priority),
      flow_type_order: form.flow_type_order,
      target_role: form.target_role,
      manager_user_id: form.manager_user_id.trim() || undefined,
      affected_lead_sources: splitCsv(form.affected_lead_sources),
      affected_areas: splitCsv(form.affected_areas),
      languages: splitCsv(form.languages),
      affected_lead_statuses: splitCsv(form.affected_lead_statuses),
      minimum_budget_range: toMaybeNumber(form.minimum_budget_range),
      maximum_budget_range: toMaybeNumber(form.maximum_budget_range),
      affected_user_ids: splitCsv(form.affected_user_ids),
      affected_team_ids: splitCsv(form.affected_team_ids),
      max_pending_leads_per_user: toMaybeInt(form.max_pending_leads_per_user),
      max_pending_followups_per_user: toMaybeInt(form.max_pending_followups_per_user),
    };

    try {
      setIsSaving(true);
      if (editingRule) {
        await updateRoutingRule(editingRule.id, payload);
      } else {
        await createRoutingRule(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save routing rule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (rule: RoutingRuleApi) => {
    try {
      setActionLoadingId(rule.id);
      await updateRoutingRuleStatus(rule.id, {
        rule_status: rule.rule_status === "active" ? "inactive" : "active",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update routing rule status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRule = async (rule: RoutingRuleApi) => {
    const confirmed = window.confirm(`Delete routing rule "${rule.rule_name}"?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(rule.id);
      await deleteRoutingRule(rule.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete routing rule");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatAssignedTo = (rule: RoutingRuleApi) => {
    const teamNames = (rule.affected_team_ids || [])
      .map((id) => teamMap.get(id)?.team_title || id)
      .slice(0, 2);
    const userNames = (rule.affected_user_ids || [])
      .map((id) => userMap.get(id)?.name || id)
      .slice(0, 2);

    const combined = [...teamNames, ...userNames];
    if (combined.length > 0) {
      return combined.join(", ");
    }

    if (rule.manager_user_id) {
      return userMap.get(rule.manager_user_id)?.name || rule.manager_user_id;
    }

    return "All matching users";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[var(--background)] min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-dark)]">
              Lead Routing
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Real routing rules powered by GET /api/v1/routing-rules
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm font-medium hover:bg-[var(--primary-hover)]"
          >
            <Plus size={16} weight="bold" />
            Create Rule
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <p className="text-xs text-[var(--text-secondary)]">Total Rules</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--text-dark)]">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <p className="text-xs text-[var(--text-secondary)]">Active</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--text-dark)]">{stats.active}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <p className="text-xs text-[var(--text-secondary)]">Presales Rules</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--text-dark)]">{stats.presales}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <p className="text-xs text-[var(--text-secondary)]">Sales Rules</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--text-dark)]">{stats.sales}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by rule, role, source, area or assignee"
              className="w-full rounded-lg border border-[var(--border-color)] bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | RuleStatus)}
            className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-sm text-[var(--text-secondary)]">
            Loading routing rules…
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-sm text-[var(--text-secondary)]">
            No routing rules found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--surface-neutral)]">
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Criteria</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="border-t border-[var(--border-color)] align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-[var(--text-dark)]">{rule.rule_name}</div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1 capitalize">
                          {rule.target_role} routing • {rule.flow_type_order}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--text-primary)]">
                        <div>Sources: {joinList(rule.affected_lead_sources)}</div>
                        <div className="mt-1">Areas: {joinList(rule.affected_areas)}</div>
                        <div className="mt-1">Languages: {joinList(rule.languages)}</div>
                        <div className="mt-1">Statuses: {joinList(rule.affected_lead_statuses)}</div>
                        <div className="mt-1">
                          Budget: {formatMoney(rule.minimum_budget_range)} - {formatMoney(rule.maximum_budget_range)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--text-primary)]">
                        {formatAssignedTo(rule)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadge(rule.priority)}`}>
                          {rule.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(rule.rule_status)}`}>
                          {formatTitleCase(rule.rule_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(rule)}
                            className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-medium hover:bg-[var(--hover-bg)]"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(rule)}
                            disabled={actionLoadingId === rule.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-neutral)] text-[var(--primary-base)] hover:bg-[var(--hover-bg)] disabled:opacity-60"
                          >
                            {rule.rule_status === "active" ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRule(rule)}
                            disabled={actionLoadingId === rule.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF3F2] text-[var(--error)] hover:bg-[#FEE4E2] disabled:opacity-60"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {filteredRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-[var(--border-color)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--text-dark)]">{rule.rule_name}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1 capitalize">
                        {rule.target_role} routing • {rule.flow_type_order}
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(rule.rule_status)}`}>
                      {formatTitleCase(rule.rule_status)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[var(--text-primary)]">
                    <div>Sources: {joinList(rule.affected_lead_sources)}</div>
                    <div>Areas: {joinList(rule.affected_areas)}</div>
                    <div>Assigned To: {formatAssignedTo(rule)}</div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadge(rule.priority)}`}>
                      Priority {rule.priority}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-medium"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(rule)}
                        disabled={actionLoadingId === rule.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-neutral)] text-[var(--primary-base)] disabled:opacity-60"
                      >
                        {rule.rule_status === "active" ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRule(rule)}
                        disabled={actionLoadingId === rule.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF3F2] text-[var(--error)] disabled:opacity-60"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 sm:px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] md:hidden"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-dark)]">
                  {editingRule ? "Update Routing Rule" : "Create Routing Rule"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Use backend-supported values for lead sources, languages and statuses.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--hover-bg)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Rule Name</label>
                  <input
                    value={form.rule_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, rule_name: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="Premium Leads Thane"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="1">1 - Highest</option>
                    <option value="2">2</option>
                    <option value="3">3 - Medium</option>
                    <option value="4">4</option>
                    <option value="5">5 - Lowest</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Target Role</label>
                  <select
                    value={form.target_role}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        target_role: event.target.value as TargetRole,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="presales">Presales</option>
                    <option value="sales">Sales</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Flow Type Order</label>
                  <select
                    value={form.flow_type_order}
                    onChange={(event) => setForm((prev) => ({ ...prev, flow_type_order: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="round-robin">round-robin</option>
                    <option value="least-busy-first">least-busy-first</option>
                    <option value="order-by-call-time">order-by-call-time</option>
                    <option value="order-by-call-connect-rate">order-by-call-connect-rate</option>
                    <option value="order-by-conversion-rate">order-by-conversion-rate</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Manager User ID</label>
                  <select
                    value={form.manager_user_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, manager_user_id: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="">Optional</option>
                    {users
                      .filter((user) => user.role === "manager")
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <MultiSelectDropdown
                    label="Affected Team IDs"
                    placeholder="Select teams"
                    helperText="Pick one or more teams for this rule."
                    options={eligibleTeams.map((team) => ({
                      id: team.id,
                      label: `${team.team_title} (${team.team_type})`,
                    }))}
                    selectedIds={splitCsv(form.affected_team_ids)}
                    onChange={(values) =>
                      setForm((prev) => ({ ...prev, affected_team_ids: values.join(",") }))
                    }
                    emptyStateText="No matching teams found"
                  />
                </div>
                <div className="space-y-2">
                  <MultiSelectDropdown
                    label="Affected User IDs"
                    placeholder="Select users"
                    helperText="Pick one or more users for this rule."
                    options={eligibleUsers.map((user) => ({
                      id: user.id,
                      label: `${user.name} (${user.role})`,
                    }))}
                    selectedIds={splitCsv(form.affected_user_ids)}
                    onChange={(values) =>
                      setForm((prev) => ({ ...prev, affected_user_ids: values.join(",") }))
                    }
                    emptyStateText="No matching users found"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <MultiSelectDropdown
                  label="Lead Sources"
                  placeholder="Select lead sources"
                  helperText="Use only backend-supported lead sources."
                  options={ROUTING_LEAD_SOURCES.map((source) => ({
                    id: source,
                    label: formatTitleCase(source),
                  }))}
                  selectedIds={splitCsv(form.affected_lead_sources)}
                  onChange={(values) =>
                    setForm((prev) => ({ ...prev, affected_lead_sources: values.join(",") }))
                  }
                  emptyStateText="No lead sources available"
                />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Areas</label>
                  <input
                    value={form.affected_areas}
                    onChange={(event) => setForm((prev) => ({ ...prev, affected_areas: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="Thane, Kurla, Goregaon"
                  />
                </div>
                <div className="space-y-2">
                <MultiSelectDropdown
                  label="Languages"
                  placeholder="Select languages"
                  helperText="Use only backend-supported languages."
                  options={ROUTING_LANGUAGES.map((language) => ({
                    id: language,
                    label: language.toUpperCase(),
                  }))}
                  selectedIds={splitCsv(form.languages)}
                  onChange={(values) => setForm((prev) => ({ ...prev, languages: values.join(",") }))}
                  emptyStateText="No languages available"
                />
                </div>
                <div className="space-y-2">
                <MultiSelectDropdown
                  label="Lead Statuses"
                  placeholder="Select lead statuses"
                  helperText="Use only backend-supported lead statuses."
                  options={ROUTING_LEAD_STATUSES.map((status) => ({
                    id: status,
                    label: formatTitleCase(status),
                  }))}
                  selectedIds={splitCsv(form.affected_lead_statuses)}
                  onChange={(values) =>
                    setForm((prev) => ({ ...prev, affected_lead_statuses: values.join(",") }))
                  }
                  emptyStateText="No lead statuses available"
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Minimum Budget Range</label>
                  <input
                    type="number"
                    value={form.minimum_budget_range}
                    onChange={(event) => setForm((prev) => ({ ...prev, minimum_budget_range: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="5000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Maximum Budget Range</label>
                  <input
                    type="number"
                    value={form.maximum_budget_range}
                    onChange={(event) => setForm((prev) => ({ ...prev, maximum_budget_range: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="10000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Max Pending Leads Per User</label>
                  <input
                    type="number"
                    value={form.max_pending_leads_per_user}
                    onChange={(event) => setForm((prev) => ({ ...prev, max_pending_leads_per_user: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Max Pending Followups Per User</label>
                  <input
                    type="number"
                    value={form.max_pending_followups_per_user}
                    onChange={(event) => setForm((prev) => ({ ...prev, max_pending_followups_per_user: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
                <p>Allowed lead sources: website, referral, 99acres, housing, meta_ads, google_ads, imported</p>
                <p>Allowed languages: en, hi, mr, ta, te, mixed</p>
                <p>Allowed lead statuses: landed, called, hot, warm, cold, qualified</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] px-4 sm:px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRule()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {isSaving ? "Saving..." : editingRule ? "Update Rule" : "Save Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

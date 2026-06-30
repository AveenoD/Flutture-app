"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Plus, Trash, WarningCircle } from "phosphor-react";
import {
  createExternalProjectMapping,
  createLeadSourcingConfig,
  createOrganizationApi,
  deleteExternalProjectMapping,
  deleteLeadSourcingConfig,
  deleteOrganizationApi,
  listExternalProjectMappings,
  listLeadSourcingConfigs,
  listLeadSyncLogs,
  listOrganizationApis,
  syncLeadSourcingConfigNow,
  updateExternalProjectMapping,
  updateLeadSourcingConfig,
  updateOrganizationApi,
  type LeadSourceTag,
  type ProviderType,
  type SyncMode,
  type SyncLogStatus,
} from "@/lib/leadSourcingApi";
import { listProjects } from "@/lib/projectsApi";

type SettingsTab =
  | "integrations"
  | "configs"
  | "project_mappings"
  | "sync_history";

type ProviderStatus = "active" | "disabled" | "error";
type LogStatus = SyncLogStatus;

interface ProviderIntegrationUI {
  id: string;
  provider: string;
  authType: "api_key" | "oauth" | "basic_auth" | string;
  username: string;
  apiKeyMasked: string;
  baseEndpoint?: string;
  status: ProviderStatus;
  createdAt: string;
}

interface SourcingConfigUI {
  id: string;
  providerId: string;
  leadSourceTag: string;
  syncMode: SyncMode;
  intervalMin?: number;
  lastSyncedAt: string;
  responseLeadsPath: string;
  fieldMap: Record<string, string>;
  providerConfig: Array<{ key: string; value: string }>;
}

interface ProjectMapping {
  id: string;
  provider: string;
  externalProjectId: string;
  externalProjectName: string;
  internalProjectId?: string | null;
  internalProjectName: string;
  isMapped: boolean;
}

interface ProjectOption {
  id: string;
  project_title: string;
}

interface SyncLogUI {
  id: string;
  configId: string;
  startedAt: string;
  completedAt: string;
  status: LogStatus;
  leadsFetched: number;
  leadsCreated: number;
  leadsSkipped: number;
  errorMessage?: string;
}

const internalFields = [
  "name",
  "phone",
  "email",
  "city",
  "state",
  "budget_min",
  "budget_max",
  "source_detail",
  "external_project_id",
  "external_lead_id",
];

const providerOptions: ProviderType[] = [
  "housing",
  "99acres",
  "nobroker",
  "magicbricks",
  "google",
];
const leadSourceOptions: LeadSourceTag[] = [
  "housing",
  "99acres",
  "nobroker",
  "magicbricks",
  "google_ads",
  "meta_ads",
];

const providerRequiredConfigKeys: Record<string, string[]> = {
  housing: ["profile_id"],
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations");

  const [providers, setProviders] = useState<ProviderIntegrationUI[]>([]);
  const [configs, setConfigs] = useState<SourcingConfigUI[]>([]);
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<SyncLogUI[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [logFilterConfigId, setLogFilterConfigId] = useState<string>("");
  const [mappingProviderFilter, setMappingProviderFilter] = useState<string>("all");

  const [providerForm, setProviderForm] = useState({
    provider: "housing",
    authType: "api_key",
    username: "",
    apiKey: "",
    password: "",
    baseEndpoint: "",
  });

  const [configForm, setConfigForm] = useState({
    leadSourceTag: "housing" as LeadSourceTag,
    syncMode: "scheduled" as SyncMode,
    intervalMin: 60,
    responseLeadsPath: "data",
    providerConfigDraftKey: "",
    providerConfigDraftValue: "",
    providerConfigPairs: [] as Array<{ key: string; value: string }>,
    fieldMap: {
      name: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      budget_min: "",
      budget_max: "",
      source_detail: "",
      external_project_id: "",
      external_lead_id: "",
    } as Record<string, string>,
  });

  const [mappingForm, setMappingForm] = useState({
    provider: "housing" as ProviderType,
    externalProjectId: "",
    externalProjectName: "",
    internalProjectId: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const errors: string[] = [];

      const providerRes = await listOrganizationApis().catch((e) => {
        errors.push(
          e instanceof Error ? e.message : "Failed to list provider integrations"
        );
        return [];
      });

      const configRes = await listLeadSourcingConfigs().catch((e) => {
        errors.push(
          e instanceof Error ? e.message : "Failed to list sourcing configs"
        );
        return [];
      });

      const mappingRes = await listExternalProjectMappings().catch((e) => {
        errors.push(
          e instanceof Error ? e.message : "Failed to list project mappings"
        );
        return [];
      });

      const logRes = await listLeadSyncLogs(logFilterConfigId || undefined).catch((e) => {
        errors.push(e instanceof Error ? e.message : "Failed to list sync logs");
        return [];
      });

      const projectRes = await listProjects({ page: 1, limit: 200 }).catch((e) => {
        errors.push(e instanceof Error ? e.message : "Failed to list projects");
        return { projects: [] };
      });

      const providerUi = providerRes.map((provider) => ({
        id: provider.id,
        provider: provider.provider,
        authType: provider.auth_type,
        username: provider.username || "-",
        apiKeyMasked: provider.has_api_key ? "Configured" : "Not set",
        baseEndpoint: provider.base_endpoint || "",
        status: provider.status,
        createdAt: provider.created_at.slice(0, 10),
      }));

      const configUi = configRes.map((config) => ({
        id: config.id,
        providerId: config.org_api_id,
        leadSourceTag: config.lead_source_tag,
        syncMode: config.sync_mode,
        intervalMin: config.sync_interval_min,
        lastSyncedAt: config.last_synced_at || "-",
        responseLeadsPath: config.mapping_config?.response_leads_path || "",
        fieldMap: config.mapping_config?.field_map || {},
        providerConfig: Object.entries(config.mapping_config?.provider_config || {}).map(
          ([key, value]) => ({ key, value })
        ),
      }));

      const mappingsUi = mappingRes.map((mapping) => ({
        id: mapping.id,
        provider: mapping.provider,
        externalProjectId: mapping.external_project_id,
        externalProjectName: mapping.external_project_name || "-",
        internalProjectId: mapping.internal_project_id,
        internalProjectName: mapping.internal_project_name || "Unmapped",
        isMapped: Boolean(mapping.internal_project_id),
      }));

      const logsUi = logRes.map((log) => ({
        id: log.id,
        configId: log.lead_sourcing_config_id,
        startedAt: log.started_at,
        completedAt: log.completed_at || "-",
        status: log.status,
        leadsFetched: log.leads_fetched,
        leadsCreated: log.leads_created,
        leadsSkipped: log.leads_skipped,
        errorMessage: log.error_message || undefined,
      }));

      setProviders(providerUi);
      setConfigs(configUi);
      setMappings(mappingsUi);
      setLogs(logsUi);
      setProjects(projectRes.projects.map((project) => ({
        id: project.id,
        project_title: project.project_title,
      })));
      setMappingDrafts(
        mappingRes.reduce<Record<string, string>>((acc, mapping) => {
          acc[mapping.id] = mapping.internal_project_id || "";
          return acc;
        }, {})
      );
      setSelectedProviderId((prev) => prev || providerUi[0]?.id || "");
      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lead sourcing data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [logFilterConfigId]);

  useEffect(() => {
    if (!error && !success) return;
    const timer = window.setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [error, success]);

  const providerConfigs = useMemo(
    () => configs.filter((c) => c.providerId === selectedProviderId),
    [configs, selectedProviderId]
  );

  const selectedProviderName = useMemo(
    () =>
      providers.find((provider) => provider.id === selectedProviderId)?.provider ??
      "",
    [providers, selectedProviderId]
  );

  const requiredProviderConfigKeys = useMemo(
    () => providerRequiredConfigKeys[selectedProviderName.toLowerCase()] ?? [],
    [selectedProviderName]
  );

  const unmappedCount = useMemo(
    () => mappings.filter((item) => !item.isMapped).length,
    [mappings]
  );

  const filteredMappings = useMemo(
    () =>
      mappings.filter((mapping) =>
        mappingProviderFilter === "all"
          ? true
          : mapping.provider === mappingProviderFilter
      ),
    [mappings, mappingProviderFilter]
  );

  const addProvider = async () => {
    if (!providerForm.provider || !providerForm.authType) {
      setError("Provider and auth type are required");
      return;
    }
    if (providerForm.authType === "api_key" && !providerForm.apiKey.trim()) {
      setError("API key is required for api_key auth type");
      return;
    }
    if (
      providerForm.authType === "basic_auth" &&
      (!providerForm.username.trim() || !providerForm.password.trim())
    ) {
      setError("Username and password are required for basic_auth");
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createOrganizationApi({
        provider: providerForm.provider as ProviderType,
        api_category: "lead_sourcing",
        auth_type: providerForm.authType as "api_key" | "oauth" | "basic_auth",
        api_key: providerForm.apiKey || undefined,
        username: providerForm.username || undefined,
        password: providerForm.password || undefined,
        base_endpoint: providerForm.baseEndpoint || undefined,
      });
      setSuccess("Provider connected successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add provider");
    } finally {
      setActionLoading(false);
    }
    resetProviderForm();
  };

  const editProvider = (provider: ProviderIntegrationUI) => {
    setEditingProviderId(provider.id);
    setProviderForm({
      provider: provider.provider,
      authType: provider.authType,
      username: provider.username === "-" ? "" : provider.username,
      apiKey: "",
      password: "",
      baseEndpoint: "",
    });
  };

  const resetProviderForm = () => {
    setEditingProviderId(null);
    setProviderForm({
      provider: "housing",
      authType: "api_key",
      username: "",
      apiKey: "",
      password: "",
      baseEndpoint: "",
    });
  };

  const saveProviderUpdate = async () => {
    if (!editingProviderId) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateOrganizationApi(editingProviderId, {
        username: providerForm.username || undefined,
        api_key: providerForm.apiKey || undefined,
        password: providerForm.password || undefined,
        base_endpoint: providerForm.baseEndpoint || undefined,
      });
      setSuccess("Provider updated successfully");
      resetProviderForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update provider");
    } finally {
      setActionLoading(false);
    }
  };

  const updateProviderStatus = async (id: string, status: ProviderStatus) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateOrganizationApi(id, { status });
      setSuccess("Provider status updated");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update provider status");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteProvider = async (id: string) => {
    if (
      !window.confirm(
        "Delete this provider? This will also remove linked sourcing configs and sync logs."
      )
    ) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteOrganizationApi(id);
      setSuccess("Provider removed successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete provider");
    } finally {
      setActionLoading(false);
    }
  };

  const addConfig = async () => {
    if (!selectedProviderId) {
      setError("Select a provider before adding config");
      return;
    }
    if (!configForm.leadSourceTag) {
      setError("Lead source tag is required");
      return;
    }
    if (!configForm.responseLeadsPath.trim()) {
      setError("response_leads_path is required");
      return;
    }
    if (configForm.syncMode === "scheduled" && configForm.intervalMin < 1) {
      setError("sync_interval_min should be at least 1 minute");
      return;
    }
    const providerConfig = configForm.providerConfigPairs.reduce<Record<string, string>>(
      (acc, pair) => {
        acc[pair.key] = pair.value;
        return acc;
      },
      {}
    );
    const missingRequiredKeys = requiredProviderConfigKeys.filter(
      (key) => !providerConfig[key]?.trim()
    );
    if (missingRequiredKeys.length > 0) {
      setError(
        `Missing provider_config key(s): ${missingRequiredKeys.join(", ")}`
      );
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createLeadSourcingConfig({
        org_api_id: selectedProviderId,
        sync_mode: configForm.syncMode,
        sync_interval_min:
          configForm.syncMode === "scheduled" ? configForm.intervalMin : undefined,
        lead_source_tag: configForm.leadSourceTag,
        mapping_config: {
          response_leads_path: configForm.responseLeadsPath,
          field_map: configForm.fieldMap,
          provider_config: providerConfig,
        },
      });
      setSuccess("Config added successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add config");
    } finally {
      setActionLoading(false);
    }
  };

  const editConfig = (config: SourcingConfigUI) => {
    setEditingConfigId(config.id);
    setConfigForm({
      leadSourceTag: config.leadSourceTag as LeadSourceTag,
      syncMode: config.syncMode,
      intervalMin: config.intervalMin || 60,
      responseLeadsPath: config.responseLeadsPath,
      providerConfigDraftKey: "",
      providerConfigDraftValue: "",
      providerConfigPairs: config.providerConfig,
      fieldMap: {
        name: config.fieldMap.name || "",
        phone: config.fieldMap.phone || "",
        email: config.fieldMap.email || "",
        city: config.fieldMap.city || "",
        state: config.fieldMap.state || "",
        budget_min: config.fieldMap.budget_min || "",
        budget_max: config.fieldMap.budget_max || "",
        source_detail: config.fieldMap.source_detail || "",
        external_project_id: config.fieldMap.external_project_id || "",
        external_lead_id: config.fieldMap.external_lead_id || "",
      },
    });
  };

  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigForm({
      leadSourceTag: "housing",
      syncMode: "scheduled",
      intervalMin: 60,
      responseLeadsPath: "data",
      providerConfigDraftKey: "",
      providerConfigDraftValue: "",
      providerConfigPairs: [],
      fieldMap: {
        name: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        budget_min: "",
        budget_max: "",
        source_detail: "",
        external_project_id: "",
        external_lead_id: "",
      },
    });
  };

  const saveConfigUpdate = async () => {
    if (!editingConfigId) return;
    if (!configForm.responseLeadsPath.trim()) {
      setError("response_leads_path is required");
      return;
    }
    if (configForm.syncMode === "scheduled" && configForm.intervalMin < 1) {
      setError("sync_interval_min should be at least 1 minute");
      return;
    }
    const providerConfig = configForm.providerConfigPairs.reduce<Record<string, string>>(
      (acc, pair) => {
        acc[pair.key] = pair.value;
        return acc;
      },
      {}
    );
    const missingRequiredKeys = requiredProviderConfigKeys.filter(
      (key) => !providerConfig[key]?.trim()
    );
    if (missingRequiredKeys.length > 0) {
      setError(
        `Missing provider_config key(s): ${missingRequiredKeys.join(", ")}`
      );
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateLeadSourcingConfig(editingConfigId, {
        sync_mode: configForm.syncMode,
        sync_interval_min:
          configForm.syncMode === "scheduled" ? configForm.intervalMin : undefined,
        mapping_config: {
          response_leads_path: configForm.responseLeadsPath,
          field_map: configForm.fieldMap,
          provider_config: providerConfig,
        },
      });
      setSuccess("Config updated successfully");
      resetConfigForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update config");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!window.confirm("Delete this sourcing config?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteLeadSourcingConfig(id);
      setSuccess("Config deleted successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete config");
    } finally {
      setActionLoading(false);
    }
  };

  const syncNow = async (configId: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncLeadSourcingConfigNow(configId);
      setSuccess(
        `Sync complete: ${result.leads_fetched} fetched, ${result.leads_created} created, ${result.leads_skipped} skipped`
      );
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync now");
    } finally {
      setActionLoading(false);
    }
  };

  const addMapping = async () => {
    if (!mappingForm.externalProjectId) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createExternalProjectMapping({
        provider: mappingForm.provider,
        external_project_id: mappingForm.externalProjectId,
        external_project_name: mappingForm.externalProjectName || undefined,
        internal_project_id: mappingForm.internalProjectId || null,
      });
      setSuccess("Project mapping added successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add mapping");
    } finally {
      setActionLoading(false);
    }
    setMappingForm({
      provider: "housing",
      externalProjectId: "",
      externalProjectName: "",
      internalProjectId: "",
    });
  };

  const updateMappingProject = async (mappingId: string, internalProjectId: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateExternalProjectMapping(mappingId, {
        internal_project_id: internalProjectId || null,
      });
      setSuccess("Mapping updated successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update mapping");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteMapping = async (id: string) => {
    if (!window.confirm("Delete this project mapping?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteExternalProjectMapping(id);
      setSuccess("Mapping deleted successfully");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete mapping");
    } finally {
      setActionLoading(false);
    }
  };

  const statusClassMap: Record<ProviderStatus, string> = {
    active: "bg-green-100 text-green-700",
    disabled: "bg-gray-200 text-gray-700",
    error: "bg-red-100 text-red-700",
  };

  const logStatusClassMap: Record<LogStatus, string> = {
    running: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const providerNameByConfigId = useMemo(() => {
    const providerById = new Map(providers.map((provider) => [provider.id, provider.provider]));
    const nameByConfig = new Map<string, string>();
    configs.forEach((config) => {
      nameByConfig.set(config.id, providerById.get(config.providerId) || "unknown");
    });
    return nameByConfig;
  }, [providers, configs]);

  const addProviderConfigPair = () => {
    if (!configForm.providerConfigDraftKey || !configForm.providerConfigDraftValue) return;
    setConfigForm((s) => ({
      ...s,
      providerConfigPairs: [
        ...s.providerConfigPairs.filter(
          (pair) => pair.key !== s.providerConfigDraftKey
        ),
        {
          key: s.providerConfigDraftKey,
          value: s.providerConfigDraftValue,
        },
      ],
      providerConfigDraftKey: "",
      providerConfigDraftValue: "",
    }));
  };

  const removeProviderConfigPair = (key: string) => {
    setConfigForm((s) => ({
      ...s,
      providerConfigPairs: s.providerConfigPairs.filter((pair) => pair.key !== key),
    }));
  };

  const formatDateTime = (value: string) => {
    if (!value || value === "-") return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  return (
    <div className="min-h-full py-4 sm:py-6 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Lead Sourcing Settings
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manager and GM only settings for provider integrations and sync controls.
            </p>
          </div>
          {unmappedCount > 0 && (
            <button
              onClick={() => setActiveTab("project_mappings")}
              className="px-3 py-2 text-sm rounded-lg bg-amber-100 text-amber-700 border border-amber-200"
            >
              {unmappedCount} unmapped project(s)
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[var(--border-color)] p-2 flex flex-wrap gap-2">
          {[
            { key: "integrations", label: "Provider Integrations" },
            { key: "configs", label: "Sourcing Configs" },
            { key: "project_mappings", label: "Project Mappings" },
            { key: "sync_history", label: "Sync History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SettingsTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--primary-base)] text-white"
                  : "bg-[var(--hover-bg)] text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl border border-[var(--border-color)] p-4 text-sm text-[var(--text-secondary)]">
            Loading lead sourcing data...
          </div>
        )}
        {error && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {!isLoading && activeTab === "integrations" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white rounded-xl border border-[var(--border-color)] p-4 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingProviderId ? "Edit Provider" : "Connect New Provider"}
              </h2>

              <select
                value={providerForm.provider}
                onChange={(e) => setProviderForm((s) => ({ ...s, provider: e.target.value }))}
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>

              <select
                value={providerForm.authType}
                onChange={(e) => setProviderForm((s) => ({ ...s, authType: e.target.value }))}
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="api_key">api_key</option>
                <option value="oauth">oauth</option>
                <option value="basic_auth">basic_auth</option>
              </select>

              {providerForm.authType === "api_key" && (
                <input
                  value={providerForm.apiKey}
                  onChange={(e) =>
                    setProviderForm((s) => ({ ...s, apiKey: e.target.value }))
                  }
                  placeholder="api_key"
                  className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                />
              )}
              {providerForm.authType === "basic_auth" && (
                <>
                  <input
                    value={providerForm.username}
                    onChange={(e) =>
                      setProviderForm((s) => ({ ...s, username: e.target.value }))
                    }
                    placeholder="username"
                    className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={providerForm.password}
                    onChange={(e) =>
                      setProviderForm((s) => ({ ...s, password: e.target.value }))
                    }
                    placeholder="password"
                    type="password"
                    className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                  />
                </>
              )}
              <input
                value={providerForm.baseEndpoint}
                onChange={(e) => setProviderForm((s) => ({ ...s, baseEndpoint: e.target.value }))}
                placeholder="base_endpoint (optional)"
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={editingProviderId ? saveProviderUpdate : addProvider}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm"
              >
                <Plus size={16} />
                {editingProviderId ? "Save Provider" : "Connect Provider"}
              </button>
              {providerForm.provider === "housing" && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Housing setup: use encryption key in <strong>api_key</strong>, and add{" "}
                  <strong>profile_id</strong> in provider config under Sourcing Configs.
                </p>
              )}
              {editingProviderId && (
                <button
                  onClick={resetProviderForm}
                  disabled={actionLoading}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="lg:col-span-2 space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white rounded-xl border border-[var(--border-color)] p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] capitalize">
                      {provider.provider}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      auth_type: {provider.authType} | user: {provider.username}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      key: {provider.apiKeyMasked} | created: {provider.createdAt}
                    </p>
                    {provider.baseEndpoint && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        endpoint: {provider.baseEndpoint}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusClassMap[provider.status]}`}>
                      {provider.status}
                    </span>
                    <select
                      value={provider.status}
                      onChange={(e) =>
                        updateProviderStatus(
                          provider.id,
                          e.target.value as ProviderStatus
                        )
                      }
                      disabled={actionLoading}
                      className="border border-[var(--border-color)] rounded-md px-2 py-1 text-xs"
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                      <option value="error">error</option>
                    </select>
                    <button
                      onClick={() => editProvider(provider)}
                      disabled={actionLoading}
                      className="px-2 py-1 rounded-md border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProvider(provider.id)}
                      disabled={actionLoading}
                      className="p-2 rounded-lg border border-red-200 text-red-600"
                      title="Delete provider"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && activeTab === "configs" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[var(--border-color)] p-4">
              <label className="text-sm text-[var(--text-secondary)] block mb-2">Select Provider</label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full md:w-72 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-[var(--border-color)] p-4 space-y-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {editingConfigId ? "Edit Config" : "Add Config"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={configForm.leadSourceTag}
                    onChange={(e) => setConfigForm((s) => ({ ...s, leadSourceTag: e.target.value }))}
                    className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                  >
                    {leadSourceOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                  <select
                    value={configForm.syncMode}
                    onChange={(e) =>
                      setConfigForm((s) => ({ ...s, syncMode: e.target.value as SyncMode }))
                    }
                    className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="realtime">realtime</option>
                  </select>
                  {configForm.syncMode === "scheduled" && (
                    <input
                      type="number"
                      value={configForm.intervalMin}
                      onChange={(e) =>
                        setConfigForm((s) => ({ ...s, intervalMin: Number(e.target.value) }))
                      }
                      className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                      placeholder="sync_interval_min"
                    />
                  )}
                  <input
                    value={configForm.responseLeadsPath}
                    onChange={(e) =>
                      setConfigForm((s) => ({ ...s, responseLeadsPath: e.target.value }))
                    }
                    className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                    placeholder="response_leads_path"
                  />
                </div>

                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 bg-[var(--hover-bg)] px-3 py-2 text-sm font-medium">
                    <p>Internal Field</p>
                    <p>Provider Field</p>
                  </div>
                  {internalFields.map((field) => (
                    <div key={field} className="grid grid-cols-2 px-3 py-2 border-t border-[var(--border-color)]">
                      <p className="text-sm text-[var(--text-primary)]">{field}</p>
                      <input
                        value={configForm.fieldMap[field] || ""}
                        onChange={(e) =>
                          setConfigForm((s) => ({
                            ...s,
                            fieldMap: { ...s.fieldMap, [field]: e.target.value },
                          }))
                        }
                        className="border border-[var(--border-color)] rounded-md px-2 py-1 text-sm"
                        placeholder={`map ${field}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={configForm.providerConfigDraftKey}
                    onChange={(e) =>
                      setConfigForm((s) => ({ ...s, providerConfigDraftKey: e.target.value }))
                    }
                    className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                    placeholder="provider_config key"
                  />
                  <input
                    value={configForm.providerConfigDraftValue}
                    onChange={(e) =>
                      setConfigForm((s) => ({ ...s, providerConfigDraftValue: e.target.value }))
                    }
                    className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                    placeholder="provider_config value"
                  />
                </div>
                <button
                  onClick={addProviderConfigPair}
                  disabled={actionLoading}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
                >
                  Add Provider Config Pair
                </button>
                {requiredProviderConfigKeys.length > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Required for {selectedProviderName || "selected provider"}:{" "}
                    <strong>{requiredProviderConfigKeys.join(", ")}</strong>
                  </p>
                )}
                {configForm.providerConfigPairs.length > 0 && (
                  <div className="space-y-2 border border-[var(--border-color)] rounded-lg p-3">
                    {configForm.providerConfigPairs.map((pair) => (
                      <div key={pair.key} className="flex items-center justify-between gap-3 text-sm">
                        <p className="text-[var(--text-secondary)]">
                          {pair.key} = {pair.value}
                        </p>
                        <button
                          onClick={() => removeProviderConfigPair(pair.key)}
                          className="px-2 py-1 rounded-md border border-red-200 text-red-600 text-xs"
                          disabled={actionLoading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={editingConfigId ? saveConfigUpdate : addConfig}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm"
                >
                  <Plus size={16} />
                  {editingConfigId ? "Save Config" : "Add Config"}
                </button>
                {editingConfigId && (
                  <button
                    onClick={resetConfigForm}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {providerConfigs.length === 0 && (
                  <div className="bg-white rounded-xl border border-[var(--border-color)] p-4 text-sm text-[var(--text-secondary)]">
                    No configs yet for this provider.
                  </div>
                )}
                {providerConfigs.map((config) => (
                  <div key={config.id} className="bg-white rounded-xl border border-[var(--border-color)] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {config.leadSourceTag} | {config.syncMode}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editConfig(config)}
                          disabled={actionLoading}
                          className="px-2 py-1 rounded-md border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteConfig(config.id)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg border border-red-200 text-red-600"
                          title="Delete config"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Interval: {config.intervalMin ? `Every ${config.intervalMin} min` : "-"}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Last synced: {config.lastSyncedAt}
                    </p>
                    <button
                      onClick={() => syncNow(config.id)}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
                    >
                      Sync Now
                    </button>
                    <button
                      onClick={() => {
                        setLogFilterConfigId(config.id);
                        setActiveTab("sync_history");
                      }}
                      disabled={actionLoading}
                      className="ml-2 px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
                    >
                      View Logs
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && activeTab === "project_mappings" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[var(--border-color)] p-4 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Mapping</h2>
              <select
                value={mappingForm.provider}
                onChange={(e) => setMappingForm((s) => ({ ...s, provider: e.target.value }))}
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <input
                value={mappingForm.externalProjectId}
                onChange={(e) => setMappingForm((s) => ({ ...s, externalProjectId: e.target.value }))}
                placeholder="external_project_id"
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={mappingForm.externalProjectName}
                onChange={(e) =>
                  setMappingForm((s) => ({ ...s, externalProjectName: e.target.value }))
                }
                placeholder="external_project_name (optional)"
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={mappingForm.internalProjectId}
                onChange={(e) =>
                  setMappingForm((s) => ({ ...s, internalProjectId: e.target.value }))
                }
                className="w-full border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select internal project (optional)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_title}
                  </option>
                ))}
              </select>
              <button
                onClick={addMapping}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm"
              >
                <Plus size={16} />
                Add Mapping
              </button>
            </div>

            <div className="xl:col-span-2 bg-white rounded-xl border border-[var(--border-color)] p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <WarningCircle size={18} className={unmappedCount ? "text-amber-600" : "text-emerald-600"} />
                <p className="text-sm text-[var(--text-secondary)]">
                  {unmappedCount
                    ? `${unmappedCount} project(s) are unmapped`
                    : "All external projects are mapped"}
                </p>
                <select
                  value={mappingProviderFilter}
                  onChange={(e) => setMappingProviderFilter(e.target.value)}
                  className="ml-auto border border-[var(--border-color)] rounded-md px-2 py-1 text-xs"
                >
                  <option value="all">All providers</option>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {filteredMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="border border-[var(--border-color)] rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {mapping.provider} | {mapping.externalProjectId}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {mapping.externalProjectName} → {mapping.internalProjectName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          mapping.isMapped
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {mapping.isMapped ? "Mapped" : "Unmapped"}
                      </span>
                      <select
                        value={mappingDrafts[mapping.id] ?? ""}
                        onChange={(e) =>
                          setMappingDrafts((prev) => ({
                            ...prev,
                            [mapping.id]: e.target.value,
                          }))
                        }
                        className="border border-[var(--border-color)] rounded-md px-2 py-1 text-xs"
                        disabled={actionLoading}
                      >
                        <option value="">Unmapped</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.project_title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          updateMappingProject(mapping.id, mappingDrafts[mapping.id] ?? "")
                        }
                        disabled={actionLoading}
                        className="px-2 py-1 rounded-md border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteMapping(mapping.id)}
                        disabled={actionLoading}
                        className="p-2 rounded-lg border border-red-200 text-red-600"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && activeTab === "sync_history" && (
          <div className="bg-white rounded-xl border border-[var(--border-color)] p-4 overflow-x-auto">
            <div className="mb-3">
              <label className="text-sm text-[var(--text-secondary)] block mb-2">
                Filter by config
              </label>
              <select
                value={logFilterConfigId}
                onChange={(e) => setLogFilterConfigId(e.target.value)}
                className="w-full md:w-72 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All configs</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.leadSourceTag} ({config.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <th className="py-2">Started</th>
                  <th className="py-2">Completed</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Fetched</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Skipped</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border-color)] text-sm">
                    <td className="py-3">{formatDateTime(log.startedAt)}</td>
                    <td className="py-3">{formatDateTime(log.completedAt)}</td>
                    <td className="py-3 capitalize">{providerNameByConfigId.get(log.configId) || "unknown"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${logStatusClassMap[log.status]}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3">{log.leadsFetched}</td>
                    <td className="py-3">{log.leadsCreated}</td>
                    <td className="py-3">{log.leadsSkipped}</td>
                    <td className="py-3 text-red-600">{log.errorMessage || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                running
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle size={14} />
                success
              </div>
              <div className="flex items-center gap-1">
                <WarningCircle size={14} />
                error
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

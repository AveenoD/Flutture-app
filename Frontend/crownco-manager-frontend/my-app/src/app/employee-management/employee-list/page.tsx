"use client";

import { useState, useMemo, ChangeEvent, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Folder,
  UserX,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  Columns,
  Upload,
  Trash2,
  Plus,
  Edit,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Briefcase,
  Calendar,
} from "lucide-react";
import DataTable, { Column } from "@/components/ui/dataTable";
import { listUsers, createUser, UserListItem } from "@/lib/usersApi";
import { listProjects, type ProjectResponse } from "@/lib/projectsApi";
import MultiSelectDropdown from "@/components/ui/multiSelectDropdown";
import {
  createTeam,
  listTeams,
  updateTeam,
  TeamLabel,
  TeamType,
  TeamListItem,
} from "@/lib/teamsApi";

interface Employee {
  /** Local row id for table (not backend id) */
  id: number;
  /** Backend user UUID for API calls */
  userId: string;
  name: string;
  phone: string;
  email: string;
  joinedDate: string;
  jobFunction: string;
  teamAssigned: string;
  performance: 'high' | 'medium' | 'low';
  status: "active" | "break";
  avatar: string;
}

interface CreateEmployeeForm {
  user_type: "manager" | "presales" | "sales";
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: "male" | "female" | "other";
  dob: string;
  employee_id: string;
  team_id: string;
  project_assigned_ids: string[];
  avatar_url: string;
  status: "active" | "inactive" | "suspended" | "on_leave";
  permissions: string[];
}

interface TeamCard {
  id: string;
  name: string;
  leadName: string;
  leadAvatar: string;
  memberCount: number;
  projectCount: number;
  tags: string[];
}

interface CreateTeamForm {
  team_title: string;
  team_description: string;
  team_type: TeamType;
  manager_user_id: string;
  labels: TeamLabel[];
  team_rating_score: string;
  team_logo_url: string;
  working_region_input: string;
}

export default function EmployeeListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"employees" | "teams">("employees");
  const [employeeRows, setEmployeeRows] = useState<UserListItem[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [teamItems, setTeamItems] = useState<TeamListItem[]>([]);
  const [teamsData, setTeamsData] = useState<TeamCard[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEmployeeForm>({
    user_type: "presales",
    name: "",
    email: "",
    phone: "",
    password: "",
    gender: "male",
    dob: "",
    employee_id: "",
    team_id: "",
    project_assigned_ids: [],
    avatar_url: "",
    status: "active",
    permissions: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  const [teamForm, setTeamForm] = useState<CreateTeamForm>({
    team_title: "",
    team_description: "",
    team_type: "presales",
    manager_user_id: "",
    labels: [],
    team_rating_score: "",
    team_logo_url: "",
    working_region_input: "",
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      setApiError(null);
      try {
        const res = await listUsers({ page: 1, limit: 50 });
        const nonGmUsers = (res.users || []).filter(
          (u) => u.role !== "gm" && u.role !== "general-manager"
        );
        setEmployeeRows(nonGmUsers);
        const mapped: Employee[] = nonGmUsers.map((u: UserListItem, index) => ({
          id: index + 1,
          userId: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          joinedDate: new Date(u.created_at).toLocaleDateString(),
          jobFunction:
            u.role === "manager"
              ? "Manager"
              : u.role === "presales"
              ? "Presales Executive"
              : u.role === "sales"
              ? "Sales Executive"
              : "Employee",
          teamAssigned: u.team_id || "—",
          performance: "medium",
          status: u.status === "active" ? "active" : "break",
          avatar: "https://i.pravatar.cc/100?u=" + u.id,
        }));
        setEmployeesData(mapped);
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : "Failed to load employees"
        );
      } finally {
        setLoadingEmployees(false);
      }
    };

    const fetchManagers = async () => {
      setLoadingManagers(true);
      setManagerError(null);
      try {
        const res = await listUsers({ role: "manager", limit: 100 });
        setManagers(res.users);
      } catch (error) {
        setManagerError(
          error instanceof Error
            ? error.message
            : "Failed to load managers list"
        );
      } finally {
        setLoadingManagers(false);
      }
    };

    const fetchTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      try {
        const res = await listTeams();
        setTeamItems(res.teams);
        const mapped: TeamCard[] = res.teams.map((t: TeamListItem) => ({
          id: t.id,
          name: t.team_title,
          leadName: t.manager_name || "—",
          leadAvatar:
            t.team_logo_url || `https://i.pravatar.cc/100?u=team-${t.id}`,
          memberCount: t.member_count,
          projectCount: t.project_assigned_ids?.length || 0,
          tags: t.labels && t.labels.length
            ? t.labels.map((label) =>
                label === "luxury"
                  ? "Luxury Projects"
                  : label === "budget"
                  ? "Budget"
                  : label.charAt(0).toUpperCase() + label.slice(1)
              )
            : ["High Performer"],
        }));
        setTeamsData(mapped);
      } catch (error) {
        setTeamsError(
          error instanceof Error ? error.message : "Failed to load teams"
        );
      } finally {
        setLoadingTeams(false);
      }
    };

    const fetchProjects = async () => {
      setProjectsError(null);
      try {
        const res = await listProjects({ page: 1, limit: 200 });
        setProjects(Array.isArray(res.projects) ? res.projects : []);
      } catch (error) {
        setProjects([]);
        setProjectsError(
          error instanceof Error ? error.message : "Failed to load projects"
        );
      }
    };

    fetchEmployees();
    fetchManagers();
    fetchTeams();
    fetchProjects();
  }, []);

  const metrics = useMemo(() => {
    const totalEmployees = employeeRows.length;
    const totalTeams = teamItems.length;
    const employeesWithoutTeam = employeeRows.filter(
      (employee) => !employee.team_id || employee.team_id.trim() === ""
    ).length;
    const avgTeamSize = totalTeams > 0 ? totalEmployees / totalTeams : 0;
    const activeProjectsAssigned = new Set(
      teamItems.flatMap((team) => team.project_assigned_ids || [])
    ).size;
    const pendingOnboarding = employeeRows.filter((employee) =>
      ["inactive", "on_leave"].includes(employee.status)
    ).length;

    return [
      {
        icon: Users,
        iconBg: "bg-[#E0F2FE]",
        iconColor: "text-[#0EA5E9]",
        value: String(totalEmployees),
        label: "Total Employees",
        trend: "Live data",
        trendUp: true,
      },
      {
        icon: Folder,
        iconBg: "bg-[#F3E8FF]",
        iconColor: "text-[#A855F7]",
        value: String(totalTeams),
        label: "Total Teams",
        trend: "Live data",
        trendUp: true,
      },
      {
        icon: UserX,
        iconBg: "bg-[#E0E7FF]",
        iconColor: "text-[#6366F1]",
        value: String(employeesWithoutTeam),
        label: "Employees without a Team",
        trend: "Live data",
        trendUp: false,
      },
      {
        icon: TrendingUp,
        iconBg: "bg-[#D1FAE5]",
        iconColor: "text-[#10B981]",
        value: avgTeamSize.toFixed(1),
        label: "Avg. Team Size",
        trend: "Live data",
        trendUp: true,
      },
      {
        icon: CheckSquare,
        iconBg: "bg-[#FEE2E2]",
        iconColor: "text-[#EF4444]",
        value: String(activeProjectsAssigned),
        label: "Active Projects Assigned",
        trend: "Live data",
        trendUp: true,
      },
      {
        icon: Clock,
        iconBg: "bg-[#FFEDD5]",
        iconColor: "text-[#F97316]",
        value: String(pendingOnboarding).padStart(2, "0"),
        label: "Pending Onboarding",
        trend: "Live data",
        trendUp: false,
      },
    ];
  }, [employeeRows, teamItems]);

  const getPerformanceClass = (performance: string) => {
    switch (performance) {
      case "high":
        return "bg-[#DCFCE7] text-[#166534]";
      case "medium":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "low":
        return "bg-[#FEE2E2] text-[#991B1B]";
      default:
        return "bg-[#F3F4F6] text-[#4B5563]";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[#DCFCE7] text-[#166534]";
      case "break":
        return "bg-[#F3F4F6] text-[#4B5563]";
      default:
        return "bg-[#F3F4F6] text-[#4B5563]";
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTeamInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTeamForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTeamLabelToggle = (label: TeamLabel) => {
    setTeamForm((prev) => {
      const exists = prev.labels.includes(label);
      return {
        ...prev,
        labels: exists
          ? prev.labels.filter((l) => l !== label)
          : [...prev.labels, label],
      };
    });
  };

  const handlePermissionToggle = (permission: string) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createUser({
        user_type: form.user_type,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        gender: form.gender,
        dob: form.dob,
        employee_id: form.employee_id,
        team_id: form.team_id,
        project_assigned_ids:
          form.user_type === "sales" && form.project_assigned_ids.length > 0
            ? form.project_assigned_ids
            : undefined,
        avatar_url: form.avatar_url || undefined,
        status: form.status,
        permissions: form.permissions,
      });

      // Refresh list
      setForm((prev) => ({
        ...prev,
        name: "",
        email: "",
        phone: "",
        password: "",
        dob: "",
        employee_id: "",
        team_id: "",
        project_assigned_ids: [],
        avatar_url: "",
        permissions: [],
      }));
      setIsAddEmployeeOpen(false);
      // Optionally re-fetch users
      // For now: simple reload to keep logic small
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create employee. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFormError(null);
    setTeamSubmitting(true);

    try {
      const workingRegions = teamForm.working_region_input
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        team_title: teamForm.team_title || undefined,
        team_description: teamForm.team_description || undefined,
        team_type: teamForm.team_type || undefined,
        manager_user_id: teamForm.manager_user_id || undefined,
        labels: teamForm.labels.length ? teamForm.labels : undefined,
        team_rating_score: teamForm.team_rating_score
          ? Number(teamForm.team_rating_score)
          : undefined,
        team_logo_url: teamForm.team_logo_url || undefined,
        working_region: workingRegions.length ? workingRegions : undefined,
      };

      if (editingTeamId) {
        await updateTeam(editingTeamId, payload);
      } else {
        await createTeam(payload);
      }

      setTeamForm({
        team_title: "",
        team_description: "",
        team_type: "presales",
        manager_user_id: "",
        labels: [],
        team_rating_score: "",
        team_logo_url: "",
        working_region_input: "",
      });
      setEditingTeamId(null);
      setIsCreateTeamOpen(false);
      // Refresh teams list after creating a team
      setLoadingTeams(true);
      setTeamsError(null);
      try {
        const res = await listTeams();
        setTeamItems(res.teams);
        const mapped: TeamCard[] = res.teams.map((t: TeamListItem) => ({
          id: t.id,
          name: t.team_title,
          leadName: t.manager_name || "—",
          leadAvatar:
            t.team_logo_url || `https://i.pravatar.cc/100?u=team-${t.id}`,
          memberCount: t.member_count,
          projectCount: 0,
          tags: t.labels && t.labels.length
            ? t.labels.map((label) =>
                label === "luxury"
                  ? "Luxury Projects"
                  : label === "budget"
                  ? "Budget"
                  : label.charAt(0).toUpperCase() + label.slice(1)
              )
            : ["High Performer"],
        }));
        setTeamsData(mapped);
      } catch (error) {
        setTeamsError(
          error instanceof Error ? error.message : "Failed to load teams"
        );
      } finally {
        setLoadingTeams(false);
      }
    } catch (error) {
      setTeamFormError(
        error instanceof Error
          ? error.message
          : "Failed to create team. Please try again."
      );
    } finally {
      setTeamSubmitting(false);
    }
  };

  // Define columns for DataTable
  const employeeColumns: Column<Employee>[] = useMemo(
    () => [
      {
        id: 'namePhone',
        header: 'Name & Phone',
        render: (employee) => (
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--text-dark)]">
                {employee.name}
              </span>
              <span className="block text-xs text-[var(--text-secondary)]">
                {employee.phone}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'joinedEmail',
        header: 'Joined & Email',
        render: (employee) => (
          <>
            <span className="block text-sm font-medium text-[var(--text-dark)]">
              {employee.joinedDate}
            </span>
            <span className="block text-xs text-[var(--text-secondary)]">
              {employee.email}
            </span>
          </>
        ),
      },
      {
        id: 'jobFunction',
        header: 'Job Function',
        render: (employee) => (
          <span className="text-sm font-medium text-[var(--text-dark)]">
            {employee.jobFunction}
          </span>
        ),
      },
      {
        id: 'teamAssigned',
        header: 'Team Assigned',
        render: (employee) => (
          <span className="text-sm font-medium text-[var(--text-dark)]">
            {employee.teamAssigned}
          </span>
        ),
      },
      {
        id: 'performance',
        header: 'Performance',
        render: (employee) => (
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getPerformanceClass(
              employee.performance
            )}`}
          >
            {employee.performance.charAt(0).toUpperCase() +
              employee.performance.slice(1)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        render: (employee) => (
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
              employee.status
            )}`}
          >
            {employee.status.charAt(0).toUpperCase() +
              employee.status.slice(1)}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        render: (employee) => (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                router.push(
                  `/employee-management/employee-list/employee-detail?id=${employee.userId}`
                )
              }
              className="px-3 py-1.5 border border-[var(--primary-base)] text-[var(--primary-base)] bg-transparent rounded-md font-medium text-xs hover:bg-[var(--primary-selected)] transition-colors"
            >
              View Detail
            </button>
            <Edit className="w-4 h-4 text-[#9CA3AF] cursor-pointer" />
          </div>
        ),
      },
    ],
    [router]
  );


  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--hover-bg)]">
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-bold text-[var(--text-dark)] mb-5">
          Metrices Breakdown
        </h1>

        {/* Metrics Grid */}
        <div className="flex lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide lg:overflow-visible">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="bg-white p-5 rounded-xl border border-[var(--border-color)] min-w-[200px] flex-shrink-0 lg:min-w-0"
              >
                <div className="flex justify-between items-start mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.iconBg} ${metric.iconColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      metric.trendUp ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}
                  >
                    {metric.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-dark)]">
                  {metric.value}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {metric.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-[var(--border-color)] mb-6">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-2.5 px-1 text-sm font-semibold transition-colors relative ${
              activeTab === 'employees'
                ? 'text-[var(--primary-base)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-dark)]'
            }`}
          >
            Employees
            {activeTab === 'employees' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-2.5 px-1 text-sm font-semibold transition-colors relative ${
              activeTab === 'teams'
                ? 'text-[var(--primary-base)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-dark)]'
            }`}
          >
            Teams
            {activeTab === 'teams' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]" />
            )}
          </button>
        </div>

        {/* Employees Tab Content */}
        {activeTab === 'employees' && (
          <>
            {/* Header Card (Mobile) */}
            <div className="lg:hidden bg-white border border-[var(--border-color)] rounded-xl mb-4 overflow-hidden">
              <div className="p-5">
                <div className="text-lg font-semibold text-[var(--text-dark)] mb-4">
                  All Employees List
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-white text-sm font-medium text-[var(--text-dark)] shrink-0">
                      <Columns className="w-4 h-4" />
                      Column
                    </button>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-3 py-2 border border-[var(--border-color)] rounded-lg outline-none text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop DataTable with header action */}
            <div className="hidden lg:block">
              <DataTable
                data={employeesData}
                columns={employeeColumns}
                title="All Employees List"
                titleAction={
                  <button
                    type="button"
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </button>
                }
                searchPlaceholder="Search"
                isLoading={loadingEmployees}
                getRowId={(employee) => employee.id}
                emptyTitle="No employees found"
                emptyDescription="There are no employees to display."
                containerClassName="mb-0"
              />
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4">
              {employeesData.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-white border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <img
                        src={employee.avatar}
                        alt={employee.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <span className="block text-base font-semibold text-[var(--text-dark)] mb-1">
                          {employee.name}
                        </span>
                        <span className="block text-xs text-[var(--text-secondary)]">
                          {employee.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Joined Date
                      </span>
                      <span className="text-sm text-[var(--text-dark)] font-medium">
                        {employee.joinedDate}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Email
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {employee.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Job Function
                      </span>
                      <span className="text-sm text-[var(--text-dark)] font-medium">
                        {employee.jobFunction}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Team Assigned
                      </span>
                      <span className="text-sm text-[var(--text-dark)] font-medium">
                        {employee.teamAssigned}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Performance
                      </span>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getPerformanceClass(
                          employee.performance
                        )}`}
                      >
                        {employee.performance.charAt(0).toUpperCase() +
                          employee.performance.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Status
                      </span>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          employee.status
                        )}`}
                      >
                        {employee.status.charAt(0).toUpperCase() +
                          employee.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-2.5">
                    <button
                      onClick={() =>
                        router.push(
                          `/employee-management/employee-list/employee-detail?id=${employee.userId}`
                        )
                      }
                      className="flex-1 px-3 py-1.5 border border-[var(--primary-base)] text-[var(--primary-base)] bg-transparent rounded-md font-medium text-xs hover:bg-[var(--primary-selected)] transition-colors"
                    >
                      View Detail
                    </button>
                    <Edit className="w-4.5 h-4.5 text-[#9CA3AF] cursor-pointer" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Teams Tab Content */}
        {activeTab === 'teams' && (
          <>
            {/* Header Card (Mobile) */}
            <div className="lg:hidden bg-white border border-[var(--border-color)] rounded-xl mb-4 overflow-hidden">
              <div className="p-5">
                <div className="text-lg font-semibold text-[var(--text-dark)] mb-4">
                  All Teams List
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-white text-sm font-medium text-[var(--text-dark)] shrink-0">
                      <Columns className="w-4 h-4" />
                      Column
                    </button>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-3 py-2 border border-[var(--border-color)] rounded-lg outline-none text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Team
                  </button>
                </div>
              </div>
            </div>

            {/* Teams Card */}
            <div className="bg-white border border-[var(--border-color)] rounded-xl overflow-hidden">
              {/* Desktop Header */}
              <div className="hidden lg:block p-5 border-b border-[var(--border-color)]">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="text-lg font-semibold text-[var(--text-dark)]">
                    All Teams List
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-white text-sm font-medium text-[var(--text-dark)]">
                        <Columns className="w-4 h-4" />
                        Column
                      </button>
                      <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                          type="text"
                          placeholder="Search"
                          className="w-full pl-10 pr-3 py-2 border border-[var(--border-color)] rounded-lg outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-white text-sm font-medium text-[var(--text-dark)]">
                        <Upload className="w-4 h-4" />
                        Export
                      </button>
                      <button className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#FEE2E2] bg-white text-sm font-medium text-[#EF4444]">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreateTeamOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Create Team
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop/Tablet Teams Grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                {teamsData.map((team) => (
                  <div
                    key={team.id}
                    className="border border-[var(--border-color)] rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2.5">
                        {team.leadAvatar && (
                          <img
                            src={team.leadAvatar}
                            alt={team.leadName}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-dark)]">
                            {team.name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {team.leadName}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const item = teamItems.find((t) => t.id === team.id);
                          if (!item) return;
                          setEditingTeamId(item.id);
                          setTeamForm({
                            team_title: item.team_title,
                            team_description: item.team_description || "",
                            team_type: item.team_type,
                            manager_user_id: item.manager_user_id || "",
                            labels: (item.labels as TeamLabel[]) || [],
                            team_rating_score:
                              item.team_rating_score != null
                                ? String(item.team_rating_score)
                                : "",
                            team_logo_url: item.team_logo_url || "",
                            working_region_input: (item.working_region || []).join(
                              ", "
                            ),
                          });
                          setIsCreateTeamOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-[var(--primary-base)] hover:bg-[var(--active-bg)] transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-dark)]">
                        <Users className="w-3.5 h-3.5 text-[var(--primary-base)]" />
                        {team.memberCount} Member
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-dark)]">
                        <Briefcase className="w-3.5 h-3.5 text-[var(--primary-base)]" />
                        {team.projectCount} Project Assigned
                      </div>
                    </div>
                    <div className="flex gap-1.5 mb-4 flex-wrap">
                      {team.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-[10px] font-semibold ${
                            index === 0
                              ? 'bg-[#F3E8FF] text-[#7E22CE]'
                              : 'bg-[#DCFCE7] text-[#15803D]'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button className="w-full mt-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
                      View All Member
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-4">
                {teamsData.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        {team.leadAvatar && (
                          <img
                            src={team.leadAvatar}
                            alt={team.leadName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <span className="block text-base font-semibold text-[var(--text-dark)] mb-1">
                            {team.name}
                          </span>
                          <span className="block text-xs text-[var(--text-secondary)]">
                            {team.leadName}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const item = teamItems.find((t) => t.id === team.id);
                          if (!item) return;
                          setEditingTeamId(item.id);
                          setTeamForm({
                            team_title: item.team_title,
                            team_description: item.team_description || "",
                            team_type: item.team_type,
                            manager_user_id: item.manager_user_id || "",
                            labels: (item.labels as TeamLabel[]) || [],
                            team_rating_score:
                              item.team_rating_score != null
                                ? String(item.team_rating_score)
                                : "",
                            team_logo_url: item.team_logo_url || "",
                            working_region_input: (item.working_region || []).join(
                              ", "
                            ),
                          });
                          setIsCreateTeamOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-[var(--primary-base)] shrink-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          Members
                        </span>
                        <span className="text-sm text-[var(--text-dark)] font-medium">
                          {team.memberCount} Member
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          Projects Assigned
                        </span>
                        <span className="text-sm text-[var(--text-dark)] font-medium">
                          {team.projectCount} Project Assigned
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          Tags
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {team.tags.map((tag, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                index === 0
                                  ? 'bg-[#F3E8FF] text-[#7E22CE]'
                                  : 'bg-[#DCFCE7] text-[#15803D]'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[var(--border-color)]">
                      <button className="w-full py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium">
                        View All Member
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 lg:p-5 border-t border-[var(--border-color)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span>Total Teams:</span>
                  <span className="font-medium text-[var(--text-dark)]">
                    {teamsData.length}
                  </span>
                </div>
                {teamsError && (
                  <div className="text-xs text-red-600">{teamsError}</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-dark)]">
                Add Employee
              </h2>
              <button
                type="button"
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-dark)]"
              >
                ✕
              </button>
            </div>
            {formError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Role
                  </label>
                  <select
                    name="user_type"
                    value={form.user_type}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="manager">Manager</option>
                    <option value="presales">Presales</option>
                    <option value="sales">Sales</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Employee ID
                  </label>
                  <input
                    name="employee_id"
                    value={form.employee_id}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="BHOOMI-EMP001"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="Employee name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="10–20 digits"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Team (optional)
                  </label>
                  <input
                    name="team_id"
                    value={form.team_id}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="Team ID (UUID) or leave blank"
                  />
                </div>
                {form.user_type === "sales" && (
                  <div className="space-y-1.5 md:col-span-2">
                    {projectsError && (
                      <div className="text-xs text-red-600">{projectsError}</div>
                    )}
                    <MultiSelectDropdown
                      label="Projects (Sales)"
                      placeholder="Select projects"
                      helperText="Choose one or more projects for this sales employee."
                      options={projects.map((p) => ({ id: p.id, label: p.project_title }))}
                      selectedIds={form.project_assigned_ids}
                      onChange={(values) =>
                        setForm((prev) => ({ ...prev, project_assigned_ids: values }))
                      }
                      emptyStateText={projectsError ? "Failed to load projects" : "No projects found"}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Avatar URL (optional)
                  </label>
                  <input
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Permissions
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    'view_leads',
                    'create_leads',
                    'edit_leads',
                    'delete_leads',
                    'view_deals',
                    'create_deals',
                    'edit_deals',
                    'view_reports',
                    'view_analytics',
                    'manage_quotations',
                    'manage_visits',
                    'manage_negotiations',
                    'close_deals',
                    'manage_employees',
                    'manage_routing',
                    'manage_organizations',
                    'view_all_data',
                    'create_teams',
                    'import_data',
                    'manage_projects',
                  ].map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-[var(--border-color)]"
                        checked={form.permissions.includes(permission)}
                        onChange={() => handlePermissionToggle(permission)}
                      />
                      <span className="capitalize">
                        {permission.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-dark)]">
                {editingTeamId ? "Edit Team" : "Create Team"}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-dark)]"
              >
                ✕
              </button>
            </div>
            {teamFormError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {teamFormError}
              </div>
            )}
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Team Title
                  </label>
                  <input
                    name="team_title"
                    value={teamForm.team_title}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="e.g. North Zone"
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Description (optional)
                  </label>
                  <textarea
                    name="team_description"
                    value={teamForm.team_description}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none resize-none"
                    rows={3}
                    placeholder="Short summary of this team"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Team Type
                  </label>
                  <select
                    name="team_type"
                    value={teamForm.team_type}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="presales">Presales</option>
                    <option value="sales">Sales</option>
                    <option value="postsales">Post Sales</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Manager (optional)
                  </label>
                  <select
                    name="manager_user_id"
                    value={teamForm.manager_user_id}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Select manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                        {manager.employee_id
                          ? ` (${manager.employee_id})`
                          : manager.email
                          ? ` (${manager.email})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {loadingManagers && (
                    <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                      Loading managers...
                    </p>
                  )}
                  {managerError && (
                    <p className="mt-1 text-[10px] text-red-600">
                      {managerError}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Team Rating (1-10, optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    name="team_rating_score"
                    value={teamForm.team_rating_score}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Team Logo URL (optional)
                  </label>
                  <input
                    name="team_logo_url"
                    value={teamForm.team_logo_url}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Working Regions (optional)
                  </label>
                  <input
                    name="working_region_input"
                    value={teamForm.working_region_input}
                    onChange={handleTeamInputChange}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm outline-none"
                    placeholder="Comma separated, e.g. North, South"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Labels (optional)
                </label>
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    "inbound",
                    "outbound",
                    "luxury",
                    "budget",
                    "commercial",
                    "residential",
                  ].map((label) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-[var(--border-color)]"
                        checked={teamForm.labels.includes(label as TeamLabel)}
                        onChange={() =>
                          handleTeamLabelToggle(label as TeamLabel)
                        }
                      />
                      <span className="capitalize">
                        {label.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]"
                  disabled={teamSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[var(--primary-base)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  disabled={teamSubmitting}
                >
                  {teamSubmitting ? "Saving..." : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

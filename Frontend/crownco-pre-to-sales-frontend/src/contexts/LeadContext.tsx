"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type LeadStatus = "veryhot" | "hot" | "warm" | "cold" | "rejected";

export type LeadStage =
  | "qualification"
  | "communication"
  | "site-visit"
  | "negotiation"
  | "booking";

export interface LeadStageHistoryItem {
  from: LeadStage;
  to: LeadStage;
  timestamp: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  source: string;
  stage: LeadStage;
  budgetMin?: number;
  budgetMax?: number;
  projectInterest?: string[];
  lastContact?: Date;
  nextFollowUp?: Date;
  priority?: "high" | "medium" | "low";
  createdAt: Date;
  stageHistory?: LeadStageHistoryItem[];
}

// Initial mock data – mirrors LeadList page mock leads
const INITIAL_LEADS: Lead[] = [
  {
    id: "1",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "rajesh@example.com",
    status: "veryhot",
    source: "Website",
    stage: "negotiation",
    budgetMin: 5000000,
    budgetMax: 6000000,
    projectInterest: ["Maaz Palace", "GreenVille Orchid"],
    lastContact: new Date(Date.now() - 1000 * 60 * 30),
    nextFollowUp: new Date(Date.now() + 1000 * 60 * 60 * 24),
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    stageHistory: [],
  },
  {
    id: "2",
    name: "Priya Sharma",
    phone: "+91 98765 43211",
    email: "priya@example.com",
    status: "hot",
    source: "Walking",
    stage: "site-visit",
    budgetMin: 4000000,
    budgetMax: 5000000,
    projectInterest: ["Maaz Palace"],
    lastContact: new Date(Date.now() - 1000 * 60 * 60 * 2),
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    stageHistory: [],
  },
  {
    id: "3",
    name: "Amit Patel",
    phone: "+91 98765 43212",
    email: "amit@example.com",
    status: "warm",
    source: "Assigned By Maaz",
    stage: "communication",
    budgetMin: 6000000,
    budgetMax: 7000000,
    projectInterest: ["Zara Palace", "Crown Heights"],
    lastContact: new Date(Date.now() - 1000 * 60 * 60 * 24),
    nextFollowUp: new Date(Date.now() + 1000 * 60 * 60 * 48),
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    stageHistory: [],
  },
  {
    id: "4",
    name: "Sneha Reddy",
    phone: "+91 98765 43213",
    email: "sneha@example.com",
    status: "hot",
    source: "Referral",
    stage: "booking",
    budgetMin: 5500000,
    budgetMax: 6500000,
    projectInterest: ["Maaz Palace"],
    lastContact: new Date(Date.now() - 1000 * 60 * 60 * 12),
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    stageHistory: [],
  },
  {
    id: "5",
    name: "Vikram Singh",
    phone: "+91 98765 43214",
    email: "vikram@example.com",
    status: "cold",
    source: "Website",
    stage: "qualification",
    budgetMin: 3000000,
    budgetMax: 4000000,
    projectInterest: ["GreenVille Orchid"],
    lastContact: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    stageHistory: [],
  },
  {
    id: "6",
    name: "Testing Qualification Lead",
    phone: "+91 90000 00000",
    email: "test-qualification@example.com",
    status: "veryhot",
    source: "Website",
    stage: "qualification",
    budgetMin: 4500000,
    budgetMax: 5500000,
    projectInterest: ["Maaz Palace"],
    lastContact: new Date(Date.now() - 1000 * 60 * 10),
    nextFollowUp: new Date(Date.now() + 1000 * 60 * 60 * 6),
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    stageHistory: [],
  },
];

const STORAGE_KEY = "crownco_leads";

interface LeadContextValue {
  leads: Lead[];
  getLeadById: (id: string) => Lead | undefined;
  updateLead: (id: string, updater: (prev: Lead) => Lead) => void;
  moveToStage: (id: string, toStage: LeadStage) => void;
}

const LeadContext = createContext<LeadContextValue | undefined>(undefined);

function loadLeadsFromStorage(): Lead[] {
  if (typeof window === "undefined") return INITIAL_LEADS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_LEADS;
    const parsed = JSON.parse(raw) as any[];
    return parsed.map((l) => ({
      ...l,
      createdAt: new Date(l.createdAt),
      lastContact: l.lastContact ? new Date(l.lastContact) : undefined,
      nextFollowUp: l.nextFollowUp ? new Date(l.nextFollowUp) : undefined,
    }));
  } catch {
    return INITIAL_LEADS;
  }
}

function saveLeadsToStorage(leads: Lead[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // ignore
  }
}

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  useEffect(() => {
    const fromStorage = loadLeadsFromStorage();
    setLeads(fromStorage);
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      saveLeadsToStorage(leads);
    }
  }, [leads]);

  const value = useMemo<LeadContextValue>(
    () => ({
      leads,
      getLeadById: (id) => leads.find((l) => l.id === id),
      updateLead: (id, updater) => {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? updater(l) : l))
        );
      },
      moveToStage: (id, toStage) => {
        setLeads((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            const historyEntry: LeadStageHistoryItem = {
              from: l.stage,
              to: toStage,
              timestamp: Date.now(),
            };
            return {
              ...l,
              stage: toStage,
              stageHistory: [...(l.stageHistory ?? []), historyEntry],
            };
          })
        );
      },
    }),
    [leads]
  );

  return (
    <LeadContext.Provider value={value}>{children}</LeadContext.Provider>
  );
}

export function useLeadStore() {
  const ctx = useContext(LeadContext);
  if (!ctx) {
    throw new Error("useLeadStore must be used within a LeadProvider");
  }
  return ctx;
}



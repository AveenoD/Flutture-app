"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Download,
  GridFour,
  List,
  ArrowsDownUp,
  Trash,
  CheckCircle,
  Clock,
  FileText,
  Copy,
  Envelope,
} from "phosphor-react";
import { CreateQuotationDrawer } from "../../components/ui/createQuotationDrawer";
import { QuotationCard, QuotationData } from "../../components/ui/card/quotationCard";
import { KPICard } from "../../components/ui/kpi";
import { Filter, FilterValues } from "../../components/ui/filter";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDebouncedCallback } from "use-debounce";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Sample projects data (same as project inventory)
const availableProjects = [
  {
    name: "Maaz Palace",
    image: "/Property-3 1.png",
    location: "Kurla - City Center",
    configuration: "2BHK - 1200 Sq meter",
    priceRange: "Base Price Range - ₹3Cr - ₹3.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Play Ground"],
  },
  {
    name: "Crown Height",
    image: "/property-1 1.png",
    location: "Andheri - West",
    configuration: "3BHK - 1500 Sq meter",
    priceRange: "Base Price Range - ₹4Cr - ₹4.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Gym"],
  },
  {
    name: "GreenVille Orchid",
    image: "/property-2 1.png",
    location: "Powai - Central",
    configuration: "4BHK - 2000 Sq meter",
    priceRange: "Base Price Range - ₹5Cr - ₹6Cr",
    category: "Commercial",
    status: "Ready Move",
    features: ["Garden View", "Smart Homes", "Club House"],
  },
  {
    name: "Urban Nest",
    image: "/property-2 1.png",
    location: "Bandra - East",
    configuration: "2BHK - 1100 Sq meter",
    priceRange: "Base Price Range - ₹2.5Cr - ₹3Cr",
    category: "Mixed",
    status: "Upcoming",
    features: ["Park View", "Smart Homes", "Swimming Pool"],
  },
];

// Dummy quotations data
const dummyQuotations: QuotationData[] = [
  {
    id: "QT-001",
    status: "approved",
    project: availableProjects[0], // Maaz Palace
    allocatedFlat: {
      wing: "A Wing",
      flatNo: "B-403",
      floor: "12th Floor",
      reraCarpetArea: "705 sq.ft.",
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
    finalPrice: 22745000,
    assignedRepresentative: {
      salesPerson: "Maaz Khan",
      contactNo: "+1 234 567 8900",
      email: "maazkhan78@gmail.com",
      channelPartner: "ABC Realty",
    },
    clientInfo: {
      customerName: "Zishan",
      contactNo: "+91 98765 43210",
      email: "Zishan45@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052567",
      possessionDate: "December 2025",
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: "QT-002",
    status: "pending",
    project: availableProjects[1], // Crown Height
    allocatedFlat: {
      wing: "B Wing",
      flatNo: "A-205",
      floor: "5th Floor",
      reraCarpetArea: "850 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 40000000, isDiscount: false },
      { label: "Parking", amount: 120000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 90000, isDiscount: false },
      { label: "Development Charges", amount: 150000, isDiscount: false },
      { label: "Water Charges", amount: 120000, isDiscount: false },
      { label: "MSEB Charges", amount: 120000, isDiscount: false },
      { label: "Legal Charges", amount: 120000, isDiscount: false },
      { label: "Stamp Duty", amount: 150000, isDiscount: false },
      { label: "Registration Fee", amount: 120000, isDiscount: false },
      { label: "GST", amount: 150000, isDiscount: false },
      { label: "VAT", amount: 120000, isDiscount: false },
      { label: "Extra Work", amount: 100000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 150000, isDiscount: false },
      { label: "Discount (Festival Offer)", amount: 5000000, isDiscount: true },
    ],
    finalPrice: 36020000,
    assignedRepresentative: {
      salesPerson: "Rohit Sharma",
      contactNo: "+91 98765 12345",
      email: "rohit.sharma@email.com",
      channelPartner: "XYZ Properties",
    },
    clientInfo: {
      customerName: "Amit Patel",
      contactNo: "+91 98765 67890",
      email: "amit.patel@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052568",
      possessionDate: "March 2026",
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  },
  {
    id: "QT-003",
    status: "draft",
    project: availableProjects[2], // GreenVille Orchid
    allocatedFlat: {
      wing: "C Wing",
      flatNo: "D-101",
      floor: "1st Floor",
      reraCarpetArea: "1200 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 50000000, isDiscount: false },
      { label: "Parking", amount: 150000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 120000, isDiscount: false },
      { label: "Development Charges", amount: 200000, isDiscount: false },
      { label: "Water Charges", amount: 150000, isDiscount: false },
      { label: "MSEB Charges", amount: 150000, isDiscount: false },
      { label: "Legal Charges", amount: 150000, isDiscount: false },
      { label: "Stamp Duty", amount: 200000, isDiscount: false },
      { label: "Registration Fee", amount: 150000, isDiscount: false },
      { label: "GST", amount: 200000, isDiscount: false },
      { label: "VAT", amount: 150000, isDiscount: false },
      { label: "Extra Work", amount: 200000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 200000, isDiscount: false },
      { label: "Discount (Early Bird)", amount: 8000000, isDiscount: true },
    ],
    finalPrice: 44720000,
    assignedRepresentative: {
      salesPerson: "Priya Singh",
      contactNo: "+91 98765 54321",
      email: "priya.singh@email.com",
      channelPartner: "Premium Realty",
    },
    clientInfo: {
      customerName: "Rajesh Kumar",
      contactNo: "+91 98765 11111",
      email: "rajesh.kumar@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052569",
      possessionDate: "June 2026",
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "QT-004",
    status: "approved",
    project: availableProjects[3], // Urban Nest
    allocatedFlat: {
      wing: "D Wing",
      flatNo: "E-302",
      floor: "8th Floor",
      reraCarpetArea: "950 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 25000000, isDiscount: false },
      { label: "Parking", amount: 80000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 60000, isDiscount: false },
      { label: "Development Charges", amount: 90000, isDiscount: false },
      { label: "Water Charges", amount: 90000, isDiscount: false },
      { label: "MSEB Charges", amount: 90000, isDiscount: false },
      { label: "Legal Charges", amount: 90000, isDiscount: false },
      { label: "Stamp Duty", amount: 90000, isDiscount: false },
      { label: "Registration Fee", amount: 90000, isDiscount: false },
      { label: "GST", amount: 90000, isDiscount: false },
      { label: "VAT", amount: 90000, isDiscount: false },
      { label: "Extra Work", amount: 80000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 90000, isDiscount: false },
      { label: "Discount (New Year Special)", amount: 3000000, isDiscount: true },
    ],
    finalPrice: 22390000,
    assignedRepresentative: {
      salesPerson: "Vikram Singh",
      contactNo: "+91 98765 22222",
      email: "vikram.singh@email.com",
      channelPartner: "Elite Properties",
    },
    clientInfo: {
      customerName: "Sneha Desai",
      contactNo: "+91 98765 33333",
      email: "sneha.desai@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052570",
      possessionDate: "September 2025",
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
  {
    id: "QT-005",
    status: "pending",
    project: availableProjects[0], // Maaz Palace
    allocatedFlat: {
      wing: "E Wing",
      flatNo: "F-501",
      floor: "15th Floor",
      reraCarpetArea: "1100 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 32000000, isDiscount: false },
      { label: "Parking", amount: 100000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 80000, isDiscount: false },
      { label: "Development Charges", amount: 120000, isDiscount: false },
      { label: "Water Charges", amount: 110000, isDiscount: false },
      { label: "MSEB Charges", amount: 110000, isDiscount: false },
      { label: "Legal Charges", amount: 110000, isDiscount: false },
      { label: "Stamp Duty", amount: 110000, isDiscount: false },
      { label: "Registration Fee", amount: 110000, isDiscount: false },
      { label: "GST", amount: 110000, isDiscount: false },
      { label: "VAT", amount: 110000, isDiscount: false },
      { label: "Extra Work", amount: 120000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 110000, isDiscount: false },
      { label: "Discount (Summer Offer)", amount: 4000000, isDiscount: true },
    ],
    finalPrice: 29020000,
    assignedRepresentative: {
      salesPerson: "Anjali Mehta",
      contactNo: "+91 98765 44444",
      email: "anjali.mehta@email.com",
      channelPartner: "Dream Homes Realty",
    },
    clientInfo: {
      customerName: "Karan Malhotra",
      contactNo: "+91 98765 55555",
      email: "karan.malhotra@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052571",
      possessionDate: "January 2026",
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: "QT-006",
    status: "approved",
    project: availableProjects[1], // Crown Height
    allocatedFlat: {
      wing: "F Wing",
      flatNo: "G-608",
      floor: "18th Floor",
      reraCarpetArea: "1350 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 45000000, isDiscount: false },
      { label: "Parking", amount: 130000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 100000, isDiscount: false },
      { label: "Development Charges", amount: 180000, isDiscount: false },
      { label: "Water Charges", amount: 130000, isDiscount: false },
      { label: "MSEB Charges", amount: 130000, isDiscount: false },
      { label: "Legal Charges", amount: 130000, isDiscount: false },
      { label: "Stamp Duty", amount: 180000, isDiscount: false },
      { label: "Registration Fee", amount: 130000, isDiscount: false },
      { label: "GST", amount: 180000, isDiscount: false },
      { label: "VAT", amount: 130000, isDiscount: false },
      { label: "Extra Work", amount: 150000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 180000, isDiscount: false },
      { label: "Discount (VIP Customer)", amount: 6000000, isDiscount: true },
    ],
    finalPrice: 40420000,
    assignedRepresentative: {
      salesPerson: "Rahul Verma",
      contactNo: "+91 98765 66666",
      email: "rahul.verma@email.com",
      channelPartner: "Luxury Estates",
    },
    clientInfo: {
      customerName: "Meera Joshi",
      contactNo: "+91 98765 77777",
      email: "meera.joshi@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052572",
      possessionDate: "April 2026",
    },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  },
  {
    id: "QT-007",
    status: "draft",
    project: availableProjects[2], // GreenVille Orchid
    allocatedFlat: {
      wing: "G Wing",
      flatNo: "H-701",
      floor: "20th Floor",
      reraCarpetArea: "1400 sq.ft.",
    },
    priceBreakdown: [
      { label: "Property Base Price", amount: 55000000, isDiscount: false },
      { label: "Parking", amount: 160000, isDiscount: false },
      { label: "Infrastructure Cost", amount: 130000, isDiscount: false },
      { label: "Development Charges", amount: 220000, isDiscount: false },
      { label: "Water Charges", amount: 160000, isDiscount: false },
      { label: "MSEB Charges", amount: 160000, isDiscount: false },
      { label: "Legal Charges", amount: 160000, isDiscount: false },
      { label: "Stamp Duty", amount: 220000, isDiscount: false },
      { label: "Registration Fee", amount: 160000, isDiscount: false },
      { label: "GST", amount: 220000, isDiscount: false },
      { label: "VAT", amount: 160000, isDiscount: false },
      { label: "Extra Work", amount: 220000, isDiscount: false },
      { label: "One-Time Maintenance", amount: 220000, isDiscount: false },
      { label: "Discount (Pre-Launch)", amount: 9000000, isDiscount: true },
    ],
    finalPrice: 48720000,
    assignedRepresentative: {
      salesPerson: "Neha Kapoor",
      contactNo: "+91 98765 88888",
      email: "neha.kapoor@email.com",
      channelPartner: "Prime Realty Group",
    },
    clientInfo: {
      customerName: "Arjun Reddy",
      contactNo: "+91 98765 99999",
      email: "arjun.reddy@email.com",
    },
    projectSnapshot: {
      areaType: "Urban",
      reraNumber: "P51800052573",
      possessionDate: "August 2026",
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
  },
];

type TabType = "all" | "approved" | "pending" | "draft";
type SortBy = "date" | "price" | "customer";
type ViewMode = "grid" | "list";

const STORAGE_KEY = "crownco_quotations";

// Load quotations from localStorage
const loadQuotationsFromStorage = (): QuotationData[] => {
  if (typeof window === "undefined") return dummyQuotations;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If stored data is empty array, return dummy quotations
      if (Array.isArray(parsed) && parsed.length === 0) {
        return dummyQuotations;
      }
      // Convert date strings back to Date objects
      return parsed.map((q: any) => ({
        ...q,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      }));
    }
  } catch (error) {
    console.error("Error loading quotations from storage:", error);
  }
  return dummyQuotations;
};

// Save quotations to localStorage
const saveQuotationsToStorage = (quotations: QuotationData[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  } catch (error) {
    console.error("Error saving quotations to storage:", error);
  }
};

export default function QuotationPage() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<QuotationData | null>(null);
  const [quotations, setQuotations] = useState<QuotationData[]>(dummyQuotations);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: false,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);

  // Load quotations from localStorage on mount
  useEffect(() => {
    const loaded = loadQuotationsFromStorage();
    // Always set quotations, even if empty (will use dummyQuotations from loadQuotationsFromStorage)
    setQuotations(loaded);
  }, []);

  // Save quotations to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    // Only save if quotations have been initialized (not empty dummy array)
    if (quotations.length > 0) {
      saveQuotationsToStorage(quotations);
    }
  }, [quotations]);

  // Debounce search input
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchQuery(value);
    },
    300
  );

  // KPI Stats Data
  const allKpiStats = useMemo(() => {
    const totalValue = quotations.reduce((sum, q) => sum + q.finalPrice, 0);
    const approvedCount = quotations.filter((q) => q.status === "approved").length;
    const pendingCount = quotations.filter((q) => q.status === "pending").length;
    const thisMonthCount = quotations.filter((q) => {
      const created = q.createdAt ? new Date(q.createdAt) : new Date();
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return [
      {
        icon: "📄",
        value: quotations.length.toString(),
        label: "Total Quotations",
        trend: "+12%",
        trendUp: true,
        color: "var(--primary-base)",
      },
      {
        icon: "💰",
        value: `₹${(totalValue / 10000000).toFixed(1)}Cr`,
        label: "Total Value",
        trend: "+8.5%",
        trendUp: true,
        color: "var(--success)",
      },
      {
        icon: "📅",
        value: thisMonthCount.toString(),
        label: "This Month",
        trend: "+5.2%",
        trendUp: true,
        color: "var(--warning)",
      },
      {
        icon: "✅",
        value: approvedCount.toString(),
        label: "Approved",
        trend: "+2.1%",
        trendUp: true,
        color: "var(--success)",
      },
      {
        icon: "⏳",
        value: pendingCount.toString(),
        label: "Pending",
        trend: "+1.5%",
        trendUp: true,
        color: "var(--warning)",
      },
    ];
  }, [quotations]);

  // Filter quotations based on tab, search, and filters
  const filteredQuotations = useMemo(() => {
    let filtered = [...quotations];

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((q) => q.status === activeTab);
    }

    // Filter by search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.clientInfo.customerName.toLowerCase().includes(query) ||
          q.id.toLowerCase().includes(query) ||
          q.project.name.toLowerCase().includes(query) ||
          q.allocatedFlat.flatNo.toLowerCase().includes(query)
      );
    }

    // Filter by project
    if (filterValues.project) {
      filtered = filtered.filter((q) =>
        q.project.name.toLowerCase().includes(filterValues.project.toLowerCase())
      );
    }

    // Filter by date range
    if (filterValues.dateRange) {
      const now = new Date();
      filtered = filtered.filter((q) => {
        if (!q.createdAt) return false;
        const created = new Date(q.createdAt);
        switch (filterValues.dateRange) {
          case "today":
            return created.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return created >= weekAgo;
          case "month":
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          case "quarter":
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            return created >= quarterStart;
          case "year":
            return created.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Sort quotations
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "price":
          comparison = a.finalPrice - b.finalPrice;
          break;
        case "customer":
          comparison = a.clientInfo.customerName.localeCompare(b.clientInfo.customerName);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [quotations, activeTab, debouncedSearchQuery, filterValues, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

  // Get filter summary
  const getFilterSummary = useCallback(() => {
    const parts: string[] = [];
    if (filterValues.project) parts.push(`Project: ${filterValues.project}`);
    if (filterValues.dateRange) parts.push(`Date: ${filterValues.dateRange}`);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [filterValues]);

  const handleCreateQuotation = (formData: any) => {
    const selectedProject = availableProjects.find((p) => p.name === formData.project);

    if (!selectedProject) return;

    const finalPrice = formData.priceBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);

    const newQuotation: QuotationData = {
      id: `QT-${Date.now()}`,
      status: "draft",
      project: selectedProject,
      allocatedFlat: {
        wing: formData.wing,
        flatNo: formData.flatNo,
        floor: formData.floor,
        reraCarpetArea: formData.reraCarpetArea,
      },
      priceBreakdown: formData.priceBreakdown,
      finalPrice: finalPrice,
      assignedRepresentative: {
        salesPerson: formData.salesPerson,
        contactNo: formData.salesContactNo,
        email: formData.salesEmail,
        channelPartner: formData.channelPartner,
      },
      clientInfo: {
        customerName: formData.customerName,
        contactNo: formData.customerContactNo,
        email: formData.customerEmail,
      },
      projectSnapshot: {
        areaType: "Urban",
        reraNumber: "P51800052567",
        possessionDate: "December 2025",
      },
      createdAt: new Date(),
    };

    setQuotations([newQuotation, ...quotations]);
    setIsDrawerOpen(false);
  };

  const handleUpdateQuotation = (formData: any) => {
    if (!editingQuotation) return;

    const selectedProject = availableProjects.find((p) => p.name === formData.project);
    if (!selectedProject) return;

    const finalPrice = formData.priceBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);

    const updatedQuotation: QuotationData = {
      ...editingQuotation,
      project: selectedProject,
      allocatedFlat: {
        wing: formData.wing,
        flatNo: formData.flatNo,
        floor: formData.floor,
        reraCarpetArea: formData.reraCarpetArea,
      },
      priceBreakdown: formData.priceBreakdown,
      finalPrice: finalPrice,
      assignedRepresentative: {
        salesPerson: formData.salesPerson,
        contactNo: formData.salesContactNo,
        email: formData.salesEmail,
        channelPartner: formData.channelPartner,
      },
      clientInfo: {
        customerName: formData.customerName,
        contactNo: formData.customerContactNo,
        email: formData.customerEmail,
      },
    };

    setQuotations(quotations.map((q) => (q.id === editingQuotation.id ? updatedQuotation : q)));
    setEditingQuotation(null);
    setIsDrawerOpen(false);
  };

  const handleDelete = (quotationId: string) => {
    setQuotations(quotations.filter((q) => q.id !== quotationId));
    setShowDeleteConfirm(null);
  };

  const handleStatusUpdate = (quotationId: string, newStatus: "approved" | "pending" | "draft") => {
    setQuotations(
      quotations.map((q) => (q.id === quotationId ? { ...q, status: newStatus } : q))
    );
  };

  const handleShare = (quotationId: string, method: "copy" | "email") => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation) return;

    const url = `${window.location.origin}/quotation/quotation-detail?id=${quotationId}`;

    if (method === "copy") {
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
        setShowShareMenu(null);
      });
    } else if (method === "email") {
      const subject = encodeURIComponent(`Quotation ${quotation.id} - ${quotation.project.name}`);
      const body = encodeURIComponent(
        `Please find the quotation details at: ${url}\n\nCustomer: ${quotation.clientInfo.customerName}\nProject: ${quotation.project.name}\nFinal Price: ₹${(quotation.finalPrice / 10000000).toFixed(2)} Cr`
      );
      window.location.href = `mailto:${quotation.clientInfo.email}?subject=${subject}&body=${body}`;
      setShowShareMenu(null);
    }
  };

  const handleEdit = (quotationId: string) => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (quotation) {
      setEditingQuotation(quotation);
      setIsDrawerOpen(true);
    }
  };

  const handleView = (quotationId: string) => {
    const searchParams = new URLSearchParams({ id: quotationId });
    router.push(`/quotation/quotation-detail?${searchParams.toString()}`);
  };

  const handleExport = () => {
    if (filteredQuotations.length === 0) {
      alert("No quotations to export");
      return;
    }

    // Create CSV content
    const headers = [
      "ID",
      "Status",
      "Customer Name",
      "Customer Contact",
      "Customer Email",
      "Project",
      "Flat No",
      "Wing",
      "Floor",
      "RERA Area",
      "Final Price (₹)",
      "Sales Person",
      "Channel Partner",
      "Created Date",
    ];

    const rows = filteredQuotations.map((q) => [
      q.id,
      q.status || "draft",
      q.clientInfo.customerName,
      q.clientInfo.contactNo,
      q.clientInfo.email || "",
      q.project.name,
      q.allocatedFlat.flatNo,
      q.allocatedFlat.wing,
      q.allocatedFlat.floor,
      q.allocatedFlat.reraCarpetArea,
      q.finalPrice.toString(),
      q.assignedRepresentative.salesPerson,
      q.assignedRepresentative.channelPartner,
      q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quotations_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortChange = () => {
    if (sortBy === "date") {
      setSortBy("price");
    } else if (sortBy === "price") {
      setSortBy("customer");
    } else {
      setSortBy("date");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Update filter config for quotations
  const filterConfig = {
    dateRange: [
      { value: "", label: "Date Range" },
      { value: "today", label: "Today" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "quarter", label: "This Quarter" },
      { value: "year", label: "This Year" },
    ],
    project: [
      { value: "", label: "By Project" },
      { value: "maaz palace", label: "Maaz Palace" },
      { value: "crown height", label: "Crown Height" },
      { value: "greenville orchid", label: "GreenVille Orchid" },
      { value: "urban nest", label: "Urban Nest" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Quotation</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
              aria-label="Export quotations"
            >
              <Download size={18} weight="regular" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors shadow-sm text-sm sm:text-base"
            >
              <Plus size={20} weight="regular" />
              <span>Create Quotation</span>
            </button>
          </div>
        </div>

        {/* KPI Section */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
            Performance Summary
          </h2>
          {/* First Row - Always show first 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-3 sm:mb-4 lg:mb-5">
            {allKpiStats.slice(0, 4).map((stat, index) => (
              <KPICard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                trend={stat.trend}
                trendUp={stat.trendUp}
                color={stat.color}
              />
            ))}
          </div>
          {/* Second Row - Show extra KPIs when expanded */}
          {showAllKPIs && allKpiStats.length > 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 transition-all duration-300">
              {allKpiStats.slice(4).map((stat, index) => (
                <KPICard
                  key={index + 4}
                  icon={stat.icon}
                  value={stat.value}
                  label={stat.label}
                  trend={stat.trend}
                  trendUp={stat.trendUp}
                  color={stat.color}
                />
              ))}
            </div>
          )}
          {allKpiStats.length > 4 && (
            <button
              onClick={() => setShowAllKPIs(!showAllKPIs)}
              className="w-full mt-4 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
            >
              {showAllKPIs ? "View less" : "View more"}
            </button>
          )}
        </section>

        {/* Filter Bar */}
        <Filter
          config={filterConfig}
          values={filterValues}
          onChange={setFilterValues}
          onClear={() => {
            setFilterValues({
              newLeads: false,
              dateRange: "",
              status: "",
              sources: "",
              budget: "",
              project: "",
            });
            setSearchQuery("");
          }}
          searchValue={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            debouncedSearch(value);
          }}
          searchPlaceholder="Search by customer name, project, or quotation ID"
          itemCount={filteredQuotations.length}
          itemLabel="Quotation"
          filterSummary={getFilterSummary()}
          showSummary={true}
        />

        {/* Tabs and View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
          {/* Tabs */}
          <div className="flex border-b border-[#E3E6F0] overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              All Quotations ({quotations.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("approved");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "approved"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Approved ({quotations.filter((q) => q.status === "approved").length})
            </button>
            <button
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "pending"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({quotations.filter((q) => q.status === "pending").length})
            </button>
            <button
              onClick={() => {
                setActiveTab("draft");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "draft"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Draft ({quotations.filter((q) => q.status === "draft").length})
            </button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sort Controls */}
            <div className="flex items-center gap-1 sm:gap-2 border border-slate-300 rounded-lg p-1">
              <button
                onClick={handleSortChange}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                title={`Sort by ${sortBy}`}
              >
                <ArrowsDownUp size={14} weight="regular" />
                <span className="hidden sm:inline">
                  {sortBy === "date" ? "Date" : sortBy === "price" ? "Price" : "Customer"}
                </span>
              </button>
              <button
                onClick={toggleSortOrder}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-[var(--primary-base)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Grid view"
              >
                <GridFour size={16} weight="regular" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--primary-base)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="List view"
              >
                <List size={16} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {filteredQuotations.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="No quotations found"
            description="Try adjusting your filters or create a new quotation"
            action={{
              label: "Create Quotation",
              onClick: () => setIsDrawerOpen(true),
            }}
          />
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {paginatedQuotations.map((quotation) => (
                  <div key={quotation.id} className="relative">
                    <QuotationCard
                      quotation={quotation}
                      onEdit={() => handleEdit(quotation.id)}
                      onShare={() =>
                        setShowShareMenu(showShareMenu === quotation.id ? null : quotation.id)
                      }
                      onView={() => handleView(quotation.id)}
                    />
                    {/* Action Menu */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {/* Status Update Buttons */}
                      {quotation.status !== "approved" && (
                        <button
                          onClick={() => handleStatusUpdate(quotation.id, "approved")}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={16} weight="fill" />
                        </button>
                      )}
                      {quotation.status !== "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(quotation.id, "pending")}
                          className="p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                          title="Mark as Pending"
                        >
                          <Clock size={16} weight="fill" />
                        </button>
                      )}
                      {quotation.status !== "draft" && (
                        <button
                          onClick={() => handleStatusUpdate(quotation.id, "draft")}
                          className="p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          title="Mark as Draft"
                        >
                          <FileText size={16} weight="fill" />
                        </button>
                      )}
                      {/* Delete Button */}
                      <button
                        onClick={() => setShowDeleteConfirm(quotation.id)}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash size={16} weight="fill" />
                      </button>
                    </div>
                    {/* Share Menu */}
                    {showShareMenu === quotation.id && (
                      <div className="absolute top-12 right-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                        <button
                          onClick={() => handleShare(quotation.id, "copy")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Copy size={16} />
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleShare(quotation.id, "email")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-t border-slate-200"
                        >
                          <Envelope size={16} />
                          Email
                        </button>
                      </div>
                    )}
                    {/* Delete Confirmation */}
                    {showDeleteConfirm === quotation.id && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-20">
                        <div className="bg-white rounded-lg p-4 m-4 max-w-sm">
                          <h3 className="font-semibold mb-2">Delete Quotation?</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            Are you sure you want to delete {quotation.id}? This action cannot be
                            undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(quotation.id)}
                              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {paginatedQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-bold text-[var(--primary-base)]">
                            {quotation.id}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              quotation.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : quotation.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {quotation.status?.toUpperCase() || "DRAFT"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Customer</p>
                            <p className="font-semibold text-slate-900">
                              {quotation.clientInfo.customerName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Project</p>
                            <p className="font-semibold text-slate-900">{quotation.project.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Flat No</p>
                            <p className="font-semibold text-slate-900">
                              {quotation.allocatedFlat.flatNo}
                            </p>
                          </div>
    <div>
                            <p className="text-xs text-slate-500">Final Price</p>
                            <p className="font-semibold text-green-600">
                              ₹{(quotation.finalPrice / 10000000).toFixed(2)} Cr
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(quotation.id)}
                          className="px-3 sm:px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(quotation.id)}
                          className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowShareMenu(showShareMenu === quotation.id ? null : quotation.id)
                            }
                            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                            aria-label="Share"
                          >
                            Share
                          </button>
                          {showShareMenu === quotation.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                              <button
                                onClick={() => handleShare(quotation.id, "copy")}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Copy size={16} />
                                Copy Link
                              </button>
                              <button
                                onClick={() => handleShare(quotation.id, "email")}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-t border-slate-200"
                              >
                                <Envelope size={16} />
                                Email
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm(quotation.id)}
                          className="px-3 py-2 border border-red-300 text-red-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredQuotations.length)} of{" "}
                    {filteredQuotations.length} quotations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-[var(--primary-base)] text-white"
                              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Quotation Drawer */}
      <CreateQuotationDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingQuotation(null);
        }}
        onCreateQuotation={handleCreateQuotation}
        onUpdateQuotation={editingQuotation ? handleUpdateQuotation : undefined}
        editingQuotation={editingQuotation}
        projects={availableProjects}
      />

      {/* Delete Confirmation Modal for List View */}
      {showDeleteConfirm && quotations.find((q) => q.id === showDeleteConfirm) && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-lg p-6 m-4 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">Delete Quotation?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete {quotations.find((q) => q.id === showDeleteConfirm)?.id}
              ? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm) handleDelete(showDeleteConfirm);
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close share menu when clicking outside */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowShareMenu(null)}
        />
      )}
    </div>
  );
}

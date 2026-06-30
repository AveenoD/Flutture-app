"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Buildings,
  CurrencyInr,
  Calendar,
  Tag,
  PlayCircle,
  CheckCircle,
  XCircle,
} from "phosphor-react";
import { PieChart } from "@/components/ui/pieChart";
import {
  getProjectById,
  type ProjectResponse,
  createUnit,
  listUnits,
  createAddon,
  listAddons,
  type UnitResponse as ApiUnitResponse,
  type AddonResponse as ApiAddonResponse,
} from "@/lib/projectsApi";

interface ProjectDetailData {
  project_title: string;
  project_type: "Residential" | "Commercial" | "Mixed Use" | "Plot";
  area_type: "Urban" | "Rural";
  rera_number: string;
  project_status: "planning_stage" | "under_construction" | "ready_to_move";
  full_address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  minimum_unit_price: number;
  maximum_unit_price: number;
  smallest_unit_size: number;
  biggest_unit_size: number;
  project_area_size: number;
  project_floor_count: number;
  expected_possession_date: string;
  amenities: string[];
  project_cover_photo_url: string;
  project_exterior_images_urls: string[];
  project_interior_images_urls: string[];
  project_exterior_videos_urls: string[];
  project_drone_videos_urls: string[];
  project_interior_videos_urls: string[];
  addons_count?: number;
}

type UnitStatus =
  | "available"
  | "booked"
  | "not_for_sale"
  | "selected"
  | "under_negotiation"
  | "unavailable";

type AddonStatus = "active" | "discontinued" | "selected";

interface Unit {
  id: string;
  name: string;
  wing: string;
  floor: number;
  status: UnitStatus;
  carpet_area: number;
  builtup_area: number;
  base_price: number;
  parking_price: number;
  infrastructure_cost: number;
  development_charges: number;
  water_charges: number;
  mseb_charges: number;
  legal_charges: number;
  stamp_duty: number;
  registration_fee: number;
  gst: number;
  vat: number;
  one_time_maintenance: number;
  demand_score: number;
}

interface AddonItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  status: AddonStatus;
  created_at: string;
  updated_at: string;
}

const mockProject: ProjectDetailData = {
  project_title: "Maaz Palace",
  project_type: "Residential",
  area_type: "Urban",
  rera_number: "P51800032567",
  project_status: "under_construction",
  full_address: "Kurla - City Center, near metro station",
  city: "Kurla",
  state: "Maharashtra",
  pincode: "400070",
  country: "India",
  minimum_unit_price: 30000000,
  maximum_unit_price: 35000000,
  smallest_unit_size: 900,
  biggest_unit_size: 1200,
  project_area_size: 2.5,
  project_floor_count: 24,
  expected_possession_date: "2027-12-01",
  amenities: [
    "Swimming Pool",
    "Gym",
    "Power Backup",
    "Parking",
    "Medical",
    "Indoor Game",
    "Yoga Area",
    "Security",
    "Club House",
  ],
  project_cover_photo_url:
    "https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg",
  project_exterior_images_urls: [
    "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg",
    "https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg",
  ],
  project_interior_images_urls: [
    "https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg",
    "https://images.pexels.com/photos/259580/pexels-photo-259580.jpeg",
  ],
  project_exterior_videos_urls: ["Project Walkthrough"],
  project_drone_videos_urls: ["Drone Footage"],
  project_interior_videos_urls: ["Sample Flat Tour"],
};

const mockUnits: Unit[] = [
  {
    id: "1",
    name: "A-101",
    wing: "A",
    floor: 1,
    status: "available",
    carpet_area: 720,
    builtup_area: 900,
    base_price: 21000000,
    parking_price: 500000,
    infrastructure_cost: 300000,
    development_charges: 250000,
    water_charges: 50000,
    mseb_charges: 75000,
    legal_charges: 60000,
    stamp_duty: 850000,
    registration_fee: 30000,
    gst: 1200000,
    vat: 0,
    one_time_maintenance: 150000,
    demand_score: 3,
  },
  {
    id: "2",
    name: "A-102",
    wing: "A",
    floor: 1,
    status: "booked",
    carpet_area: 720,
    builtup_area: 900,
    base_price: 21000000,
    parking_price: 500000,
    infrastructure_cost: 300000,
    development_charges: 250000,
    water_charges: 50000,
    mseb_charges: 75000,
    legal_charges: 60000,
    stamp_duty: 850000,
    registration_fee: 30000,
    gst: 1200000,
    vat: 0,
    one_time_maintenance: 150000,
    demand_score: 4,
  },
  {
    id: "3",
    name: "A-103",
    wing: "A",
    floor: 1,
    status: "not_for_sale",
    carpet_area: 680,
    builtup_area: 860,
    base_price: 20500000,
    parking_price: 400000,
    infrastructure_cost: 280000,
    development_charges: 230000,
    water_charges: 45000,
    mseb_charges: 70000,
    legal_charges: 55000,
    stamp_duty: 820000,
    registration_fee: 30000,
    gst: 1150000,
    vat: 0,
    one_time_maintenance: 140000,
    demand_score: 5,
  },
  {
    id: "4",
    name: "A-104",
    wing: "A",
    floor: 1,
    status: "available",
    carpet_area: 780,
    builtup_area: 960,
    base_price: 22500000,
    parking_price: 500000,
    infrastructure_cost: 320000,
    development_charges: 260000,
    water_charges: 55000,
    mseb_charges: 80000,
    legal_charges: 65000,
    stamp_duty: 900000,
    registration_fee: 30000,
    gst: 1300000,
    vat: 0,
    one_time_maintenance: 160000,
    demand_score: 2,
  },
  {
    id: "5",
    name: "A-105",
    wing: "A",
    floor: 1,
    status: "available",
    carpet_area: 820,
    builtup_area: 1000,
    base_price: 23500000,
    parking_price: 600000,
    infrastructure_cost: 350000,
    development_charges: 280000,
    water_charges: 60000,
    mseb_charges: 85000,
    legal_charges: 70000,
    stamp_duty: 950000,
    registration_fee: 30000,
    gst: 1350000,
    vat: 0,
    one_time_maintenance: 170000,
    demand_score: 1,
  },
  {
    id: "6",
    name: "B-101",
    wing: "B",
    floor: 1,
    status: "booked",
    carpet_area: 700,
    builtup_area: 880,
    base_price: 21500000,
    parking_price: 500000,
    infrastructure_cost: 300000,
    development_charges: 250000,
    water_charges: 50000,
    mseb_charges: 75000,
    legal_charges: 60000,
    stamp_duty: 860000,
    registration_fee: 30000,
    gst: 1210000,
    vat: 0,
    one_time_maintenance: 150000,
    demand_score: 4,
  },
  {
    id: "7",
    name: "B-102",
    wing: "B",
    floor: 1,
    status: "booked",
    carpet_area: 700,
    builtup_area: 880,
    base_price: 21500000,
    parking_price: 500000,
    infrastructure_cost: 300000,
    development_charges: 250000,
    water_charges: 50000,
    mseb_charges: 75000,
    legal_charges: 60000,
    stamp_duty: 860000,
    registration_fee: 30000,
    gst: 1210000,
    vat: 0,
    one_time_maintenance: 150000,
    demand_score: 5,
  },
  {
    id: "8",
    name: "B-103",
    wing: "B",
    floor: 1,
    status: "available",
    carpet_area: 760,
    builtup_area: 940,
    base_price: 22200000,
    parking_price: 500000,
    infrastructure_cost: 310000,
    development_charges: 255000,
    water_charges: 55000,
    mseb_charges: 78000,
    legal_charges: 62000,
    stamp_duty: 880000,
    registration_fee: 30000,
    gst: 1270000,
    vat: 0,
    one_time_maintenance: 155000,
    demand_score: 2,
  },
  {
    id: "9",
    name: "B-104",
    wing: "B",
    floor: 1,
    status: "available",
    carpet_area: 780,
    builtup_area: 960,
    base_price: 22800000,
    parking_price: 550000,
    infrastructure_cost: 330000,
    development_charges: 270000,
    water_charges: 58000,
    mseb_charges: 82000,
    legal_charges: 67000,
    stamp_duty: 910000,
    registration_fee: 30000,
    gst: 1300000,
    vat: 0,
    one_time_maintenance: 165000,
    demand_score: 3,
  },
  {
    id: "10",
    name: "B-105",
    wing: "B",
    floor: 1,
    status: "available",
    carpet_area: 800,
    builtup_area: 980,
    base_price: 23200000,
    parking_price: 550000,
    infrastructure_cost: 340000,
    development_charges: 280000,
    water_charges: 60000,
    mseb_charges: 84000,
    legal_charges: 70000,
    stamp_duty: 930000,
    registration_fee: 30000,
    gst: 1320000,
    vat: 0,
    one_time_maintenance: 168000,
    demand_score: 2,
  },
  {
    id: "11",
    name: "B-106",
    wing: "B",
    floor: 1,
    status: "not_for_sale",
    carpet_area: 760,
    builtup_area: 940,
    base_price: 22000000,
    parking_price: 500000,
    infrastructure_cost: 310000,
    development_charges: 260000,
    water_charges: 56000,
    mseb_charges: 79000,
    legal_charges: 64000,
    stamp_duty: 890000,
    registration_fee: 30000,
    gst: 1280000,
    vat: 0,
    one_time_maintenance: 160000,
    demand_score: 6,
  },
];

const leadSourcesData = [
  { name: "Booking.com", value: 25, color: "#2e90fa" },
  { name: "99acres.com", value: 20, color: "#175CD3" },
  { name: "Magicbrick.com", value: 10, color: "#12b76a" },
  { name: "Nobroker.com", value: 20, color: "#6172f3" },
  { name: "Housing.com", value: 15, color: "#F79009" },
  { name: "Manual", value: 10, color: "#98A2B3" },
];

const formatCurrencyShort = (value: number) => {
  const crore = 10000000;
  if (value >= crore) return `₹${(value / crore).toFixed(1)}Cr`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const getUnitStatusClass = (status: UnitStatus) => {
  switch (status) {
    case "available":
      return "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]";
    case "booked":
      return "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]";
    case "under_negotiation":
      return "bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]";
    case "unavailable":
    case "not_for_sale":
      return "bg-white text-[#98A2B3] border border-dashed border-[#E4E7EC]";
    case "selected":
      return "bg-[#EEF4FF] text-[#3538CD] border border-[#C7D2FE]";
    default:
      return "bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]";
  }
};

const getAddonStatusClass = (status: AddonStatus) => {
  switch (status) {
    case "active":
      return "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]";
    case "discontinued":
      return "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]";
    case "selected":
      return "bg-[#EEF4FF] text-[#3538CD] border border-[#C7D2FE]";
    default:
      return "bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]";
  }
};

const normalizeAddonStatus = (status?: string | null): AddonStatus => {
  switch (status) {
    case "active":
      return "active";
    case "discontinued":
      return "discontinued";
    default:
      return "active";
  }
};

const mapApiAddonToDisplay = (addon: ApiAddonResponse): AddonItem => ({
  id: addon.id,
  title: addon.title,
  description: addon.description ?? null,
  category: addon.category,
  price: addon.price,
  image_url: addon.image_url ?? null,
  status: normalizeAddonStatus(addon.status),
  created_at: addon.created_at,
  updated_at: addon.updated_at,
});

const normalizeUnitStatus = (status?: string | null): UnitStatus => {
  switch (status) {
    case "available":
      return "available";
    case "booked":
      return "booked";
    case "under_negotiation":
      return "under_negotiation";
    case "unavailable":
    case "not_for_sale":
      return "not_for_sale";
    default:
      return "available";
  }
};

const mapApiUnitToDisplay = (unit: ApiUnitResponse): Unit => ({
  id: unit.id,
  name: unit.name,
  wing: unit.wing ?? "",
  floor: unit.floor ?? 0,
  status: normalizeUnitStatus(unit.status),
  carpet_area: unit.carpet_area ?? 0,
  builtup_area: unit.builtup_area ?? 0,
  base_price: unit.base_price ?? 0,
  parking_price: unit.parking_price ?? 0,
  infrastructure_cost: unit.infrastructure_cost ?? 0,
  development_charges: unit.development_charges ?? 0,
  water_charges: unit.water_charges ?? 0,
  mseb_charges: unit.mseb_charges ?? 0,
  legal_charges: unit.legal_charges ?? 0,
  stamp_duty: unit.stamp_duty ?? 0,
  registration_fee: unit.registration_fee ?? 0,
  gst: unit.gst ?? 0,
  vat: unit.vat ?? 0,
  one_time_maintenance: unit.one_time_maintenance ?? 0,
  demand_score: unit.demand_score ?? 0,
});

export default function ProjectDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedAddonId, setSelectedAddonId] = useState<string | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isSavingAddon, setIsSavingAddon] = useState(false);
  const unitFormRef = useRef<HTMLFormElement | null>(null);
  const addonFormRef = useRef<HTMLFormElement | null>(null);

  const fetchUnits = useCallback(async (projectId: string) => {
    try {
      setIsLoadingUnits(true);
      const response = await listUnits(projectId, { page: 1, limit: 100 });
      const mappedUnits = response.units.map(mapApiUnitToDisplay);
      setUnits(mappedUnits);

      setSelectedUnitId((currentSelectedId) => {
        if (
          currentSelectedId &&
          mappedUnits.some((unit) => unit.id === currentSelectedId)
        ) {
          return currentSelectedId;
        }
        return mappedUnits[0]?.id ?? null;
      });
    } catch (e) {
      setUnits([]);
      setSelectedUnitId(null);
      setError((e as Error).message);
    } finally {
      setIsLoadingUnits(false);
    }
  }, []);

  const fetchAddons = useCallback(async (projectId: string) => {
    try {
      setIsLoadingAddons(true);
      const response = await listAddons(projectId, { page: 1, limit: 100 });
      const mappedAddons = response.addons.map(mapApiAddonToDisplay);
      setAddons(mappedAddons);

      setSelectedAddonId((currentSelectedId) => {
        if (
          currentSelectedId &&
          mappedAddons.some((addon) => addon.id === currentSelectedId)
        ) {
          return currentSelectedId;
        }
        return mappedAddons[0]?.id ?? null;
      });
    } catch (e) {
      setAddons([]);
      setSelectedAddonId(null);
      setError((e as Error).message);
    } finally {
      setIsLoadingAddons(false);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("projectId");
    if (!id) {
      setError("Invalid project id.");
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiProject: ProjectResponse = await getProjectById(id);
        setProject({
          project_title: apiProject.project_title,
          project_type:
            apiProject.project_type === "commercial"
              ? "Commercial"
              : "Residential",
          area_type:
            (apiProject.area_type ?? "urban").toLowerCase() === "rural"
              ? "Rural"
              : "Urban",
          rera_number: apiProject.rera_number ?? "",
          project_status:
            (apiProject.project_status as ProjectDetailData["project_status"]) ??
            "planning_stage",
          full_address: apiProject.full_address ?? "",
          city: apiProject.city ?? "",
          state: apiProject.state ?? "",
          pincode: apiProject.pincode ?? "",
          country: apiProject.country ?? "India",
          minimum_unit_price: apiProject.minimum_unit_price ?? 0,
          maximum_unit_price: apiProject.maximum_unit_price ?? 0,
          smallest_unit_size: apiProject.smallest_unit_size ?? 0,
          biggest_unit_size: apiProject.biggest_unit_size ?? 0,
          project_area_size: apiProject.project_area_size ?? 0,
          project_floor_count: apiProject.project_floor_count ?? 0,
          expected_possession_date: apiProject.expected_possession_date ?? "",
          amenities: apiProject.amenities ?? [],
          project_cover_photo_url:
            apiProject.project_cover_photo_url || mockProject.project_cover_photo_url,
          project_exterior_images_urls:
            apiProject.project_exterior_images_urls ?? mockProject.project_exterior_images_urls,
          project_interior_images_urls:
            apiProject.project_interior_images_urls ?? mockProject.project_interior_images_urls,
          project_exterior_videos_urls:
            apiProject.project_exterior_videos_urls ?? mockProject.project_exterior_videos_urls,
          project_drone_videos_urls:
            apiProject.project_drone_videos_urls ?? mockProject.project_drone_videos_urls,
          project_interior_videos_urls:
            apiProject.project_interior_videos_urls ?? mockProject.project_interior_videos_urls,
          addons_count: apiProject.addons_count ?? 0,
        });
        await Promise.all([fetchUnits(id), fetchAddons(id)]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [searchParams, fetchUnits, fetchAddons]);

  const handleUnitClick = (unit: Unit) => {
    if (
      unit.status === "booked" ||
      unit.status === "not_for_sale" ||
      unit.status === "under_negotiation" ||
      unit.status === "unavailable"
    ) {
      return;
    }
    setSelectedUnitId((prev) => (prev === unit.id ? null : unit.id));
  };

  const handleAddonClick = (addon: AddonItem) => {
    setSelectedAddonId((prev) => (prev === addon.id ? null : addon.id));
  };

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  const selectedAddon = addons.find((a) => a.id === selectedAddonId) || null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[var(--surface-neutral)] min-h-full">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
        >
          <span className="text-lg leading-none">←</span>
          <span className="font-medium">Back to Projects</span>
        </button>
        <h1 className="text-base sm:text-xl font-semibold text-[var(--text-dark)]">
          Project Detail
        </h1>
      </div>

      {isLoading && (
        <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto mb-4 text-xs text-[var(--text-secondary)]">
          Loading project…
        </div>
      )}
      {error && (
        <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto mb-4 text-xs text-[var(--error)] bg-[var(--error-soft)] px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 sm:gap-5 lg:gap-6">
        {/* Left column: hero + units + amenities */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="relative h-56 sm:h-64 lg:h-72 w-full">
            <img
              src={project?.project_cover_photo_url ?? mockProject.project_cover_photo_url}
              alt={project?.project_title ?? mockProject.project_title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute top-3 right-3 flex gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/90 text-[var(--text-dark)]">
                {project?.project_type ?? mockProject.project_type}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#FFFAEB] text-[#B54708]">
                Under Construction
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
                  {project?.project_title ?? mockProject.project_title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90 mb-1.5">
                  <MapPin size={16} weight="fill" className="text-[#F79009]" />
                  <span>
                    {project?.full_address ?? mockProject.full_address},{" "}
                    {project?.city ?? mockProject.city},{" "}
                    {project?.state ?? mockProject.state}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] sm:text-xs text-white/90">
                  <span>
                    2BHK - 3BHK •{" "}
                    {project?.smallest_unit_size ?? mockProject.smallest_unit_size} -{" "}
                    {project?.biggest_unit_size ?? mockProject.biggest_unit_size} Sq ft
                  </span>
                  <span>
                    Base Price Range –{" "}
                    {formatCurrencyShort(
                      project?.minimum_unit_price ?? mockProject.minimum_unit_price
                    )}{" "}
                    -{" "}
                    {formatCurrencyShort(
                      project?.maximum_unit_price ?? mockProject.maximum_unit_price
                    )}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(project?.amenities ?? mockProject.amenities).slice(0, 3).map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium bg-white/90 text-[#6941C6]"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Unit Selection */}
        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)]">
              Unit Selection
            </h2>
            <button
              type="button"
              onClick={() => setIsUnitModalOpen(true)}
              className="text-xs sm:text-sm font-medium text-[var(--primary-base)] hover:text-[var(--primary-hover)]"
            >
              + Add Unit
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
            {isLoadingUnits ? (
              <div className="col-span-full text-xs text-[var(--text-secondary)]">
                Loading units…
              </div>
            ) : units.length > 0 ? (
              units.map((unit) => {
                const isSelected = selectedUnitId === unit.id;
                const status: UnitStatus = isSelected ? "selected" : unit.status;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleUnitClick(unit)}
                    className={`min-w-[72px] px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium text-center transition-colors ${getUnitStatusClass(
                      status
                    )}`}
                  >
                    {unit.name}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full text-xs text-[var(--text-secondary)]">
                No units found for this project. Add a unit to get started.
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#ECFDF3] border border-[#A6F4C5]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#FEF3F2] border border-[#FECDCA]" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#F2F4F7] border border-[#E4E7EC]" />
              <span>Not For Sale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#EEF4FF] border border-[#C7D2FE]" />
              <span>Selected</span>
            </div>
          </div>
          {selectedUnit && (
            <div className="mt-4 border-t border-[var(--border-color)] pt-3 text-xs sm:text-sm text-[var(--text-primary)] grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="font-semibold">
                  Selected Unit: {selectedUnit.name}
                </p>
                <p className="text-[var(--text-secondary)]">
                  Wing {selectedUnit.wing} • Floor {selectedUnit.floor}
                </p>
                <p className="text-[var(--text-secondary)]">
                  Carpet / Built-up: {selectedUnit.carpet_area} /{" "}
                  {selectedUnit.builtup_area} Sq ft
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Price Breakup</p>
                <p>
                  Base Price: {formatCurrencyShort(selectedUnit.base_price)}
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                  Parking + Infra + Dev:{" "}
                  {formatCurrencyShort(
                    selectedUnit.parking_price +
                      selectedUnit.infrastructure_cost +
                      selectedUnit.development_charges
                  )}
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                  Taxes (GST + Stamp + Reg):{" "}
                  {formatCurrencyShort(
                    selectedUnit.gst +
                      selectedUnit.stamp_duty +
                      selectedUnit.registration_fee
                  )}
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                  Other Charges (Water, MSEB, Legal, Maintenance):{" "}
                  {formatCurrencyShort(
                    selectedUnit.water_charges +
                      selectedUnit.mseb_charges +
                      selectedUnit.legal_charges +
                      selectedUnit.one_time_maintenance
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Amenities */}
        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)] mb-3">
            Amenities
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {(project?.amenities ?? mockProject.amenities).map((amenity) => (
              <div
                key={amenity}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] bg-[var(--background)]"
              >
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="text-[#12B76A] flex-shrink-0"
                />
                <span>{amenity}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Add-ons */}
        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)]">
                Add-ons
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1">
                {project?.addons_count ?? addons.length} configured project add-ons
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(true)}
              className="text-xs sm:text-sm font-medium text-[var(--primary-base)] hover:text-[var(--primary-hover)]"
            >
              + Add Add-on
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoadingAddons ? (
              <div className="col-span-full text-xs text-[var(--text-secondary)]">
                Loading add-ons…
              </div>
            ) : addons.length > 0 ? (
              addons.map((addon) => {
                const isSelected = selectedAddonId === addon.id;
                const status: AddonStatus = isSelected ? "selected" : addon.status;
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => handleAddonClick(addon)}
                    className={`text-left rounded-xl border px-3 py-3 transition-colors ${getAddonStatusClass(
                      status
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-dark)] truncate">
                          {addon.title}
                        </p>
                        <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] capitalize">
                          {addon.category}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/80">
                        {addon.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-dark)]">
                      {formatCurrencyShort(addon.price)}
                    </p>
                    {addon.description && (
                      <p className="mt-1 text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-2">
                        {addon.description}
                      </p>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full text-xs text-[var(--text-secondary)]">
                No add-ons found for this project. Add a project add-on to get started.
              </div>
            )}
          </div>

          {selectedAddon && (
            <div className="mt-4 border-t border-[var(--border-color)] pt-3 text-xs sm:text-sm text-[var(--text-primary)] grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="font-semibold">
                  Selected Add-on: {selectedAddon.title}
                </p>
                <p className="text-[var(--text-secondary)] capitalize">
                  Category: {selectedAddon.category}
                </p>
                <p className="text-[var(--text-secondary)]">
                  Status: {selectedAddon.status}
                </p>
                {selectedAddon.description && (
                  <p className="text-[var(--text-secondary)]">
                    {selectedAddon.description}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Pricing</p>
                <p>Price: {formatCurrencyShort(selectedAddon.price)}</p>
                {selectedAddon.image_url && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background)]">
                    <img
                      src={selectedAddon.image_url}
                      alt={selectedAddon.title}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        </div>

        {/* Right column: overview + media + lead sources */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)]">
            Project Overview
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Area Type</span>
              <span className="font-medium">{project?.area_type ?? mockProject.area_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">RERA Number</span>
              <span className="font-medium">
                {project?.rera_number ?? mockProject.rera_number}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">
                Possession Date
              </span>
              <span className="font-medium">
                {new Date(
                  project?.expected_possession_date ??
                    mockProject.expected_possession_date
                ).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Total Floors</span>
              <span className="font-medium">
                {project?.project_floor_count ?? mockProject.project_floor_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">
                Project Area
              </span>
              <span className="font-medium">
                {project?.project_area_size ?? mockProject.project_area_size} acres
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Total Add-ons</span>
              <span className="font-medium">
                {project?.addons_count ?? addons.length}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)] mb-3">
            Media Gallery
          </h2>
          <div className="space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden border border-[var(--border-color)]">
              <img
                src={
                  (project?.project_exterior_images_urls ??
                    mockProject.project_exterior_images_urls)[0]
                }
                alt="Project exterior"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(project?.project_exterior_images_urls ??
                mockProject.project_exterior_images_urls
              ).map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Project exterior thumbnail"
                  className="w-20 h-16 rounded-lg object-cover border border-[var(--border-color)] flex-shrink-0"
                />
              ))}
              {(project?.project_interior_images_urls ??
                mockProject.project_interior_images_urls
              ).map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Project interior thumbnail"
                  className="w-20 h-16 rounded-lg object-cover border border-[var(--border-color)] flex-shrink-0"
                />
              ))}
            </div>
            <div className="space-y-2">
              {[
                ...(project?.project_exterior_videos_urls ??
                  mockProject.project_exterior_videos_urls),
                ...(project?.project_drone_videos_urls ??
                  mockProject.project_drone_videos_urls),
                ...(project?.project_interior_videos_urls ??
                  mockProject.project_interior_videos_urls),
              ].map((title) => (
                <button
                  key={title}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle
                      size={18}
                      className="text-[var(--primary-base)] flex-shrink-0"
                    />
                    {title}
                  </span>
                  <span className="text-[var(--text-secondary)] text-[10px] sm:text-xs">
                    3:45
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        </div>
      </div>

      {isUnitModalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center px-4 sm:px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnitModalOpen(false);
          }}
        >
          <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border-color)]">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-dark)]">
                Add Unit
              </h2>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <form
              ref={unitFormRef}
              className="max-h-[70vh] overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="A-107"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Wing
                  </label>
                  <input
                    type="text"
                    name="wing"
                    placeholder="A"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Floor
                  </label>
                  <input
                    type="number"
                    name="floor"
                    placeholder="7"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Carpet Area (Sq ft)
                  </label>
                  <input
                    type="number"
                    name="carpet_area"
                    placeholder="750"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Built-up Area (Sq ft)
                  </label>
                  <input
                    type="number"
                    name="builtup_area"
                    placeholder="950"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Base Price
                  </label>
                  <input
                    type="number"
                    name="base_price"
                    placeholder="21000000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Parking Price
                  </label>
                  <input
                    type="number"
                    name="parking_price"
                    placeholder="500000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Infrastructure Cost
                  </label>
                  <input
                    type="number"
                    name="infrastructure_cost"
                    placeholder="300000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Development Charges
                  </label>
                  <input
                    type="number"
                    name="development_charges"
                    placeholder="250000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Water Charges
                  </label>
                  <input
                    type="number"
                    name="water_charges"
                    placeholder="50000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    MSEB Charges
                  </label>
                  <input
                    type="number"
                    name="mseb_charges"
                    placeholder="75000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Legal Charges
                  </label>
                  <input
                    type="number"
                    name="legal_charges"
                    placeholder="60000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    One-time Maintenance
                  </label>
                  <input
                    type="number"
                    name="one_time_maintenance"
                    placeholder="150000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    GST
                  </label>
                  <input
                    type="number"
                    name="gst"
                    placeholder="1200000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Stamp Duty
                  </label>
                  <input
                    type="number"
                    name="stamp_duty"
                    placeholder="850000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Registration Fee
                  </label>
                  <input
                    type="number"
                    name="registration_fee"
                    placeholder="30000"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Demand Score (1-10)
                  </label>
                  <input
                    type="number"
                    name="demand_score"
                    min={1}
                    max={10}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="not_for_sale">Not For Sale</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--border-color)] bg-[var(--background)]">
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-xs sm:text-sm font-semibold hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingUnit}
                onClick={async () => {
                  if (!unitFormRef.current || isSavingUnit) return;

                  const projectId = searchParams.get("projectId");
                  if (!projectId) {
                    setError("Missing project id for unit creation.");
                    return;
                  }

                  const formData = new FormData(unitFormRef.current);
                  const get = (name: string) =>
                    (formData.get(name)?.toString().trim() ?? "") || undefined;
                  const num = (name: string): number | undefined => {
                    const v = get(name);
                    if (!v) return undefined;
                    const n = Number(v);
                    return Number.isNaN(n) ? undefined : n;
                  };

                  const payload: Parameters<typeof createUnit>[1] = {
                    name: get("name") ?? "",
                    unit_type: "flat",
                    status: (get("status") as string) || "available",
                    wing: get("wing"),
                    floor: num("floor"),
                    carpet_area: num("carpet_area"),
                    builtup_area: num("builtup_area"),
                    base_price: num("base_price"),
                    parking_price: num("parking_price"),
                    infrastructure_cost: num("infrastructure_cost"),
                    development_charges: num("development_charges"),
                    water_charges: num("water_charges"),
                    mseb_charges: num("mseb_charges"),
                    legal_charges: num("legal_charges"),
                    one_time_maintenance: num("one_time_maintenance"),
                    gst: num("gst"),
                    stamp_duty: num("stamp_duty"),
                    registration_fee: num("registration_fee"),
                    demand_score: num("demand_score"),
                  };

                  try {
                    setIsSavingUnit(true);
                    const createdUnit = await createUnit(projectId, payload);
                    await fetchUnits(projectId);
                    setSelectedUnitId(createdUnit.id);
                    setIsUnitModalOpen(false);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setIsSavingUnit(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[var(--primary-base)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingUnit ? "Saving..." : "Save Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddonModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-dark)]">
                Add Project Add-on
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Create a project-level add-on for pricing and negotiation flows.
              </p>
            </div>

            <form ref={addonFormRef} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Car Parking"
                    required
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Category
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="parking">Parking</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="flooring">Flooring</option>
                    <option value="window">Window</option>
                    <option value="door">Door</option>
                    <option value="ceiling">Ceiling</option>
                    <option value="sanitary">Sanitary</option>
                    <option value="furniture">Furniture</option>
                    <option value="electrical">Electrical</option>
                    <option value="stairs">Stairs</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    placeholder="250000"
                    min={0}
                    required
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Optional short description"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  placeholder="https://example.com/addon.jpg"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  >
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--border-color)] bg-[var(--background)]">
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-xs sm:text-sm font-semibold hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAddon}
                onClick={async () => {
                  if (!addonFormRef.current || isSavingAddon) return;

                  const projectId = searchParams.get("projectId");
                  if (!projectId) {
                    setError("Missing project id for add-on creation.");
                    return;
                  }

                  const formData = new FormData(addonFormRef.current);
                  const get = (name: string) =>
                    (formData.get(name)?.toString().trim() ?? "") || undefined;
                  const num = (name: string): number | undefined => {
                    const v = get(name);
                    if (!v) return undefined;
                    const n = Number(v);
                    return Number.isNaN(n) ? undefined : n;
                  };

                  const payload: Parameters<typeof createAddon>[1] = {
                    title: get("title") ?? "",
                    description: get("description"),
                    category: (get("category") ?? "other") as string,
                    price: num("price") ?? 0,
                    image_url: get("image_url"),
                    status: (get("status") as string) || "active",
                  };

                  try {
                    setIsSavingAddon(true);
                    const createdAddon = await createAddon(projectId, payload);
                    await fetchAddons(projectId);
                    setSelectedAddonId(createdAddon.id);
                    setIsAddonModalOpen(false);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setIsSavingAddon(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[var(--primary-base)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingAddon ? "Saving..." : "Save Add-on"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
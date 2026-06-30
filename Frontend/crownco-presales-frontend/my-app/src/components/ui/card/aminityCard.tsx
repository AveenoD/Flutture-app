"use client";

export enum AmenityIcon {
  SwimmingPool = "🏊",
  Gym = "🏋️",
  PowerBackup = "⚡",
  Parking = "🅿️",
  Medical = "🏥",
  IndoorGame = "🎯",
  YogaArea = "🧘",
  Security = "🛡️",
  Playground = "⚽",
  ClubHouse = "🏛️",
  Garden = "🌳",
  Elevator = "🛗",
  Wifi = "📶",
  AirConditioning = "❄️",
  Laundry = "🧺",
}

export interface AmenityCardProps {
  icon: AmenityIcon | string;
  name: string;
  className?: string;
}

export function AmenityCard({ icon, name, className = "" }: AmenityCardProps) {
  return (
    <div
      className={`border border-slate-200 p-4 text-center rounded-lg ${className}`}
    >
      <div className="text-2xl mb-2 text-[var(--primary-base)]">{icon}</div>
      <p className="text-sm text-slate-700">{name}</p>
    </div>
  );
}


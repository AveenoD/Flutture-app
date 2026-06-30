"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  User, 
  Envelope, 
  Phone, 
  Calendar,
  Camera,
  Check,
  X,
  Users
} from "phosphor-react";
import { Button } from "@/components/ui/Button";
import KPICard from "@/components/ui/kpiCard";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState({
    name: "Sarah",
    email: "sarah@crownco.com",
    phone: "+91 98765 43210",
    designation: "Manager",
    profilePhoto: "/pexels-karola-g-6345317.jpg",
  });

  // Stats Data
  const stats = [
    { icon: <Users size={24} weight="regular" className="text-[var(--primary-base)]" />, value: "128", label: "Total Employees", trend: "+3.2%", trendUp: true },
    { icon: <User size={24} weight="regular" className="text-[var(--success)]" />, value: "9.4%", label: "Team Performance", trend: "+0.7%", trendUp: true },
    { icon: <Calendar size={24} weight="regular" className="text-[var(--purple)]" />, value: "64", label: "Active Projects", trend: "+1.8%", trendUp: true },
  ];

  // Activity Data
  const activityData = {
    lastLogin: "Today, 2:30 PM",
    accountCreated: "15 Jan 2024",
  };

  const handleSave = () => {
    // Save profile data logic here
    setIsEditing(false);
    console.log("Profile saved:", profileData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, profilePhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-full py-4 sm:py-6 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Profile</h1>
          {!isEditing && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
              leftIcon={<User size={20} weight="regular" />}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Header Card */}
        <div className="bg-[var(--background)] rounded-xl p-4 sm:p-5 lg:p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Profile Photo */}
            <div className="relative">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[var(--surface-neutral)] border-4 border-[var(--primary-selected)]">
                <Image
                  src={profileData.profilePhoto}
                  alt={profileData.name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-[var(--primary-base)] text-white p-2 rounded-full cursor-pointer hover:bg-[var(--primary-hover)] transition-colors">
                  <Camera size={16} weight="regular" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-1">
                {profileData.name}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-2">{profileData.designation}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Envelope size={16} weight="regular" />
                  <span>{profileData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} weight="regular" />
                  <span>{profileData.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {stats.map((stat, index) => (
            <KPICard
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              trend={stat.trend}
              trendUp={stat.trendUp}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Basic Information */}
          <div className="bg-[var(--background)] rounded-xl p-4 sm:p-5 lg:p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Basic Information</h3>
            </div>
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-[var(--text-secondary)]">{profileData.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-[var(--text-secondary)]">{profileData.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-[var(--text-secondary)]">{profileData.phone}</p>
                )}
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Designation
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.designation}
                    onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-[var(--text-secondary)]">{profileData.designation}</p>
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    leftIcon={<Check size={18} weight="regular" />}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    leftIcon={<X size={18} weight="regular" />}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Info */}
          <div className="bg-[var(--background)] rounded-xl p-4 sm:p-5 lg:p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Activity</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--hover-bg)] rounded-lg">
                <Calendar size={20} weight="regular" className="text-[var(--primary-base)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Last Login</p>
                  <p className="text-xs text-[var(--text-secondary)]">{activityData.lastLogin}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--hover-bg)] rounded-lg">
                <Calendar size={20} weight="regular" className="text-[var(--primary-base)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Account Created</p>
                  <p className="text-xs text-[var(--text-secondary)]">{activityData.accountCreated}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

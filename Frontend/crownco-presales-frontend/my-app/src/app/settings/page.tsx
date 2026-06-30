"use client";

import { useState } from "react";
import { Bell, Envelope, Globe, Calendar, Check, Lock } from "phosphor-react";
import { Button } from "../../components/ui/Button";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    language: "English",
    dateFormat: "DD/MM/YYYY",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    if (key === "emailNotifications" || key === "pushNotifications") {
      setSettings({ ...settings, [key]: !settings[key] });
      setHasChanges(true);
    }
  };

  const handleSelectChange = (key: "language" | "dateFormat", value: string) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Save settings logic here
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      console.log("Settings saved:", settings);
      // Show success message if needed
    }, 500);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    // Password change logic here
    console.log("Password changed");
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-full py-4 sm:py-6 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#344054]">Settings</h1>
          {hasChanges && (
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<Check size={18} weight="regular" />}
            >
              Save Changes
            </Button>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-[#EAECF0] shadow-sm">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <Bell size={24} weight="regular" className="text-[var(--primary-base)]" />
            <h2 className="text-lg sm:text-xl font-semibold text-[#344054]">Notifications</h2>
          </div>
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
              <div className="flex items-center gap-3">
                <Envelope size={20} weight="regular" className="text-[var(--primary-base)]" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#344054]">Email Notifications</p>
                  <p className="text-xs sm:text-sm text-[#667085]">Receive email updates about your activities</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle("emailNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-base)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-base)]"></div>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
              <div className="flex items-center gap-3">
                <Bell size={20} weight="regular" className="text-[var(--primary-base)]" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-[#344054]">Push Notifications</p>
                  <p className="text-xs sm:text-sm text-[#667085]">Receive browser notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => handleToggle("pushNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-base)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-base)]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Account Security Section */}
        <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-[#EAECF0] shadow-sm">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <Lock size={24} weight="regular" className="text-[var(--primary-base)]" />
            <h2 className="text-lg sm:text-xl font-semibold text-[#344054]">Account Security</h2>
          </div>
          <div className="space-y-4">
            {!showPasswordForm ? (
              <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                <div className="flex items-center gap-3">
                  <Lock size={20} weight="regular" className="text-[var(--primary-base)]" />
                  <div>
                    <p className="text-sm sm:text-base font-medium text-[#344054]">Password</p>
                    <p className="text-xs sm:text-sm text-[#667085]">Last updated 30 days ago</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#344054] mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#344054] mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#344054] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handlePasswordChange}
                    className="flex-1"
                  >
                    Update Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-[#EAECF0] shadow-sm">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <Globe size={24} weight="regular" className="text-[var(--primary-base)]" />
            <h2 className="text-lg sm:text-xl font-semibold text-[#344054]">Preferences</h2>
          </div>
          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                Language
              </label>
              <div className="relative">
                <Globe size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <select
                  value={settings.language}
                  onChange={(e) => handleSelectChange("language", e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base bg-white appearance-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                </select>
              </div>
            </div>

            {/* Date Format */}
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                Date Format
              </label>
              <div className="relative">
                <Calendar size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleSelectChange("dateFormat", e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base bg-white appearance-none cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

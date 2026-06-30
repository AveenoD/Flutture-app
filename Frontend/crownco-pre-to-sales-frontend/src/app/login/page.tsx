"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Envelope, Lock, Eye, EyeSlash } from "phosphor-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    // Simulate login API call
    setTimeout(() => {
      // For demo purposes, accept any email/password
      // In real app, this would be an API call
      console.log("Login attempt:", formData);
      setIsLoading(false);
      // Redirect to dashboard
      router.push("/caller/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              <Image
                src="/Crown co Logo.svg"
                alt="CrownCo Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#344054] mb-2">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-[#667085]">
            Sign in to your CrownCo account
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#EAECF0] shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#344054] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]">
                  <Envelope size={20} weight="regular" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full pl-11 pr-4 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#344054] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]">
                  <Lock size={20} weight="regular" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] text-sm sm:text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#344054] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlash size={20} weight="regular" />
                  ) : (
                    <Eye size={20} weight="regular" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[var(--primary-base)] border-[#EAECF0] rounded focus:ring-2 focus:ring-[var(--primary-base)]"
                />
                <span className="text-sm text-[#344054]">Remember me</span>
              </label>
              <a
                href="#"
                className="text-sm text-[var(--primary-base)] hover:text-[var(--primary-hover)] transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-[var(--surface-error)] border border-[var(--error)] rounded-lg">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="mt-6"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#667085]">
            Don't have an account?{" "}
            <a
              href="#"
              className="text-[var(--primary-base)] hover:text-[var(--primary-hover)] font-medium transition-colors"
            >
              Contact Admin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

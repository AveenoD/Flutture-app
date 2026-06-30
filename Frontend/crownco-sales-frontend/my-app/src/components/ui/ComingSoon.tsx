"use client";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({ 
  title = "Coming Soon", 
  description = "We're working on something amazing. This feature will be available soon!" 
}: ComingSoonProps) {
  return (
    <div className="min-h-full flex items-center justify-center py-8">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-[var(--primary-base)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-[var(--primary-base)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#344054] mb-3">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
              {description}
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-[#EAECF0]">
            <p className="text-xs text-[#98A2B3]">
              Stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


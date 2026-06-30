import React from "react";
import { Phone } from "lucide-react";
import Image from "next/image";

type FollowUpItem = {
  name: string;
  avatar?: string;
  time: string;
  status: "Scheduled" | "Pending" | "Completed";
};

type FollowUpsProps = {
  title?: string;
  followUps: FollowUpItem[];
};

export function FollowUps({
  title = "Follow Ups",
  followUps,
}: FollowUpsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "Scheduled":
        return "bg-blue-500";
      case "Pending":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">{title}</h2>
      
      <div className="space-y-3 sm:space-y-4">
        {followUps.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {/* Avatar */}
            {item.avatar ? (
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={item.avatar}
                  alt={item.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-slate-200 flex-shrink-0" />
            )}

            {/* Name and Time */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs sm:text-sm lg:text-base text-slate-900 truncate">
                {item.name}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-600">
                {item.time}
              </div>
            </div>

            {/* Status and Phone Icon */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getStatusColor(item.status)}`} />
                <span className="text-[10px] sm:text-xs text-slate-600 font-medium">
                  {item.status}
                </span>
              </div>
              <button className="p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0">
                <Phone size={14} className="text-slate-600 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


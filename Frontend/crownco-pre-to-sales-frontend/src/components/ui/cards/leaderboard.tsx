import React from "react";
import Image from "next/image";

type LeaderboardStat = {
  icon: React.ReactNode;
  label: string;
};

type LeaderboardPerformer = {
  rank: string;
  name: string;
  points: string;
  avatar?: string;
};

type FeaturedPerformer = {
  rank: string;
  name: string;
  points: string;
  avatar?: string;
};

type LeaderboardProps = {
  title?: string;
  featured: FeaturedPerformer;
  stats: LeaderboardStat[];
  performers: LeaderboardPerformer[];
};

export function Leaderboard({
  title = "Leaderboard",
  featured,
  stats,
  performers,
}: LeaderboardProps) {
  return (
    <section className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
      <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold mb-4 sm:mb-5 lg:mb-6 text-slate-900">{title}</h2>

      {/* Featured Performer */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {featured.avatar ? (
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-yellow-400/50">
            <Image
              src={featured.avatar}
              alt={featured.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 64px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-slate-200 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 truncate">
            {featured.rank} {featured.name}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 font-semibold">
            {featured.points}
          </div>
        </div>
      </div>

      {/* Leader Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-3 sm:p-3.5 bg-white/60 backdrop-blur-sm rounded-xl text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-center text-xl sm:text-2xl lg:text-3xl mb-1.5 sm:mb-2 text-slate-600">
              {stat.icon}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <hr className="my-4 sm:my-5 border-0 border-t border-slate-200/50" />

      <div className="text-xs sm:text-sm lg:text-base font-bold mb-3 sm:mb-4 text-slate-900">
        Top Performers This Month
      </div>
      <div className="space-y-2 sm:space-y-2.5">
        {performers.map((performer, index) => (
          <div
            key={index}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer group"
          >
            {performer.avatar ? (
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-200/50 group-hover:ring-slate-300/50 transition-all">
                <Image
                  src={performer.avatar}
                  alt={performer.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-slate-200 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs sm:text-sm lg:text-base text-slate-900 truncate group-hover:text-[var(--primary-base)] transition-colors">
                {performer.rank} {performer.name}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 font-semibold flex-shrink-0">
              {performer.points}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


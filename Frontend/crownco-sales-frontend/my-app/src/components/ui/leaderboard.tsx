import React from "react";

type LeaderboardStat = {
  icon: string;
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
    <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">{title}</h2>

      {/* Featured Performer */}
      <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-5 p-2.5 lg:p-3 rounded-lg bg-slate-50">
        {featured.avatar ? (
          <img
            src={featured.avatar}
            alt={featured.name}
            className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full bg-slate-200 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="font-semibold text-xs sm:text-sm lg:text-base text-slate-900">
            {featured.rank} {featured.name}
          </div>
          <div className="text-[10px] sm:text-xs lg:text-sm text-slate-600 font-medium">
            {featured.points}
          </div>
        </div>
      </div>

      {/* Leader Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:gap-3 my-4 lg:my-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-2 sm:p-3 lg:p-3.5 bg-slate-50 rounded-lg text-center text-xs lg:text-sm border border-slate-200"
          >
            <div className="text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-1.5 lg:mb-2">{stat.icon}</div>
            <div className="text-[0.625rem] sm:text-[0.688rem] lg:text-xs text-slate-600 leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <hr className="my-4 lg:my-5 border-0 border-t border-slate-200 opacity-70" />

      <div className="text-xs sm:text-sm lg:text-base font-semibold mb-2.5 lg:mb-3 text-slate-900">
        Top Performers This Month
      </div>
      <div className="space-y-3 lg:space-y-3.5">
        {performers.map((performer, index) => (
          <div
            key={index}
            className="flex items-center gap-3 lg:gap-4 p-2.5 lg:p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {performer.avatar ? (
              <img
                src={performer.avatar}
                alt={performer.name}
                className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full bg-slate-200 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs sm:text-sm lg:text-base text-slate-900 truncate">
                {performer.rank} {performer.name}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs lg:text-sm text-slate-600 font-medium flex-shrink-0">
              {performer.points}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}



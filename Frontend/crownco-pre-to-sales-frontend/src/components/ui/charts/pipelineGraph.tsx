import React from "react";

type PipelineItem = {
  name: string;
  value: number;
  percentage: number;
};

type PipelineGraphProps = {
  title?: string;
  data: PipelineItem[];
  barColor?: string;
};

export function PipelineGraph({
  title = "Lead Pipeline",
  data,
  barColor = "var(--primary-base)",
}: PipelineGraphProps) {
  return (
    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
      <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-4 sm:mb-5 text-slate-900">{title}</h2>
      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        {data.map((item, index) => (
          <div key={index} className="mb-3 sm:mb-4 lg:mb-5 last:mb-0">
            <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base text-slate-700 font-semibold mb-2 sm:mb-2.5">
              <span>{item.name}</span>
              <span className="text-slate-900 font-bold">{item.value}</span>
            </div>
            <div className="h-2.5 sm:h-3 lg:h-3.5 bg-slate-100/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${item.percentage}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


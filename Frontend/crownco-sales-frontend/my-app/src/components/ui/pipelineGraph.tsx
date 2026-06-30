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
    <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">{title}</h2>
      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        {data.map((item, index) => (
          <div key={index} className="mb-3 sm:mb-4 lg:mb-5 last:mb-0">
            <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base text-slate-600 font-medium mb-1.5 lg:mb-2">
              <span>{item.name}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 sm:h-2.5 lg:h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


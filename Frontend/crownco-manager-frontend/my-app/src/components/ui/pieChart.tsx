import React, { useMemo } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type PieChartData = {
  name: string;
  value: number;
  color: string;
};

export type PieChartProps = {
  title?: string;
  data: PieChartData[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  legendColumns?: number;
  className?: string;
  showTooltip?: boolean;
};

// Custom Tooltip Component
const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-md shadow-lg p-2.5">
        <p className="text-sm font-semibold text-[var(--text-dark)] mb-1">
          {data.name}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {data.value}
        </p>
      </div>
    );
  }
  return null;
};

export function PieChart({
  title = "Lead Sources",
  data,
  height = 180,
  innerRadius = 60,
  outerRadius = 80,
  showLegend = true,
  legendColumns = 2,
  className = "",
  showTooltip = true,
}: PieChartProps) {
  // Calculate total for percentage calculation
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  // Validate data
  if (!data || data.length === 0) {
    return (
      <section
        className={`bg-[var(--background)] rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-[var(--border-color)] shadow-sm ${className}`}
      >
        {title && (
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-[var(--text-dark)]">
            {title}
          </h2>
        )}
        <div className="text-center py-8 text-[var(--text-secondary)]">
          No data available
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bg-[var(--background)] rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow transition-colors ${className}`}
    >
      {title && (
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-[var(--text-dark)]">
          {title}
        </h2>
      )}

      {/* Donut Chart */}
      <div className="text-center py-4 sm:py-5 lg:py-6">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
          </RechartsPieChart>
        </ResponsiveContainer>

        {showLegend && (
          <div
            className={`mt-4 sm:mt-6 lg:mt-8 grid grid-cols-${legendColumns} gap-x-3 sm:gap-x-4 lg:gap-x-5 gap-y-2 lg:gap-y-3 text-[10px] sm:text-xs lg:text-sm text-[var(--text-secondary)]`}
            style={{
              gridTemplateColumns: `repeat(${legendColumns}, minmax(0, 1fr))`,
            }}
          >
            {data.map((entry, index) => {
              const percentage =
                total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <div
                  key={index}
                  className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5"
                >
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[var(--text-secondary)] truncate">
                    {entry.name} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}


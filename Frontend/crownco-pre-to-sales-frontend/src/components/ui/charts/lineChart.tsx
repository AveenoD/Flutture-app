"use client";

import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type LineChartData = {
  name: string;
  [key: string]: string | number;
};

type LineChartProps = {
  title?: string;
  data: LineChartData[];
  lines: {
    dataKey: string;
    name: string;
    color: string;
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
};

export function LineChart({
  title,
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className = "",
}: LineChartProps) {
  return (
    <section
      className={`bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ${className}`}
    >
      {title && (
        <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-4 sm:mb-5 text-slate-900">
          {title}
        </h2>
      )}

      <div className="w-full">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />}
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tick={{ fill: "#6b7280" }} />
            <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: "#6b7280" }} />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                }}
              />
            )}
            {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}

            {lines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 6 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}



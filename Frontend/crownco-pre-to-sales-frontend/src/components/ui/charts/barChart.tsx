"use client";

import React from "react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type BarChartData = {
  name: string;
  [key: string]: string | number;
};

type BarChartProps = {
  title?: string;
  data: BarChartData[];
  bars: {
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

export function BarChart({
  title,
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className = "",
}: BarChartProps) {
  return (
    <section className={`bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ${className}`}>
      {title && (
        <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-4 sm:mb-5 text-slate-900">{title}</h2>
      )}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />}
            <XAxis 
              dataKey="name" 
              stroke="#6b7280" 
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            {showTooltip && (
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
              />
            )}
            {showLegend && (
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
            )}
            {bars.map((bar, index) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}


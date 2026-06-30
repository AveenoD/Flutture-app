"use client";

import React from "react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type BarChartData = {
  name: string;
  Lead: number;
  Call: number;
};

type BarChartProps = {
  title?: string;
  data: BarChartData[];
  leadColor?: string;
  callColor?: string;
  height?: number;
};

export function BarChart({
  title = "Leads & Calls Overview",
  data,
  leadColor = "#3b82f6",
  callColor = "#10b981",
  height = 300,
}: BarChartProps) {
  return (
    <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">{title}</h2>
      
      <div className="w-full" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#9ca3af"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#9ca3af"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#fff", 
                border: "1px solid #e5e7eb", 
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="square"
            />
            <Bar dataKey="Lead" fill={leadColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Call" fill={callColor} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}


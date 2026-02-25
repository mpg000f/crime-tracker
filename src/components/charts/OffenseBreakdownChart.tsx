"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#e55039", "#2e86ab", "#f5c542", "#78e08f", "#e77f67", "#aaa69d"];

interface DataItem {
  name: string;
  value: number;
}

interface Props {
  data: DataItem[];
  title: string;
}

export default function OffenseBreakdownChart({ data, title }: Props) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={11}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240 10% 6%)",
                border: "1px solid hsl(240 3.7% 15.9%)",
                borderRadius: "8px",
              }}
              formatter={(val: number) => val.toLocaleString()}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

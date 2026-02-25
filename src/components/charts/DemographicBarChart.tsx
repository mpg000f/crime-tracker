"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#e55039", "#2e86ab", "#f5c542", "#78e08f", "#e77f67", "#aaa69d", "#8854d0", "#20bf6b"];

interface DataItem {
  value: string;
  count: number;
}

interface Props {
  data: DataItem[];
  title: string;
}

export default function DemographicBarChart({ data, title }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    ...d,
    pct: total > 0 ? ((d.count / total) * 100) : 0,
  }));

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
            <XAxis type="number" stroke="#888" fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="value" stroke="#888" fontSize={12} width={90} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240 10% 6%)",
                border: "1px solid hsl(240 3.7% 15.9%)",
                borderRadius: "8px",
              }}
              formatter={(val: number, name: string, props: any) => [
                `${val.toFixed(1)}% (${props.payload.count.toLocaleString()})`,
                "Share",
              ]}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

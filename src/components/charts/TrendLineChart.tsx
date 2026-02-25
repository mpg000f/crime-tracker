"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface DataPoint {
  year: number;
  stateRate: number;
  nationalRate?: number;
}

interface Props {
  data: DataPoint[];
  stateName: string;
  offenseLabel: string;
}

export default function TrendLineChart({ data, stateName, offenseLabel }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="year" stroke="#888" fontSize={12} />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(240 10% 6%)",
              border: "1px solid hsl(240 3.7% 15.9%)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#999" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="stateRate"
            name={stateName}
            stroke="#e55039"
            strokeWidth={2}
            dot={false}
          />
          {data.some((d) => d.nationalRate !== undefined) && (
            <Line
              type="monotone"
              dataKey="nationalRate"
              name="National Avg"
              stroke="#2e86ab"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  change?: number; // percentage change, e.g. 0.05 = +5%
}

export default function StatsCard({ title, value, subtitle, change }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      {change !== undefined && (
        <p className={`mt-1 text-sm font-medium ${change >= 0 ? "text-red-400" : "text-green-400"}`}>
          {change >= 0 ? "+" : ""}
          {(change * 100).toFixed(1)}% vs prior year
        </p>
      )}
    </div>
  );
}

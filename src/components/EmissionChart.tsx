import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { EmissionSnapshot } from "@/lib/mock-data";

interface EmissionChartProps {
  data: EmissionSnapshot[];
}

export function EmissionChart({ data }: EmissionChartProps) {
  // Show last 24 points
  const chartData = data.slice(-24).map((d) => ({
    time: d.time,
    emissions: Number(d.totalKg.toFixed(1)),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Carbon Emissions
          </h3>
          <p className="text-xs text-muted-foreground">Rolling 12-hour window (kg CO₂)</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">LIVE</span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="emissionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 15%, 18%)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220, 18%, 10%)",
                border: "1px solid hsl(220, 15%, 18%)",
                borderRadius: "8px",
                color: "hsl(150, 10%, 92%)",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="emissions"
              stroke="hsl(152, 70%, 45%)"
              strokeWidth={2}
              fill="url(#emissionGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

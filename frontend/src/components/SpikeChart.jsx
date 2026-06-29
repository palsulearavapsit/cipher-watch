import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";

const THRESHOLD = 60; // engine RISK_THRESHOLD

// Risk-over-time for the focused entity. The calm band sits below the threshold
// line; an attack punches the line up through it — the unmistakable spike.
export default function SpikeChart({ entity, series }) {
  const data = series.length ? series : [{ t: 0, risk: 0 }];
  const peak = Math.max(...data.map((d) => d.risk), 0);
  const breached = peak >= THRESHOLD;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-faint">
          Risk timeline — <span className="tabnum text-muted">{entity ?? "—"}</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: breached ? "var(--color-threat)" : "var(--color-faint)" }}>
          peak <span className="tabnum">{peak}</span>
        </div>
      </div>

      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-threat)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-threat)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis
              domain={[0, 100]}
              ticks={[0, THRESHOLD, 100]}
              tick={{ fill: "var(--color-faint)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            {/* calm zone below the threshold */}
            <ReferenceArea y1={0} y2={THRESHOLD} fill="var(--color-calm)" fillOpacity={0.05} />
            <ReferenceLine
              y={THRESHOLD}
              stroke="var(--color-threat-dim)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="var(--color-threat)"
              strokeWidth={2}
              fill="url(#riskFill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

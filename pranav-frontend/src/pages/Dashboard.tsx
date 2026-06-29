import React from 'react';
import { RecentAlertsCard } from "../components/RecentAlertsCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Activity
} from 'lucide-react';

import { useThreats } from '../hooks/useThreats';

const PIE_COLORS = [
  "#22d3ee",
  "#ef4444",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#eab308",
  "#ec4899"
];

const formatScore = (score: number) =>
  score.toString().padStart(2, '0');


export const Dashboard: React.FC = () => {
  const { threats } = useThreats();

  const totalThreats = threats.length;

  const highRisk = threats.filter(
    threat => threat.score >= 80
  ).length;

  const mediumRisk = threats.filter(
    threat => threat.score >= 50 && threat.score < 80
  ).length;

  const lowRisk = threats.filter(
    threat => threat.score < 50
  ).length;

  const riskDistribution = [
    {
      name: 'High',
      value: highRisk
    },
    {
      name: 'Medium',
      value: mediumRisk
    },
    {
      name: 'Low',
      value: lowRisk
    }
  ];

// Determine most common threat type
const threatTypeCounts: Record<string, number> = {};

threats.forEach((threat) => {
  threatTypeCounts[threat.type] =
    (threatTypeCounts[threat.type] || 0) + 1;
});

const threatTypeChartData = Object.entries(
  threatTypeCounts
).map(([name, value]) => ({
  name,
  value
}));


const mostCommonThreat =
  Object.entries(threatTypeCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "None";

// Determine system status
let systemStatus = "SECURE";

const recentThreats = [...threats]
  .sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  )
  .slice(0, 5);


  const threatCounts: Record<string, number> = {};

threats.forEach((threat) => {
  const day = new Date(threat.timestamp)
    .toLocaleDateString('en-US', { weekday: 'short' });

  threatCounts[day] = (threatCounts[day] || 0) + 1;
});

const threatsOverTime = Object.entries(threatCounts).map(
  ([date, count]) => ({
    date,
    count
  })
);

const averageThreatScore =
  threats.length > 0
    ? Math.round(
        threats.reduce(
          (sum, threat) => sum + threat.score,
          0
        ) / threats.length
      )
    : 0;

let heatStatus = "SECURE";

if (averageThreatScore >= 80) {
  heatStatus = "CRITICAL";
} else if (averageThreatScore >= 50) {
  heatStatus = "WARNING";
}


  const statCards = [
    {
      label: 'Threats Detected',
      value: totalThreats,
      icon: Activity,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10'
    },
    {
      label: 'High Risk',
      value: highRisk,
      icon: ShieldAlert,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      label: 'Medium Risk',
      value: mediumRisk,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      label: 'Low Risk',
      value: lowRisk,
      icon: ShieldCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    }
  ];

const getThreatColor = (score: number) => {
  if (score >= 80)
    return "text-red-400";

  if (score >= 50)
    return "text-orange-400";

  return "text-green-400";
};

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">
          SOC Dashboard
        </h2>
        <p className="text-slate-400 text-sm">
          Real-time threat monitoring overview.
        </p>
      </header>
    
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;

          return (
            <div
              key={i}
              className="bg-[#0a0e17] rounded-xl p-5 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">
                  {stat.label}
                </p>

                <p className="text-3xl font-bold text-white font-mono">
                  {formatScore(stat.value)}
                </p>
              </div>

              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

{/* AI Summary + Recent Feed */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

  {/* AI Security Summary */}
  <div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">
        AI Security Summary
      </h3>

      <span
        className={`px-3 py-1 rounded-full text-sm font-bold border ${
          systemStatus === "CRITICAL"
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : systemStatus === "WARNING"
            ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
            : "bg-green-500/10 border-green-500/30 text-green-400"
        }`}
      >
        {systemStatus}
      </span>
    </div>

    <div className="space-y-2 text-sm">
      <p className="text-slate-300">
        • {totalThreats} threats detected
      </p>

      <p className="text-slate-300">
        • {highRisk} high-risk threats identified
      </p>

      <p className="text-slate-300">
        • Most common attack type:
        {" "}
        <span className="text-cyan-400">
          {mostCommonThreat}
        </span>
      </p>

      <p className="text-slate-300">
        • Recommended action:
        {" "}
        {systemStatus === "CRITICAL"
          ? "Immediate investigation required."
          : systemStatus === "WARNING"
          ? "Monitor suspicious activity closely."
          : "System operating normally."}
      </p>
    </div>
  
</div>

<div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
  <h3 className="text-lg font-semibold text-white mb-6">
    Top Threat Types
  </h3>

  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={threatTypeChartData}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          label={({ name, value }) =>
            `${name}: ${value}`
          }
        >
          {threatTypeChartData.map(
            (_entry, index) => (
              <Cell
                key={index}
                fill={
                  PIE_COLORS[
                    index % PIE_COLORS.length
                  ]
                }
              />
            )
          )}
        </Pie>

        <Tooltip
          contentStyle={{
            backgroundColor: "#0a0e17",
            border: "1px solid #334155",
            color: "#ffffff"
          }}
          labelStyle={{
            color: "#ffffff"
          }}
          itemStyle={{
            color: "#ffffff"
          }}
        />

        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>


{/* Threat Heat Score */}
<div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
  <h3 className="text-lg font-semibold text-white mb-6">
    Threat Heat Score
  </h3>

  <div className="flex flex-col items-center justify-center">
    
    <div
      className={`w-40 h-40 rounded-full border-8 flex items-center justify-center ${
        averageThreatScore >= 80
          ? "border-red-500"
          : averageThreatScore >= 50
          ? "border-orange-500"
          : "border-green-500"
      }`}
    >
      <div className="text-center">
        <p className="text-4xl font-bold text-white">
          {averageThreatScore}
        </p>
        <p className="text-sm text-slate-400">
          /100
        </p>
      </div>
    </div>

    <p
      className={`mt-4 text-lg font-bold ${
        averageThreatScore >= 80
          ? "text-red-400"
          : averageThreatScore >= 50
          ? "text-orange-400"
          : "text-green-400"
      }`}
    >
      {heatStatus}
    </p>

    <p className="text-sm text-slate-400 mt-2 text-center max-w-md">
      Overall system risk calculated from
      the average severity of all detected threats.
    </p>

  </div>
</div>


  {/* Recent Threat Feed */}
  <div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
    <h3 className="text-lg font-semibold text-white mb-4">
      Recent Threat Feed
    </h3>

    <div className="space-y-3">
      {recentThreats.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No threats available.
        </p>
      ) : (
        recentThreats.map((threat) => (
          <div
            key={threat.id}
            className="flex items-center justify-between border-b border-slate-800 pb-3"
          >
            <div>
              <p
                className={`font-medium ${getThreatColor(
                  threat.score
                )}`}
              >
                {threat.type}
              </p>

              <p className="text-xs text-slate-500">
                {new Date(
                  threat.timestamp
                ).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <p className="font-mono text-white">
                Score: {threat.score}
              </p>

              <p className="text-xs text-slate-400 capitalize">
                {threat.status}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>

</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* Risk Distribution */}
        <div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-6">
            Risk Distribution
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskDistribution}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{
                    backgroundColor: '#0a0e17',
                    borderColor: '#1e293b',
                    color: '#f8fafc'
                  }}
                />

                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threats Over Time */}
        <div className="bg-[#0a0e17] rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-6">
            Threats Over Time
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={threatsOverTime}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0
                }}
              >
                <defs>
                  <linearGradient
                    id="colorCount"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#22d3ee"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="#22d3ee"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0e17',
                    borderColor: '#1e293b',
                    color: '#f8fafc'
                  }}
                  itemStyle={{
                    color: '#22d3ee'
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="mt-6">
        <RecentAlertsCard />
      </div>

    </div>
  );
};

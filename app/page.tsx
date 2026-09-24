"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Metric = {
  _id: string;
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
};

type ApiMetric = Partial<Metric> & {
  totalRequest?: number;
  avgResponseTIme?: number;
};

type TimeseriesPoint = {
  time: string;
  [endpoint: string]: string | number;
};

export default function Home() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsResponse, timeseriesResponse] = await Promise.all([
          fetch("http://localhost:4000/metrics"),
          fetch("http://localhost:4000/metrics/timeseries"),
        ]);

        if (!metricsResponse.ok || !timeseriesResponse.ok) {
          throw new Error("The metrics service returned an error.");
        }

        const [metricsData, timeseriesData] = await Promise.all([
          metricsResponse.json() as Promise<ApiMetric[]>,
          timeseriesResponse.json() as Promise<TimeseriesPoint[]>,
        ]);

        setMetrics(
          metricsData.map((metric) => ({
            _id: metric._id ?? "unknown",
            totalRequests: metric.totalRequests ?? metric.totalRequest ?? 0,
            errorCount: metric.errorCount ?? 0,
            avgResponseTime: metric.avgResponseTime ?? metric.avgResponseTIme ?? 0,
          })),
        );
        setTimeseries(timeseriesData);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
        setError("Unable to load metrics. Check that the API server is running on port 4000.");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics(); // run once immediately on load

    const intervalId = setInterval(fetchMetrics, 5000); // then every 5 seconds

    return () => clearInterval(intervalId); // cleanup when component unmounts
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-400">Loading metrics...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0.00";
  const avgResponseTime =
    metrics.length > 0
      ? (metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length).toFixed(0)
      : "0";
  const busiest = [...metrics].sort((a, b) => b.totalRequests - a.totalRequests)[0];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">DevPulse</h1>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-slate-400">Last updated: {lastUpdated || "—"}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Requests" value={totalRequests.toLocaleString()} />
        <SummaryCard label="Error Rate" value={`${errorRate}%`} />
        <SummaryCard label="Avg Response Time" value={`${avgResponseTime}ms`} />
        <SummaryCard label="Busiest Endpoint" value={busiest ? busiest._id : "—"} />
      </div>

      <div className="bg-slate-900 rounded-xl p-6 mb-8 border border-slate-800">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Requests over time</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeseries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
            <Legend />
            <Line type="monotone" dataKey="/checkout" stroke="#f87171" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="/orders" stroke="#60a5fa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="/products" stroke="#34d399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="/users" stroke="#fbbf24" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-left">
              <th className="p-4 font-medium">Endpoint</th>
              <th className="p-4 font-medium">Requests</th>
              <th className="p-4 font-medium">Errors</th>
              <th className="p-4 font-medium">Error %</th>
              <th className="p-4 font-medium">Avg Response</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const errPct = m.totalRequests > 0 ? (m.errorCount / m.totalRequests) * 100 : 0;
              const isHigh = errPct > 5;
              return (
                <tr
                  key={m._id}
                  className={`border-b border-slate-800 last:border-0 ${isHigh ? "bg-red-950/30" : ""
                    }`}
                >
                  <td className="p-4 font-mono">{m._id}</td>
                  <td className="p-4">{m.totalRequests.toLocaleString()}</td>
                  <td className="p-4">{m.errorCount}</td>
                  <td className={`p-4 ${isHigh ? "text-red-400" : ""}`}>
                    {errPct.toFixed(2)}%
                  </td>
                  <td className="p-4">{m.avgResponseTime.toFixed(0)}ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
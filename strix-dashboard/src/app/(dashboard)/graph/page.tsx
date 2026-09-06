"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, ShieldAlert, Target } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";

interface AnalyticsData {
  summary: { totalScans: number; activeScans: number; totalVulns: number; criticalVulns: number };
  severityBreakdown: { name: string; value: number; fill: string }[];
  trendData: { date: string; scans: number }[];
  recentVulns: { id: string; title: string; severity: string; createdAt: string; endpoint: string }[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const iv = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(iv);
  }, []);

  const s: any = {
    page: { padding: 28, display: "flex", flexDirection: "column", gap: 24, height: "100%", overflowY: "auto" },
    grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 },
    card: { background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.5px" },
    cardValue: { fontSize: 32, fontWeight: 700, color: "var(--fg)", marginTop: 12, display: "flex", alignItems: "center", gap: 12 },
    chartCard: { background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", height: 350 },
    chartHead: { padding: "18px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600, color: "var(--fg)" },
    chartBody: { flex: 1, padding: 20, position: "relative" },
    badge: (sev: string) => ({
      display: "inline-block", padding: "4px 8px", borderRadius: "var(--r)", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
      background: sev === "critical" ? "rgba(239, 68, 68, 0.15)" : sev === "high" ? "rgba(249, 115, 22, 0.15)" : sev === "medium" ? "rgba(234, 179, 8, 0.15)" : "rgba(34, 197, 94, 0.15)",
      color: sev === "critical" ? "var(--sev-critical)" : sev === "high" ? "var(--sev-high)" : sev === "medium" ? "var(--sev-medium)" : "var(--sev-low)",
      border: `1px solid ${sev === "critical" ? "rgba(239, 68, 68, 0.3)" : sev === "high" ? "rgba(249, 115, 22, 0.3)" : sev === "medium" ? "rgba(234, 179, 8, 0.3)" : "rgba(34, 197, 94, 0.3)"}`
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: { textAlign: "left", padding: "12px 16px", color: "var(--fg-3)", fontWeight: 500, borderBottom: "1px solid var(--border-md)" },
    td: { padding: "12px 16px", color: "var(--fg)", borderBottom: "1px solid var(--border)", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
  };

  if (loading || !data) return <div style={{ ...s.page, justifyContent: "center", alignItems: "center", color: "var(--fg-3)" }}>Loading Analytics...</div>;

  return (
    <div style={s.page}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--fg)" }}>Analytics & Reports</h1>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>Real-time metrics, vulnerability distribution, and scan trends.</p>
      </div>

      {/* Metric Cards */}
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Total Scans</div>
          <div style={s.cardValue}><Target size={28} color="var(--fg-2)" /> {data.summary.totalScans}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Active Scans</div>
          <div style={s.cardValue}><Activity size={28} color="var(--sev-low)" /> {data.summary.activeScans}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Total Vulnerabilities</div>
          <div style={s.cardValue}><ShieldAlert size={28} color="var(--sev-high)" /> {data.summary.totalVulns}</div>
        </div>
        <div style={{ ...s.card, border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.05)" }}>
          <div style={{ ...s.cardTitle, color: "var(--sev-critical)" }}>Critical Discoveries</div>
          <div style={s.cardValue}><AlertTriangle size={28} color="var(--sev-critical)" /> {data.summary.criticalVulns}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        {/* Vulnerability Breakdown */}
        <div style={s.chartCard}>
          <div style={s.chartHead}>Vulnerability Breakdown</div>
          <div style={s.chartBody}>
            {data.severityBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.severityBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.severityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--fg)" }}
                    itemStyle={{ color: "var(--fg)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--fg-3)" }}>No vulnerabilities found</div>
            )}
          </div>
        </div>

        {/* Scan Trend */}
        <div style={s.chartCard}>
          <div style={s.chartHead}>Scan Activity (Last 7 Days)</div>
          <div style={s.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--fg-2)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--fg-2)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-md)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--fg-3)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--fg-3)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--fg)" }}
                />
                <Area type="monotone" dataKey="scans" stroke="var(--fg)" fillOpacity={1} fill="url(#colorScans)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Discoveries Feed */}
      <div style={{ ...s.chartCard, height: "auto", minHeight: 300 }}>
        <div style={{ ...s.chartHead, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Recent Discoveries
          <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 400 }}>Top {data.recentVulns.length} latest</span>
        </div>
        <div style={{ padding: 0 }}>
          {data.recentVulns.length > 0 ? (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Vulnerability</th>
                  <th style={s.th}>Severity</th>
                  <th style={s.th}>Endpoint</th>
                  <th style={s.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentVulns.map(v => (
                  <tr key={v.id} style={{ transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...s.td, fontWeight: 500 }}>{v.title}</td>
                    <td style={s.td}><span style={s.badge(v.severity.toLowerCase())}>{v.severity}</span></td>
                    <td style={{ ...s.td, color: "var(--fg-2)" }}>{v.endpoint || "Global"}</td>
                    <td style={{ ...s.td, color: "var(--fg-3)", fontSize: 12 }}>{new Date(v.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>No vulnerabilities discovered yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

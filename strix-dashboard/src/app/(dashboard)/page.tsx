"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Activity,
  Target,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Radar,
  Globe,
  ShieldCheck,
  Wrench,
  Terminal,
  Zap,
} from "lucide-react";

interface Scan {
  id: string;
  target: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  finishedAt: string | null;
  vulnCount: number;
  scanMode: string;
}

interface Vuln {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informative" | "info";
  endpoint: string;
  scanTarget: string;
  scanId: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function securityScore(vulns: Vuln[]) {
  if (vulns.length === 0) return 100;
  let deduction = 0;
  for (const v of vulns) {
    if (v.severity === "critical") deduction += 20;
    else if (v.severity === "high") deduction += 10;
    else if (v.severity === "medium") deduction += 4;
    else deduction += 1;
  }
  return Math.max(0, 100 - deduction);
}

function statusLedClass(status: string) {
  if (status === "running") return "status-led running";
  if (status === "completed") return "status-led completed";
  if (status === "failed") return "status-led failed";
  return "status-led stopped";
}

function sevClass(s: string) {
  const normalized = s.toLowerCase() === "info" ? "informative" : s.toLowerCase();
  return `sev sev-${normalized}`;
}

function SecurityScoreGauge({ score }: { score: number }) {
  const radius = 30;
  const stroke = 5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "var(--sev-low)" : score >= 45 ? "var(--sev-medium)" : "var(--sev-critical)";

  return (
    <div style={{ position: "relative", width: 68, height: 68, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg height={radius * 2 + 8} width={radius * 2 + 8} style={{ transform: "rotate(-90deg)" }}>
        <circle
          stroke="rgba(255,255,255,0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius + 4}
          cy={radius + 4}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius + 4}
          cy={radius + 4}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 8, color: "var(--fg-3)", fontWeight: 700, letterSpacing: "0.5px" }}>SCORE</span>
      </div>
    </div>
  );
}

function LiveThreatTicker({ scans, activeCount }: { scans: Scan[]; activeCount: number }) {
  const [tickerTime, setTickerTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTickerTime(new Date().toTimeString().split(" ")[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const latestTarget = scans[0]?.target || "127.0.0.1";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "var(--r)",
      padding: "8px 14px",
      fontSize: 11.5,
      fontFamily: "var(--font-mono)",
      marginBottom: 16,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      flexWrap: "wrap",
      gap: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: activeCount > 0 ? "var(--sev-critical)" : "var(--sev-low)",
            boxShadow: `0 0 8px ${activeCount > 0 ? "var(--sev-critical)" : "var(--sev-low)"}`,
            animation: activeCount > 0 ? "pulse 1.5s infinite" : "none"
          }} />
          <span style={{ color: "var(--fg)", fontWeight: 700, letterSpacing: "0.5px" }}>
            STRIX OFFENSIVE PENTEST ORCHESTRATOR
          </span>
        </div>
        <span style={{ color: "var(--fg-3)" }}>|</span>
        <span style={{ color: activeCount > 0 ? "var(--sev-critical)" : "var(--fg-2)", fontWeight: 600 }}>
          {activeCount > 0 ? `[ENGAGEMENT ACTIVE] ${activeCount} Pentest Agent(s) Operating` : "[STANDBY] Agent Daemon Ready"}
        </span>
        <span style={{ color: "var(--fg-3)" }}>|</span>
        <span style={{ color: "var(--fg-3)" }}>
          Engagement Target: <span style={{ color: "var(--fg)" }}>{latestTarget}</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-3)" }}>
        <span>DAEMON: ACTIVE</span>
        <span>•</span>
        <span style={{ color: "var(--fg-2)" }}>{tickerTime}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [recentVulns, setRecentVulns] = useState<Vuln[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch scan list + vulnerability details
  const fetchData = useCallback(async (includeVulns = true) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch("/api/scans", { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      const scanList: Scan[] = data.scans ?? [];
      setScans(scanList);

      // Only fetch individual vuln details on initial load or explicit refresh
      if (includeVulns) {
        const vulns: Vuln[] = [];
        for (const scan of scanList.slice(0, 3)) {
          try {
            const detail = await fetch(`/api/scans/${scan.id}`).then((r) => r.json());
            for (const v of detail.vulnerabilities ?? []) {
              vulns.push({ ...v, scanTarget: scan.target, scanId: scan.id });
            }
          } catch {}
        }
        vulns.sort((a, b) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informative: 4, info: 4 };
          return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
        });
        setRecentVulns(vulns.slice(0, 6));
      }
    } catch {
      clearTimeout(timeout);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalVulns = scans.reduce((s, sc) => s + sc.vulnCount, 0);
  const criticalVulns = recentVulns.filter((v) => v.severity === "critical").length;
  const activeScans = scans.filter((s) => s.status === "running").length;
  const score = securityScore(recentVulns);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 400,
          gap: 12,
          color: "rgba(255,255,255,0.35)",
          fontSize: 13,
        }}
      >
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="page">
      {/* Live Threat Terminal Ticker */}
      <LiveThreatTicker scans={scans} activeCount={activeScans} />

      {/* Intro Header with Unified Action Buttons */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
        <div>
          <h1 className="page-heading">Security Overview</h1>
          <p className="page-desc">
            Monitor your security posture, active scanning agents, and perimeter threat metrics.
          </p>
        </div>

        {/* Quick Action Buttons Group */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href="/scans?new=1"
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <Radar size={14} /> Launch Scan
          </Link>
          <Link
            href="/assets"
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <Globe size={14} /> Assets
          </Link>
          <Link
            href="/compliance"
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <ShieldCheck size={14} /> Compliance
          </Link>
          <Link
            href="/tools"
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <Wrench size={14} /> Hacker Tools
          </Link>
        </div>
      </div>

      {/* Stats Grid - Symmetrical & Balanced */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {/* Card 1: Target Resilience Score */}
        <div className="stat-card" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 130 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="stat-label">
              <span className="stat-label-text">Target Resilience</span>
              <Shield size={14} className="stat-label-icon" />
            </div>
            <div className={`stat-value${score >= 70 ? " success" : score >= 40 ? " warning" : " danger"}`} style={{ fontSize: 28, lineHeight: 1 }}>
              {score}
              <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.5 }}>/100</span>
            </div>
            <div className="stat-sub">
              {score >= 70 ? "Hardened perimeter" : score >= 40 ? "Partial exploitability" : "Severe compromise"}
            </div>
          </div>
          <SecurityScoreGauge score={score} />
        </div>

        {/* Card 2: Critical Findings */}
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130 }}>
          <div className="stat-label">
            <span className="stat-label-text">Critical Exploits</span>
            <AlertTriangle size={14} className="stat-label-icon" />
          </div>
          <div className={`stat-value${criticalVulns > 0 ? " danger" : ""}`} style={{ fontSize: 28, lineHeight: 1 }}>
            {criticalVulns}
          </div>
          <div className="stat-sub">
            {criticalVulns > 0 ? "High-impact verified findings" : "No critical exploits found"}
          </div>
        </div>

        {/* Card 3: Active Pentests */}
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130 }}>
          <div className="stat-label">
            <span className="stat-label-text">Active Pentests</span>
            <Activity size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value" style={{ fontSize: 28, lineHeight: 1 }}>
            {activeScans}
          </div>
          <div className="stat-sub">
            {activeScans > 0 ? "Agents probing attack surface" : "All agents on standby"}
          </div>
        </div>

        {/* Card 4: Total Findings */}
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130 }}>
          <div className="stat-label">
            <span className="stat-label-text">Confirmed Findings</span>
            <Target size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value" style={{ fontSize: 28, lineHeight: 1 }}>
            {totalVulns}
          </div>
          <div className="stat-sub">
            {totalVulns > 0 ? "Verified security vulnerabilities" : "No vulnerabilities discovered"}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="content-grid">
        {/* Recent Scans */}
        <div className="card">
          <div className="section-head">
            <div className="section-head-left">
              <div className="section-title">Recent Scans</div>
              <div className="section-sub">Latest autonomous penetration tests</div>
            </div>
            <Link href="/scans" className="btn-secondary">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {scans.length === 0 ? (
            <div className="empty-state">
              <Radar size={32} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
              <p>No security scans initiated yet.</p>
              <Link
                href="/scans?new=1"
                className="btn-primary"
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Radar size={14} /> Start First Pentest
              </Link>
            </div>
          ) : (
            <div>
              {scans.slice(0, 5).map((scan) => (
                <Link key={scan.id} href={`/scans/${scan.id}`} className="trow">
                  <div className="trow-main">
                    <div className="trow-title">{scan.target}</div>
                    <div className="trow-sub">
                      <span className="tag">{scan.scanMode}</span>
                      <span>{timeAgo(scan.startedAt)}</span>
                    </div>
                  </div>
                  <div className="trow-right">
                    {scan.vulnCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          background: "var(--sev-critical-bg)",
                          color: "var(--sev-critical)",
                          border: "1px solid var(--sev-critical-bd)",
                          borderRadius: "var(--r-sm)",
                        }}
                      >
                        {scan.vulnCount}
                      </span>
                    )}
                    <div className="status-badge">
                      <span className={statusLedClass(scan.status)} />
                      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {scan.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Findings */}
        <div className="card">
          <div className="section-head">
            <div className="section-head-left">
              <div className="section-title">Recent Findings</div>
              <div className="section-sub">Most critical vulnerabilities discovered</div>
            </div>
            <Link href="/vulnerabilities" className="btn-secondary">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentVulns.length === 0 ? (
            <div className="empty-state">
              <ShieldCheck size={32} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
              <p>No vulnerabilities detected in recent assessments.</p>
            </div>
          ) : (
            <div>
              {recentVulns.map((v, i) => (
                <div key={`${v.scanId}-${v.id}-${i}`} className="trow" style={{ cursor: "default" }}>
                  <div className="trow-main">
                    <div className="trow-title">{v.title}</div>
                    <div className="trow-sub">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {v.endpoint}
                      </span>
                    </div>
                  </div>
                  <div className="trow-right">
                    <span className={sevClass(v.severity)}>{v.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

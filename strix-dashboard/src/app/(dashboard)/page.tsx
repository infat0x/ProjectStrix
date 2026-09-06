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
    // Initial load: fetch everything including vuln details
    fetchData(true);
    // Periodic poll: only refresh scan statuses (no per-scan detail fetches)
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
      {/* Intro */}
      <div className="page-intro">
        <h1 className="page-heading">Security Overview</h1>
        <p className="page-desc">
          Monitor your security posture and active scanning agents.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {/* Score */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Security Score</span>
            <Shield size={14} className="stat-label-icon" />
          </div>
          <div
            className={`stat-value${
              score >= 70 ? " success" : score >= 40 ? " warning" : " danger"
            }`}
          >
            {score}
            <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.5 }}>/100</span>
          </div>
          <div className="stat-sub">
            {score >= 70 ? "Good posture" : score >= 40 ? "Fair posture" : "Critical risk"}
          </div>
        </div>

        {/* Critical */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Critical Vulns</span>
            <AlertTriangle size={14} className="stat-label-icon" />
          </div>
          <div className={`stat-value${criticalVulns > 0 ? " danger" : ""}`}>
            {criticalVulns}
          </div>
          <div className="stat-sub">
            {criticalVulns > 0 ? "Immediate action required" : "No critical threats"}
          </div>
        </div>

        {/* Active */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Active Scans</span>
            <Activity size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value">{activeScans}</div>
          <div className="stat-sub">
            {activeScans > 0 ? "Agents currently analyzing" : "All agents idle"}
          </div>
        </div>

        {/* Total */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Total Findings</span>
            <Target size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value">{totalVulns}</div>
          <div className="stat-sub">Across {scans.length} historical scans</div>
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
              <p>No scans initiated yet.</p>
              <Link href="/scans?new=1" className="btn-primary" style={{ marginTop: 4 }}>
                <Shield size={14} /> Start First Scan
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
              <p>No vulnerabilities found in recent scans.</p>
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

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  ExternalLink,
  Play,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Layers,
  Activity,
  Tag,
  Trash2,
  Check,
  X,
  Loader2,
  Server
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Scan {
  id: string;
  target: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  finishedAt: string | null;
  vulnCount: number;
  scanMode: string;
}

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "informative" | "info";
  endpoint: string;
  scanTarget?: string;
  scan?: {
    target: string;
  };
}

interface AssetMetadata {
  environment?: "Production" | "Staging" | "Development" | "Cloud";
  inScope?: boolean;
  notes?: string;
  addedAt?: string;
}

interface TargetAsset {
  target: string;
  scansCount: number;
  lastScanned: string;
  latestStatus: string;
  vulnCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informative: number;
    total: number;
  };
  uniqueEndpoints: number;
  riskScore: number;
  meta: AssetMetadata;
}

function computeRiskScore(vulns: { critical: number; high: number; medium: number; low: number }): number {
  const penalty = (vulns.critical * 25) + (vulns.high * 12) + (vulns.medium * 4) + (vulns.low * 1);
  return Math.max(0, 100 - penalty);
}

function timeAgo(iso: string) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AssetsPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "in" | "out">("all");
  const [assetsMeta, setAssetsMeta] = useState<Record<string, AssetMetadata>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const [newEnv, setNewEnv] = useState<"Production" | "Staging" | "Development" | "Cloud">("Production");
  const [newNotes, setNewNotes] = useState("");
  const [copiedExport, setCopiedExport] = useState(false);

  // Load custom asset metadata from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("strix_asset_meta");
    if (saved) {
      try { setAssetsMeta(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveMeta = (updated: Record<string, AssetMetadata>) => {
    setAssetsMeta(updated);
    localStorage.setItem("strix_asset_meta", JSON.stringify(updated));
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [scansRes, vulnsRes] = await Promise.all([
          fetch("/api/scans"),
          fetch("/api/vulnerabilities")
        ]);

        if (scansRes.ok) {
          const scansData = await scansRes.json();
          setScans(scansData.scans ?? (Array.isArray(scansData) ? scansData : []));
        }

        if (vulnsRes.ok) {
          const vulnsData = await vulnsRes.json();
          setVulns(Array.isArray(vulnsData) ? vulnsData : []);
        }
      } catch (e) {
        console.error("Failed to load asset data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Aggregate assets across scans and vulnerabilities
  const assets: TargetAsset[] = useMemo(() => {
    const targetMap: Record<string, {
      scans: Scan[];
      vulns: Vulnerability[];
      endpoints: Set<string>;
    }> = {};

    // Populate from scans
    scans.forEach(s => {
      const t = s.target?.trim();
      if (!t) return;
      if (!targetMap[t]) {
        targetMap[t] = { scans: [], vulns: [], endpoints: new Set() };
      }
      targetMap[t].scans.push(s);
    });

    // Populate from vulnerabilities
    vulns.forEach(v => {
      const t = (v.scan?.target || v.scanTarget)?.trim();
      if (!t) return;
      if (!targetMap[t]) {
        targetMap[t] = { scans: [], vulns: [], endpoints: new Set() };
      }
      targetMap[t].vulns.push(v);
      if (v.endpoint) targetMap[t].endpoints.add(v.endpoint);
    });

    // Include any manually registered assets from assetsMeta that haven't been scanned yet
    Object.keys(assetsMeta).forEach(t => {
      if (!targetMap[t]) {
        targetMap[t] = { scans: [], vulns: [], endpoints: new Set() };
      }
    });

    return Object.entries(targetMap).map(([target, data]) => {
      // Sort scans descending by date
      const sortedScans = [...data.scans].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      const lastScan = sortedScans[0];

      const vulnCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informative: 0,
        total: data.vulns.length
      };

      data.vulns.forEach(v => {
        const s = v.severity.toLowerCase();
        if (s === "critical") vulnCounts.critical++;
        else if (s === "high") vulnCounts.high++;
        else if (s === "medium") vulnCounts.medium++;
        else if (s === "low") vulnCounts.low++;
        else vulnCounts.informative++;
      });

      const meta = assetsMeta[target] || { inScope: true, environment: "Production" };
      const riskScore = computeRiskScore(vulnCounts);

      return {
        target,
        scansCount: data.scans.length,
        lastScanned: lastScan ? lastScan.startedAt : (meta.addedAt || ""),
        latestStatus: lastScan ? lastScan.status : "unscanned",
        vulnCounts,
        uniqueEndpoints: Math.max(data.endpoints.size, data.vulns.length),
        riskScore,
        meta
      };
    }).sort((a, b) => a.riskScore - b.riskScore); // most risky first
  }, [scans, vulns, assetsMeta]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (search && !a.target.toLowerCase().includes(search.toLowerCase())) return false;
      if (envFilter !== "all" && (a.meta.environment || "Production") !== envFilter) return false;
      if (scopeFilter === "in" && a.meta.inScope === false) return false;
      if (scopeFilter === "out" && a.meta.inScope !== false) return false;
      return true;
    });
  }, [assets, search, envFilter, scopeFilter]);

  const toggleScope = (target: string) => {
    const cur = assetsMeta[target] || { inScope: true };
    const updated = {
      ...assetsMeta,
      [target]: { ...cur, inScope: cur.inScope === false ? true : false }
    };
    saveMeta(updated);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim()) return;
    const formatted = newTarget.trim();
    const updated = {
      ...assetsMeta,
      [formatted]: {
        environment: newEnv,
        inScope: true,
        notes: newNotes.trim(),
        addedAt: new Date().toISOString()
      }
    };
    saveMeta(updated);
    setNewTarget("");
    setNewNotes("");
    setShowAddModal(false);
  };

  const exportInventory = () => {
    const exportData = filteredAssets.map(a => ({
      target: a.target,
      environment: a.meta.environment || "Production",
      inScope: a.meta.inScope !== false,
      riskScore: a.riskScore,
      scansCount: a.scansCount,
      lastScanned: a.lastScanned,
      criticalVulns: a.vulnCounts.critical,
      highVulns: a.vulnCounts.high,
      mediumVulns: a.vulnCounts.medium,
      lowVulns: a.vulnCounts.low,
      totalFindings: a.vulnCounts.total,
      notes: a.meta.notes || ""
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `strix_asset_inventory_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const highRiskCount = assets.filter(a => a.vulnCounts.critical > 0 || a.vulnCounts.high > 0).length;
  const inScopeCount = assets.filter(a => a.meta.inScope !== false).length;
  const totalEndpoints = assets.reduce((s, a) => s + a.uniqueEndpoints, 0);

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none" }}>
      {/* Header Intro */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="tag" style={{ background: "var(--bg-2)", border: "1px solid var(--border-md)", color: "var(--fg-2)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Attack Surface
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Perimeter Asset Registry</span>
          </div>
          <h1 className="page-heading">Target Asset Inventory & Scope</h1>
          <p className="page-desc">
            Continuous host discovery, perimeter vulnerability metrics, risk scoring, and authorized scope management.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={exportInventory}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            {copiedExport ? <Check size={14} /> : <FileDown size={14} />}
            {copiedExport ? "Exported!" : "Export Inventory"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <Plus size={14} /> Add Target to Scope
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
        {/* Monitored Assets */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Monitored Assets</span>
            <Globe size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value">{assets.length}</div>
          <div className="stat-sub">{inScopeCount} targets currently in-scope</div>
        </div>

        {/* High-Risk Targets */}
        <div className="stat-card" style={{ borderLeft: highRiskCount > 0 ? "3px solid var(--sev-critical)" : undefined }}>
          <div className="stat-label">
            <span className="stat-label-text">High-Risk Targets</span>
            <ShieldAlert size={14} className="stat-label-icon" style={{ color: "var(--sev-critical)" }} />
          </div>
          <div className={`stat-value ${highRiskCount > 0 ? "danger" : ""}`}>
            {highRiskCount}
          </div>
          <div className="stat-sub">Contain critical or high severity vulnerabilities</div>
        </div>

        {/* Total Attack Surface */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Attack Surface</span>
            <Layers size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value">{totalEndpoints}</div>
          <div className="stat-sub">Mapped endpoints across all targets</div>
        </div>

        {/* Total Scans Executed */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Historical Scans</span>
            <Activity size={14} className="stat-label-icon" />
          </div>
          <div className="stat-value">{scans.length}</div>
          <div className="stat-sub">Automated AI pentests run to date</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        background: "var(--bg-1)",
        padding: "10px 14px",
        borderRadius: "var(--r)",
        border: "1px solid var(--border)",
        marginBottom: 16,
        flexWrap: "wrap"
      }}>
        <div className="search-input-wrap" style={{ flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={13} className="search-input-icon" />
          <input
            className="search-input"
            placeholder="Search assets by domain, URL or IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Environment Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>ENV:</span>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              color: "var(--fg)",
              fontSize: 12,
            }}
          >
            <option value="all">All Environments</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
            <option value="Cloud">Cloud</option>
          </select>
        </div>

        {/* Scope Filter */}
        <div style={{ display: "flex", background: "var(--bg-2)", padding: 2, borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setScopeFilter("all")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              background: scopeFilter === "all" ? "var(--bg-4)" : "transparent",
              color: scopeFilter === "all" ? "var(--fg)" : "var(--fg-3)"
            }}
          >
            All Scope
          </button>
          <button
            onClick={() => setScopeFilter("in")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              background: scopeFilter === "in" ? "var(--bg-4)" : "transparent",
              color: scopeFilter === "in" ? "var(--fg)" : "var(--fg-3)"
            }}
          >
            In-Scope ({inScopeCount})
          </button>
          <button
            onClick={() => setScopeFilter("out")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              background: scopeFilter === "out" ? "var(--bg-4)" : "transparent",
              color: scopeFilter === "out" ? "var(--fg)" : "var(--fg-3)"
            }}
          >
            Out-of-Scope ({assets.length - inScopeCount})
          </button>
        </div>
      </div>

      {/* Assets Grid Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", flex: 1, minHeight: 400, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div className="empty-state">
              <Loader2 size={24} className="spin" />
              <p>Indexing attack surface & targets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="empty-state">
              <Globe size={36} style={{ opacity: 0.2 }} />
              <p>No target assets match the current filter.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Header row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2.4fr 1.1fr 1.2fr 1.8fr 1.1fr 1.4fr",
                padding: "10px 16px",
                background: "var(--bg-2)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                <div>Target Asset</div>
                <div>Environment</div>
                <div>Scope Status</div>
                <div>Vulnerabilities</div>
                <div>Risk Posture</div>
                <div style={{ textAlign: "right" }}>Actions</div>
              </div>

              {/* Asset Rows */}
              {filteredAssets.map((asset) => {
                const isInScope = asset.meta.inScope !== false;
                const riskColor = asset.riskScore >= 80 ? "var(--sev-low)" : asset.riskScore >= 50 ? "var(--sev-medium)" : "var(--sev-critical)";

                return (
                  <div
                    key={asset.target}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.4fr 1.1fr 1.2fr 1.8fr 1.1fr 1.4fr",
                      padding: "14px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      alignItems: "center",
                      transition: "background 0.15s",
                      fontSize: 12.5
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Target Asset */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Server size={14} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "var(--fg)", wordBreak: "break-all" }}>
                          {asset.target}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 22, marginTop: 2 }}>
                        Last scan: {timeAgo(asset.lastScanned)} · {asset.scansCount} scans run
                      </div>
                    </div>

                    {/* Environment */}
                    <div>
                      <span style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border)",
                        color: "var(--fg-2)"
                      }}>
                        {asset.meta.environment || "Production"}
                      </span>
                    </div>

                    {/* Scope Status Toggle */}
                    <div>
                      <button
                        onClick={() => toggleScope(asset.target)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 12,
                          cursor: "pointer",
                          border: `1px solid ${isInScope ? "var(--sev-low-bd)" : "rgba(255,255,255,0.1)"}`,
                          background: isInScope ? "var(--sev-low-bg)" : "rgba(255,255,255,0.04)",
                          color: isInScope ? "var(--sev-low)" : "var(--fg-3)",
                          transition: "all 0.15s"
                        }}
                        title="Click to toggle In-Scope / Out-of-Scope"
                      >
                        {isInScope ? <ShieldCheck size={12} /> : <X size={12} />}
                        {isInScope ? "IN SCOPE" : "OUT OF SCOPE"}
                      </button>
                    </div>

                    {/* Vulnerabilities Breakdown */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {asset.vulnCounts.total === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--sev-low)", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={12} /> No findings
                        </span>
                      ) : (
                        <>
                          {asset.vulnCounts.critical > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--sev-critical-bg)", color: "var(--sev-critical)", border: "1px solid var(--sev-critical-bd)" }}>
                              {asset.vulnCounts.critical} Crit
                            </span>
                          )}
                          {asset.vulnCounts.high > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--sev-high-bg)", color: "var(--sev-high)", border: "1px solid var(--sev-high-bd)" }}>
                              {asset.vulnCounts.high} High
                            </span>
                          )}
                          {asset.vulnCounts.medium > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--sev-medium-bg)", color: "var(--sev-medium)", border: "1px solid var(--sev-medium-bd)" }}>
                              {asset.vulnCounts.medium} Med
                            </span>
                          )}
                          {asset.vulnCounts.low > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--sev-low-bg)", color: "var(--sev-low)", border: "1px solid var(--sev-low-bd)" }}>
                              {asset.vulnCounts.low} Low
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Risk Score */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: `2px solid ${riskColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: riskColor
                        }}>
                          {asset.riskScore}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                          {asset.riskScore >= 80 ? "Healthy" : asset.riskScore >= 50 ? "Caution" : "At Risk"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <Link
                        href={`/scans?new=1&target=${encodeURIComponent(asset.target)}`}
                        className="btn-primary"
                        style={{ padding: "4px 9px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                        title="Launch immediate scan against this target"
                      >
                        <Play size={11} /> Scan
                      </Link>

                      <Link
                        href="/vulnerabilities"
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        title="View all findings"
                      >
                        Vulns
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Target Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: "100%",
            maxWidth: 480,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={18} style={{ color: "var(--sev-critical)" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", margin: 0 }}>
                  Add Target to Scope
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAsset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>
                  Target Domain, IP, or URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://api.target.com or 192.168.1.10"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    color: "var(--fg)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>
                  Environment Tier
                </label>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    color: "var(--fg)",
                    fontSize: 13
                  }}
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                  <option value="Cloud">Cloud Asset</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>
                  Notes / Scope Restrictions
                </label>
                <textarea
                  placeholder="e.g. Authorized under RoE #4829, avoid /admin/nuke endpoint"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    color: "var(--fg)",
                    fontSize: 12.5,
                    resize: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} /> Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

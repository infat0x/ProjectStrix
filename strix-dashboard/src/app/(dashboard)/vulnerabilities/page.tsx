"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Search, Info, Terminal, Lightbulb, X, Loader2, Settings2, Copy, Check, LayoutList, Columns } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface Vulnerability {
  id: string;
  vulnId?: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informative" | "info";
  endpoint: string;
  method?: string;
  description: string;
  poc?: string;
  poc_description?: string;
  poc_script_code?: string;
  cvss?: number;
  remediation?: string;
  status?: "OPEN" | "CONFIRMED" | "RESOLVED" | "FALSE_POSITIVE";
}

interface Scan {
  id: string;
  target: string;
  status: string;
  vulnerabilities: Vulnerability[];
}

interface VulnWithScan extends Vulnerability {
  scanId: string;
  scanTarget: string;
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, informative: 4, info: 4 };
const SEVERITIES = ["all", "critical", "high", "medium", "low", "informative"] as const;
const STATUS_OPTIONS = ["ALL", "OPEN", "CONFIRMED", "RESOLVED", "FALSE_POSITIVE"] as const;

export const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  OPEN: { bg: "rgba(210, 153, 34, 0.10)", color: "#d29922", border: "rgba(210, 153, 34, 0.22)", label: "Open" },
  CONFIRMED: { bg: "rgba(248, 81, 73, 0.10)", color: "#f85149", border: "rgba(248, 81, 73, 0.22)", label: "Confirmed" },
  RESOLVED: { bg: "rgba(63, 185, 80, 0.10)", color: "#3fb950", border: "rgba(63, 185, 80, 0.22)", label: "Resolved" },
  FALSE_POSITIVE: { bg: "rgba(139, 148, 158, 0.10)", color: "#8b949e", border: "rgba(139, 148, 158, 0.20)", label: "False Positive" },
};

function sevClass(s: string) {
  const normalized = s.toLowerCase() === "info" ? "informative" : s.toLowerCase();
  return `sev sev-${normalized}`;
}

export default function VulnerabilitiesPage() {
  const [allVulns, setAllVulns] = useState<VulnWithScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [filter, setFilter] = useState<(typeof SEVERITIES)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<VulnWithScan | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const { confirm, alert } = useDialog();

  const projects = Array.from(new Set(allVulns.map(v => v.scanTarget)));

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/vulnerabilities");
      const data = await res.json();
      
      const vulns = (Array.isArray(data) ? data : []).map((v: any) => ({
        ...v,
        scanTarget: v.scan?.target || "Unknown Target"
      }));

      vulns.sort((a, b) => (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 5) - (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 5));
      setAllVulns(vulns);
    } catch (e) {
      console.error("Failed to fetch vulnerabilities", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    
    confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected vulnerability(s)?`, async () => {
      setDeletingBulk(true);
      try {
        const items = Array.from(selectedIds).map(uniqueKey => {
          const [scanId, vulnId] = uniqueKey.split("::");
          return { scanId, vulnId, id: vulnId };
        });

        await fetch("/api/vulnerabilities/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items })
        });
        setSelectedIds(new Set());
        setSelectionMode(false);
        setSelected(null);
        fetchAll();
      } catch (e: any) {
        alert(e.message || "Bulk delete failed");
      } finally {
        setDeletingBulk(false);
      }
    });
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  async function handleUpdateStatus(vulnId: string, newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${vulnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAllVulns((prev) =>
          prev.map((v) => (v.id === vulnId ? { ...v, status: newStatus as any } : v))
        );
        if (selected && selected.id === vulnId) {
          setSelected((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update status");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function copyBugBountyReport(v: VulnWithScan) {
    const report = `## Vulnerability Title:
${v.title}

## Target / Asset:
${v.scanTarget}

## Severity & CVSS:
- **Severity:** ${v.severity.toUpperCase()}${v.cvss ? ` (CVSS ${v.cvss})` : ""}
- **Endpoint:** \`${v.method || "GET"} ${v.endpoint}\`
- **Status:** ${v.status || "OPEN"}

## Summary / Description:
${v.description}

## Steps to Reproduce / Proof of Concept:
${v.poc_description ? `${v.poc_description}\n\n` : ""}${v.poc_script_code ? `\`\`\`bash\n${v.poc_script_code}\n\`\`\`\n\n` : ""}${v.poc && !v.poc_script_code ? `\`\`\`text\n${v.poc}\n\`\`\`\n\n` : ""}

## Impact:
An attacker exploiting this flaw at \`${v.endpoint}\` can compromise integrity and confidentiality of the targeted system.

## Remediation:
${v.remediation || "Enforce strict input validation, authorization checks, and defense-in-depth sanitization."}
`;

    navigator.clipboard.writeText(report.trim());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  }

  const filtered = allVulns.filter((v) => {
    if (filter !== "all" && v.severity !== filter) return false;
    if (statusFilter !== "ALL" && (v.status || "OPEN").toUpperCase() !== statusFilter) return false;
    if (filterProject !== "all" && v.scanTarget !== filterProject) return false;
    if (
      search &&
      !v.title.toLowerCase().includes(search.toLowerCase()) &&
      !v.endpoint.toLowerCase().includes(search.toLowerCase()) &&
      !v.scanTarget.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const counts = {
    all: allVulns.length,
    critical: allVulns.filter((v) => v.severity === "critical").length,
    high: allVulns.filter((v) => v.severity === "high").length,
    medium: allVulns.filter((v) => v.severity === "medium").length,
    low: allVulns.filter((v) => v.severity === "low").length,
    informative: allVulns.filter((v) => v.severity === "informative" || v.severity === "info").length,
  };

  function renderDetailContent(item: VulnWithScan) {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            background: `var(--sev-${item.severity}-bg)`,
            borderBottom: `1px solid var(--sev-${item.severity}-bd)`,
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className={sevClass(item.severity)}>{item.severity}</span>
            {item.cvss && (
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                CVSS {item.cvss}
              </span>
            )}

            {/* Status Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Status:</span>
              <select
                value={(item.status || "OPEN").toUpperCase()}
                onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                disabled={updatingStatus}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg-1)",
                  color: (STATUS_CONFIG[(item.status || "OPEN").toUpperCase()] || STATUS_CONFIG.OPEN).color,
                  border: `1px solid ${(STATUS_CONFIG[(item.status || "OPEN").toUpperCase()] || STATUS_CONFIG.OPEN).border}`,
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="OPEN">Open</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_POSITIVE">False Positive</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => copyBugBountyReport(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: copiedReport ? "var(--sev-low)" : "var(--fg)",
                padding: "4px 10px",
                borderRadius: "var(--r-sm)",
                fontSize: 11.5,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Export formatted disclosure report for HackerOne or Bugcrowd"
            >
              {copiedReport ? <Check size={13} /> : <Copy size={13} />}
              {copiedReport ? "Copied Report!" : "Copy for Bug Bounty (H1)"}
            </button>

            <button
              onClick={() => setSelected(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--fg-3)",
                cursor: "pointer",
                display: "flex",
                padding: 4,
                borderRadius: "var(--r-sm)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Detail body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 16, lineHeight: 1.4 }}>
            {item.title}
          </h2>

          {/* Meta */}
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--fg-3)", width: 64 }}>Target</span>
              <a href={`/scans/${item.scanId}`} style={{ color: "var(--fg)", fontWeight: 500, textDecoration: "underline", textDecorationColor: "var(--border-hi)" }}>{item.scanTarget}</a>
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 12, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-sans)", width: 64 }}>Endpoint</span>
              <span style={{ color: "var(--fg-2)" }}>
                <span style={{ fontWeight: 700, color: "var(--fg)", marginRight: 6 }}>{item.method ?? "GET"}</span>
                {item.endpoint}
              </span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              <Info size={12} /> Description
            </div>
            <MarkdownRenderer content={item.description} />
          </div>

          {/* PoC */}
          {(item.poc || item.poc_description || item.poc_script_code) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                <Terminal size={12} /> Proof of Concept
              </div>
              
              {item.poc_description && (
                <MarkdownRenderer content={item.poc_description} />
              )}
              {item.poc_script_code && (
                <MarkdownRenderer content={item.poc_script_code} />
              )}
              {item.poc && !item.poc_script_code && (
                <MarkdownRenderer content={item.poc.includes("```") ? item.poc : `\`\`\`text\n${item.poc}\n\`\`\``} />
              )}
            </div>
          )}

          {/* Remediation */}
          {item.remediation && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                <Lightbulb size={12} /> Remediation
              </div>
              <MarkdownRenderer content={item.remediation} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none" }}>
      {/* Header */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-heading">Vulnerabilities</h1>
          <p className="page-desc">All findings across your security assessments.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* View Toggle */}
          <div style={{ display: "flex", background: "var(--bg-2)", padding: 2, borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: "var(--r-sm)",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: viewMode === "table" ? "var(--bg-4)" : "transparent",
                color: viewMode === "table" ? "var(--fg)" : "var(--fg-3)",
                transition: "all 0.15s"
              }}
            >
              <LayoutList size={13} /> Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: "var(--r-sm)",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: viewMode === "kanban" ? "var(--bg-4)" : "transparent",
                color: viewMode === "kanban" ? "var(--fg)" : "var(--fg-3)",
                transition: "all 0.15s"
              }}
            >
              <Columns size={13} /> Kanban
            </button>
          </div>

          {selectionMode && (
            <button 
              className="btn-primary" 
              style={{ background: selectedIds.size > 0 ? "var(--sev-critical-bg)" : "var(--bg-3)", color: selectedIds.size > 0 ? "var(--sev-critical)" : "var(--fg-3)", border: selectedIds.size > 0 ? "1px solid var(--sev-critical-bd)" : "1px solid var(--border)", pointerEvents: selectedIds.size > 0 ? "auto" : "none" }} 
              onClick={handleBulkDelete}
              disabled={deletingBulk}
            >
              {deletingBulk ? <Loader2 size={14} className="spin" /> : <ShieldAlert size={14} />} Delete Selected ({selectedIds.size})
            </button>
          )}
          {viewMode === "table" && (
            <button className="btn-secondary" onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}>
              {selectionMode ? "Cancel" : "Choose Vulnerabilities"}
            </button>
          )}
        </div>
      </div>

      {/* Severity stat cards */}
      <div className="stats-grid">
        {(["critical", "high", "medium", "low", "informative"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className="stat-card"
            style={{
              cursor: "pointer",
              border: filter === s ? "1px solid var(--border-hi)" : undefined,
              background: filter === s ? "var(--bg-2)" : undefined,
              textAlign: "left",
            }}
          >
            <div className="stat-label">
              <span className="stat-label-text">{s}</span>
              <span className={sevClass(s)} style={{ fontSize: 10 }}>{counts[s]}</span>
            </div>
            <div
              className="stat-value"
              style={{
                color:
                  s === "critical" ? "var(--sev-critical)" :
                  s === "high"     ? "var(--sev-high)" :
                  s === "medium"   ? "var(--sev-medium)" :
                  s === "low"      ? "var(--sev-low)" :
                  "var(--sev-informative)",
              }}
            >
              {counts[s]}
            </div>
            <div className="stat-sub">{s.charAt(0).toUpperCase() + s.slice(1)} severity</div>
          </button>
        ))}
      </div>

      {/* VIEW: TABLE MODE */}
      {viewMode === "table" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* List */}
          <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Filters */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="search-input-wrap" style={{ flex: 1, maxWidth: "100%" }}>
                  <Search size={13} className="search-input-icon" />
                  <input
                    className="search-input"
                    placeholder="Search by title, endpoint, target…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <button 
                    className={`btn-secondary ${showFilters ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: "0 12px", background: showFilters || filterProject !== "all" ? "var(--bg-3)" : "transparent", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--fg-2)", cursor: "pointer" }}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Settings2 size={14} /> Filters
                    {filterProject !== "all" && (
                      <span style={{ width: 6, height: 6, background: "var(--fg)", borderRadius: "50%" }} />
                    )}
                  </button>
                  
                  {showFilters && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowFilters(false)} />
                      <div className="glass-panel animate-fade-in" style={{ position: "absolute", top: "110%", right: 0, width: 260, zIndex: 100, padding: 16, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>Target Project</label>
                          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13 }}>
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        {filterProject !== "all" && (
                          <button 
                            onClick={() => setFilterProject("all")}
                            style={{ background: "none", border: "none", color: "var(--fg-3)", fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "var(--r-sm)",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: filter === s ? "var(--border-hi)" : "var(--border)",
                      background: filter === s ? "var(--bg-4)" : "var(--bg-2)",
                      color: filter === s ? "var(--fg)" : "var(--fg-3)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {s} ({counts[s as keyof typeof counts] ?? counts.all})
                  </button>
                ))}
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {STATUS_OPTIONS.map((st) => {
                  const conf = STATUS_CONFIG[st] || { color: "var(--fg-2)", label: st === "ALL" ? "All Statuses" : st };
                  const count = st === "ALL" ? allVulns.length : allVulns.filter(v => (v.status || "OPEN").toUpperCase() === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--r-sm)",
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: statusFilter === st ? (conf.border || "var(--border-hi)") : "var(--border)",
                        background: statusFilter === st ? (conf.bg || "var(--bg-3)") : "transparent",
                        color: statusFilter === st ? (conf.color || "var(--fg)") : "var(--fg-3)",
                        transition: "all 0.15s",
                      }}
                    >
                      {conf.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div className="empty-state">
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <ShieldAlert size={32} style={{ opacity: 0.2 }} />
                  <p>No vulnerabilities found</p>
                </div>
              ) : (
                <>
                  {selectionMode && (
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-2)", fontSize: 12, fontWeight: 600, color: "var(--fg-3)" }}>
                      <input 
                        type="checkbox" 
                        style={{ accentColor: "var(--fg)", marginRight: 12 }}
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filtered.map(v => `${v.scanId}::${v.id}`)));
                          else setSelectedIds(new Set());
                        }}
                      />
                      Select All ({filtered.length})
                    </div>
                  )}
                  {filtered.map((v) => {
                    const uniqueId = `${v.scanId}::${v.id}`;
                    const isSelected = selectedIds.has(uniqueId) || (selected?.id === v.id && selected.scanId === v.scanId);
                    const curStatus = (v.status || "OPEN").toUpperCase();
                    const sConf = STATUS_CONFIG[curStatus] || STATUS_CONFIG.OPEN;

                    return (
                    <div
                      key={uniqueId}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleSelection(uniqueId);
                        } else {
                          setSelected(isSelected && !selectedIds.has(uniqueId) ? null : v);
                        }
                      }}
                      className="trow"
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "var(--bg-3)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--bg-2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {selectionMode && (
                        <div style={{ display: "flex", alignItems: "center", marginRight: 12 }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            style={{ accentColor: "var(--fg)" }}
                            checked={selectedIds.has(uniqueId)}
                            onChange={() => toggleSelection(uniqueId)}
                          />
                        </div>
                      )}
                      <div className="trow-main">
                      <div className="trow-title">{v.title}</div>
                      <div className="trow-sub">
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          {v.method ?? "GET"} {v.endpoint}
                        </span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "var(--fg-3)" }}>
                        {v.scanTarget}
                      </div>
                    </div>
                    <div className="trow-right" style={{ flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: sConf.bg,
                            color: sConf.color,
                            border: `1px solid ${sConf.border}`,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {sConf.label}
                        </span>
                        <span className={sevClass(v.severity)}>{v.severity}</span>
                      </div>
                      {v.cvss && (
                        <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                          CVSS {v.cvss}
                        </span>
                      )}
                    </div>
                    </div>
                  );
                  })}
                </>
              )}
              </div>
            </div>

          {/* Detail pane */}
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: selected ? 1 : 0.4,
              transition: "opacity 0.2s",
              pointerEvents: selected ? "auto" : "none",
            }}
          >
            {selected ? (
              renderDetailContent(selected)
            ) : (
              <div className="empty-state">
                <ShieldAlert size={36} style={{ opacity: 0.12 }} />
                <p style={{ maxWidth: 200, textAlign: "center" }}>
                  Select a vulnerability to view details
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW: KANBAN MODE */
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
          {/* Kanban Toolbar */}
          <div style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "var(--bg-1)",
            padding: "10px 14px",
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
            flexWrap: "wrap"
          }}>
            <div className="search-input-wrap" style={{ flex: "1 1 240px", maxWidth: 360 }}>
              <Search size={13} className="search-input-icon" />
              <input
                className="search-input"
                placeholder="Search findings, endpoints, targets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>TARGET:</span>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                style={{
                  padding: "5px 10px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  color: "var(--fg)",
                  fontSize: 12,
                }}
              >
                <option value="all">All Targets ({allVulns.length})</option>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: "auto" }}>
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: filter === s ? "var(--border-hi)" : "var(--border)",
                    background: filter === s ? "var(--bg-4)" : "var(--bg-2)",
                    color: filter === s ? "var(--fg)" : "var(--fg-3)",
                  }}
                >
                  {s} ({counts[s as keyof typeof counts] ?? counts.all})
                </button>
              ))}
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(270px, 1fr))",
            gap: 14,
            flex: 1,
            overflowX: "auto",
            paddingBottom: 4
          }}>
            {(["OPEN", "CONFIRMED", "RESOLVED", "FALSE_POSITIVE"] as const).map((colStatus) => {
              const colConf = STATUS_CONFIG[colStatus];
              const colItems = filtered.filter(v => (v.status || "OPEN").toUpperCase() === colStatus);

              return (
                <div
                  key={colStatus}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    background: "var(--bg-1)",
                    border: `1px solid ${colConf.border}`,
                    borderRadius: "var(--r)",
                    overflow: "hidden",
                    minHeight: 480
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: colConf.bg,
                    borderBottom: `1px solid ${colConf.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colConf.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: colConf.color, letterSpacing: "0.5px" }}>
                        {colConf.label.toUpperCase()}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.35)",
                      color: colConf.color,
                      border: `1px solid ${colConf.border}`
                    }}>
                      {colItems.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}>
                    {colItems.length === 0 ? (
                      <div style={{
                        textAlign: "center",
                        padding: "36px 14px",
                        color: "var(--fg-3)",
                        fontSize: 11.5,
                        border: "1px dashed var(--border)",
                        borderRadius: "var(--r-sm)",
                        margin: "12px 0"
                      }}>
                        No {colConf.label.toLowerCase()} findings
                      </div>
                    ) : (
                      colItems.map((v) => {
                        const isCardActive = selected?.id === v.id;
                        return (
                          <div
                            key={`${v.scanId}::${v.id}`}
                            onClick={() => setSelected(v)}
                            style={{
                              background: isCardActive ? "var(--bg-3)" : "var(--bg-2)",
                              border: `1px solid ${isCardActive ? "var(--border-hi)" : "var(--border)"}`,
                              borderRadius: "var(--r-sm)",
                              padding: "12px",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (!isCardActive) e.currentTarget.style.borderColor = "var(--border-hi)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isCardActive) e.currentTarget.style.borderColor = "var(--border)";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                              <span className={sevClass(v.severity)} style={{ fontSize: 10, padding: "1px 6px" }}>
                                {v.severity}
                              </span>
                              {v.cvss ? (
                                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-3)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 4 }}>
                                  CVSS {v.cvss}
                                </span>
                              ) : null}
                            </div>

                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", lineHeight: 1.35 }}>
                              {v.title}
                            </div>

                            <div style={{
                              fontSize: 10.5,
                              fontFamily: "var(--font-mono)",
                              color: "var(--fg-2)",
                              background: "rgba(0,0,0,0.25)",
                              padding: "3px 6px",
                              borderRadius: 4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {v.method || "GET"} {v.endpoint}
                            </div>

                            <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
                              Target: <span style={{ color: "var(--fg-2)" }}>{v.scanTarget}</span>
                            </div>

                            {/* Quick Status Transition */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingTop: 6,
                                borderTop: "1px solid rgba(255,255,255,0.06)",
                                marginTop: 2
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 600 }}>MOVE TO:</span>
                              <select
                                value={(v.status || "OPEN").toUpperCase()}
                                onChange={(e) => handleUpdateStatus(v.id, e.target.value)}
                                disabled={updatingStatus}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  borderRadius: "var(--r-sm)",
                                  background: "var(--bg-1)",
                                  color: (STATUS_CONFIG[(v.status || "OPEN").toUpperCase()] || STATUS_CONFIG.OPEN).color,
                                  border: `1px solid ${(STATUS_CONFIG[(v.status || "OPEN").toUpperCase()] || STATUS_CONFIG.OPEN).border}`,
                                  cursor: "pointer",
                                  outline: "none"
                                }}
                              >
                                <option value="OPEN">Open</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="FALSE_POSITIVE">False Positive</option>
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kanban Slide-Over Drawer for Details */}
          {selected && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(4px)",
                  zIndex: 119
                }}
                onClick={() => setSelected(null)}
              />
              <div
                className="card"
                style={{
                  position: "fixed",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "min(720px, 92vw)",
                  zIndex: 120,
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  borderRadius: 0,
                  borderLeft: "1px solid var(--border-hi)",
                  boxShadow: "-12px 0 45px rgba(0,0,0,0.6)",
                  animation: "slideInRight 0.2s ease"
                }}
              >
                {renderDetailContent(selected)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

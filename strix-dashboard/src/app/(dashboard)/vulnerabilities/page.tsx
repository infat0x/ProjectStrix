"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Search, Info, Terminal, Lightbulb, X, Loader2, Settings2, Copy, Check } from "lucide-react";
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

function sevClass(s: string) {
  const normalized = s.toLowerCase() === "info" ? "informative" : s.toLowerCase();
  return `sev sev-${normalized}`;
}

export default function VulnerabilitiesPage() {
  const [allVulns, setAllVulns] = useState<VulnWithScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof SEVERITIES)[number]>("all");
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<VulnWithScan | null>(null);

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

  const filtered = allVulns.filter((v) => {
    if (filter !== "all" && v.severity !== filter) return false;
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

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none" }}>
      {/* Header */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-heading">Vulnerabilities</h1>
          <p className="page-desc">All findings across your security assessments.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
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
          <button className="btn-secondary" onClick={() => {
            setSelectionMode(!selectionMode);
            setSelectedIds(new Set());
          }}>
            {selectionMode ? "Cancel" : "Choose Vulnerabilities"}
          </button>
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

      {/* Main content */}
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
                      background: isSelected ? "var(--bg-3)" : `var(--sev-${v.severity.toLowerCase() === "info" ? "informative" : v.severity.toLowerCase()}-bg)`,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                      borderLeft: `2px solid var(--sev-${v.severity.toLowerCase() === "info" ? "informative" : v.severity.toLowerCase()})`,
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--bg-3)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = `var(--sev-${v.severity.toLowerCase() === "info" ? "informative" : v.severity.toLowerCase()}-bg)`;
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
                    <span className={sevClass(v.severity)}>{v.severity}</span>
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
            <>
              {/* Detail header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: `var(--sev-${selected.severity}-bg)`,
                  borderBottom: `1px solid var(--sev-${selected.severity}-bd)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={sevClass(selected.severity)}>{selected.severity}</span>
                  {selected.cvss && (
                    <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                      CVSS {selected.cvss}
                    </span>
                  )}
                </div>
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

              {/* Detail body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 16, lineHeight: 1.4 }}>
                  {selected.title}
                </h2>

                {/* Meta */}
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--fg-3)", width: 64 }}>Target</span>
                    <a href={`/scans/${selected.scanId}`} style={{ color: "var(--fg)", fontWeight: 500, textDecoration: "underline", textDecorationColor: "var(--border-hi)" }}>{selected.scanTarget}</a>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-sans)", width: 64 }}>Endpoint</span>
                    <span style={{ color: "var(--fg-2)" }}>
                      <span style={{ fontWeight: 700, color: "var(--fg)", marginRight: 6 }}>{selected.method ?? "GET"}</span>
                      {selected.endpoint}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                    <Info size={12} /> Description
                  </div>
                  <MarkdownRenderer content={selected.description} />
                </div>

                {/* PoC */}
                {(selected.poc || selected.poc_description || selected.poc_script_code) && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      <Terminal size={12} /> Proof of Concept
                    </div>
                    
                    {selected.poc_description && (
                      <MarkdownRenderer content={selected.poc_description} />
                    )}
                    {selected.poc_script_code && (
                      <MarkdownRenderer content={selected.poc_script_code} />
                    )}
                    {selected.poc && !selected.poc_script_code && (
                      <MarkdownRenderer content={selected.poc.includes("```") ? selected.poc : `\`\`\`text\n${selected.poc}\n\`\`\``} />
                    )}
                  </div>
                )}

                {/* Remediation */}
                {selected.remediation && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      <Lightbulb size={12} /> Remediation
                    </div>
                      <MarkdownRenderer content={selected.remediation} />
                  </div>
                )}
              </div>
            </>
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
    </div>
  );
}

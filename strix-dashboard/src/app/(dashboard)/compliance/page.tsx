"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  ChevronRight,
  Filter,
  Check,
  Award,
  Loader2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  vulnId?: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informative" | "info";
  endpoint: string;
  method?: string;
  description: string;
  cvss?: number;
  cwe?: string;
  status?: string;
  scanId: string;
  scan?: {
    target: string;
  };
}

interface OWASPCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  cweList: string[];
  nistMapping: string;
  pciMapping: string;
  keywords: string[];
}

const OWASP_TOP_10: OWASPCategory[] = [
  {
    id: "A01",
    code: "A01:2021",
    name: "Broken Access Control",
    description: "Failures that allow unauthorized users to view, create, modify, or delete sensitive data or functions.",
    cweList: ["CWE-200", "CWE-284", "CWE-285", "CWE-639", "CWE-862"],
    nistMapping: "AC-3, AC-6 (Access Enforcement & Least Privilege)",
    pciMapping: "Req 6.5.8, 7.1 (Access Controls)",
    keywords: ["idor", "access control", "authorization", "privilege", "bypass", "cors", "bola", "role", "permission"]
  },
  {
    id: "A02",
    code: "A02:2021",
    name: "Cryptographic Failures",
    description: "Weak or missing cryptography leading to exposure of sensitive data in transit or at rest.",
    cweList: ["CWE-259", "CWE-311", "CWE-326", "CWE-327", "CWE-330"],
    nistMapping: "SC-8, SC-13, SC-28 (Cryptographic Protection)",
    pciMapping: "Req 3.4, 4.1 (Cardholder Data Encryption)",
    keywords: ["crypto", "cipher", "tls", "ssl", "cleartext", "plaintext", "md5", "sha1", "weak key", "salt"]
  },
  {
    id: "A03",
    code: "A03:2021",
    name: "Injection",
    description: "Hostile data sent to an interpreter as part of a command or query (SQL, NoSQL, OS command, LDAP, XSS).",
    cweList: ["CWE-78", "CWE-79", "CWE-89", "CWE-94", "CWE-116"],
    nistMapping: "SI-10 (Information Input Validation)",
    pciMapping: "Req 6.5.1, 6.5.7 (Injection & XSS Flaws)",
    keywords: ["sql", "sqli", "injection", "xss", "cross-site script", "command", "rce", "template", "ssti", "eval"]
  },
  {
    id: "A04",
    code: "A04:2021",
    name: "Insecure Design",
    description: "Risks related to design and architectural flaws, missing threat modeling, or business logic bypasses.",
    cweList: ["CWE-209", "CWE-256", "CWE-501", "CWE-522"],
    nistMapping: "SA-8 (Security and Privacy Engineering Principles)",
    pciMapping: "Req 6.1 (Secure Systems Architecture)",
    keywords: ["logic", "rate limit", "workflow", "race condition", "brute force", "design", "business logic"]
  },
  {
    id: "A05",
    code: "A05:2021",
    name: "Security Misconfiguration",
    description: "Unpatched flaws, default configurations, open cloud storage, misconfigured HTTP headers, verbose error messages.",
    cweList: ["CWE-16", "CWE-200", "CWE-209", "CWE-1004"],
    nistMapping: "CM-6, CM-7 (Configuration Settings & Least Functionality)",
    pciMapping: "Req 2.1, 2.2 (System Hardening & Defaults)",
    keywords: ["misconfiguration", "config", "debug", "header", "directory listing", "default", "stack trace", "exposure", "cors"]
  },
  {
    id: "A06",
    code: "A06:2021",
    name: "Vulnerable & Outdated Components",
    description: "Using client or server components, libraries, and frameworks with known security vulnerabilities.",
    cweList: ["CWE-937", "CWE-1035", "CWE-1104"],
    nistMapping: "SI-2 (Flaw Remediation & Patch Management)",
    pciMapping: "Req 6.2 (Vendor Security Patches)",
    keywords: ["cve-", "outdated", "deprecated", "vulnerable version", "unsupported", "component", "library"]
  },
  {
    id: "A07",
    code: "A07:2021",
    name: "Identification & Authentication Failures",
    description: "Flaws in session management, credential stuffing, weak passwords, or lack of multi-factor authentication.",
    cweList: ["CWE-287", "CWE-297", "CWE-384", "CWE-613"],
    nistMapping: "IA-2, IA-5 (Identification and Authentication)",
    pciMapping: "Req 8.2, 8.3 (Authentication & Session Management)",
    keywords: ["auth", "jwt", "session", "token", "login", "credential", "password", "fixation", "logout"]
  },
  {
    id: "A08",
    code: "A08:2021",
    name: "Software & Data Integrity Failures",
    description: "Code and infrastructure that does not protect against integrity violations (insecure deserialization, untrusted CDNs).",
    cweList: ["CWE-494", "CWE-502", "CWE-829"],
    nistMapping: "SI-7 (Software, Firmware, and Information Integrity)",
    pciMapping: "Req 6.4 (Software Integrity & Supply Chain)",
    keywords: ["deserialization", "integrity", "pickle", "untrusted cdn", "signature", "tampering", "pipeline"]
  },
  {
    id: "A09",
    code: "A09:2021",
    name: "Security Logging & Monitoring Failures",
    description: "Insufficient logging, detection, monitoring, and active response allowing attackers to achieve persistence undetected.",
    cweList: ["CWE-778", "CWE-117"],
    nistMapping: "AU-2, AU-6, AU-12 (Audit Events and Review)",
    pciMapping: "Req 10.1, 10.2 (Audit Trails & Logging)",
    keywords: ["log", "logging", "monitoring", "audit", "detection", "alerting", "trail"]
  },
  {
    id: "A10",
    code: "A10:2021",
    name: "Server-Side Request Forgery (SSRF)",
    description: "Flaws occurring when a web app fetches a remote resource without validating the user-supplied URL (e.g. metadata service).",
    cweList: ["CWE-918"],
    nistMapping: "SC-7 (Boundary Protection)",
    pciMapping: "Req 1.2, 1.3 (Network Perimeter Controls)",
    keywords: ["ssrf", "server-side request", "169.254", "metadata", "webhook", "internal url", "dns rebinding"]
  }
];

function matchOWASP(v: Vulnerability): string {
  const text = `${v.title} ${v.description} ${v.cwe || ""} ${v.endpoint}`.toLowerCase();
  
  for (const cat of OWASP_TOP_10) {
    if (cat.cweList.some(c => (v.cwe || "").toLowerCase().includes(c.toLowerCase()))) {
      return cat.id;
    }
    if (cat.keywords.some(k => text.includes(k))) {
      return cat.id;
    }
  }

  if (v.severity === "critical" || v.severity === "high") return "A03";
  return "A05";
}

export default function CompliancePage() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState("all");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [copiedAudit, setCopiedAudit] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/vulnerabilities");
        if (res.ok) {
          const data = await res.json();
          setVulns(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to load vulnerabilities for compliance", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const targets = useMemo(() => {
    const list = new Set<string>();
    vulns.forEach(v => {
      if (v.scan?.target) list.add(v.scan.target);
    });
    return Array.from(list);
  }, [vulns]);

  const filteredVulns = useMemo(() => {
    return vulns.filter(v => {
      if (targetFilter !== "all" && v.scan?.target !== targetFilter) return false;
      if (v.status === "FALSE_POSITIVE" || v.status === "RESOLVED") return false;
      return true;
    });
  }, [vulns, targetFilter]);

  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; critical: number; high: number; medium: number; low: number; items: Vulnerability[] }> = {};
    
    OWASP_TOP_10.forEach(c => {
      map[c.id] = { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] };
    });

    filteredVulns.forEach(v => {
      const catId = matchOWASP(v);
      if (map[catId]) {
        map[catId].total++;
        map[catId].items.push(v);
        const s = v.severity.toLowerCase();
        if (s === "critical") map[catId].critical++;
        else if (s === "high") map[catId].high++;
        else if (s === "medium") map[catId].medium++;
        else map[catId].low++;
      }
    });

    return map;
  }, [filteredVulns]);

  const complianceScore = useMemo(() => {
    let cleanCategories = 0;
    let totalDeduction = 0;

    OWASP_TOP_10.forEach(c => {
      const stat = categoryStats[c.id];
      if (!stat || stat.total === 0) {
        cleanCategories++;
      } else {
        totalDeduction += (stat.critical * 18) + (stat.high * 9) + (stat.medium * 4) + (stat.low * 1);
      }
    });

    const score = Math.max(0, 100 - totalDeduction);
    return {
      score,
      cleanCategories,
      grade: score >= 90 ? "A (Compliant)" : score >= 75 ? "B (Acceptable)" : score >= 50 ? "C (High Risk)" : "F (Non-Compliant)",
      status: score >= 75 ? "PASS" : score >= 50 ? "WARN" : "FAIL"
    };
  }, [categoryStats]);

  function exportAuditReport() {
    const reportData = {
      generatedAt: new Date().toISOString(),
      targetScope: targetFilter === "all" ? "Enterprise Wide (All Targets)" : targetFilter,
      complianceScore: complianceScore.score,
      complianceGrade: complianceScore.grade,
      cleanCategories: `${complianceScore.cleanCategories} / 10 Clean`,
      openFindingsCount: filteredVulns.length,
      owaspBreakdown: OWASP_TOP_10.map(cat => ({
        code: cat.code,
        name: cat.name,
        nist: cat.nistMapping,
        pci: cat.pciMapping,
        status: categoryStats[cat.id]?.total === 0 ? "PASSED" : "NON_COMPLIANT",
        violationsCount: categoryStats[cat.id]?.total || 0,
        critical: categoryStats[cat.id]?.critical || 0,
        high: categoryStats[cat.id]?.high || 0,
        findings: categoryStats[cat.id]?.items.map(i => ({
          title: i.title,
          severity: i.severity,
          endpoint: i.endpoint,
          target: i.scan?.target
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strix_owasp_compliance_audit_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2500);
  }

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none" }}>
      {/* Intro Header */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="tag" style={{ background: "var(--bg-2)", border: "1px solid var(--border-md)", color: "var(--fg-2)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Framework
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>OWASP Top 10 (2021) Benchmark</span>
          </div>
          <h1 className="page-heading">Compliance & Regulatory Matrix</h1>
          <p className="page-desc">
            Continuous automated benchmark of discovered application flaws against OWASP 2021, NIST SP 800-53, and PCI-DSS requirements.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Target Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-1)", padding: "4px 10px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
            <Filter size={13} style={{ color: "var(--fg-3)" }} />
            <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>SCOPE:</span>
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fg)",
                fontSize: 12,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">Enterprise Wide (All Targets)</option>
              {targets.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportAuditReport}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}
          >
            {copiedAudit ? <Check size={14} /> : <FileDown size={14} />}
            {copiedAudit ? "Exported JSON!" : "Export Audit Report"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
        {/* Compliance Score */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Compliance Health</span>
            <Award size={14} className="stat-label-icon" />
          </div>
          <div className={`stat-value ${complianceScore.score >= 75 ? "success" : complianceScore.score >= 50 ? "warning" : "danger"}`}>
            {complianceScore.score}%
          </div>
          <div className="stat-sub" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{complianceScore.grade}</span>
            <span style={{ fontWeight: 700 }}>{complianceScore.status}</span>
          </div>
        </div>

        {/* Clean Categories */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Compliant Controls</span>
            <CheckCircle2 size={14} className="stat-label-icon" style={{ color: "var(--sev-low)" }} />
          </div>
          <div className="stat-value">
            {complianceScore.cleanCategories}
            <span style={{ fontSize: 14, opacity: 0.5 }}>/ 10</span>
          </div>
          <div className="stat-sub">
            {10 - complianceScore.cleanCategories} categories with active violations
          </div>
        </div>

        {/* Active Violations */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">Active Violations</span>
            <ShieldAlert size={14} className="stat-label-icon" style={{ color: "var(--sev-critical)" }} />
          </div>
          <div className={`stat-value ${filteredVulns.length > 0 ? "danger" : ""}`}>
            {filteredVulns.length}
          </div>
          <div className="stat-sub">
            Excluding resolved and false positives
          </div>
        </div>

        {/* Critical Gaps */}
        <div className="stat-card">
          <div className="stat-label">
            <span className="stat-label-text">High / Critical Gaps</span>
            <AlertTriangle size={14} className="stat-label-icon" style={{ color: "var(--sev-high)" }} />
          </div>
          <div className={`stat-value ${filteredVulns.filter(v => v.severity === "critical" || v.severity === "high").length > 0 ? "danger" : ""}`}>
            {filteredVulns.filter(v => v.severity === "critical" || v.severity === "high").length}
          </div>
          <div className="stat-sub">
            Immediate audit showstoppers
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: selectedCatId ? "1.4fr 1fr" : "1fr",
        gap: 16,
        flex: 1,
        minHeight: 0,
        transition: "grid-template-columns 0.2s"
      }}>
        {/* Categories List */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-1)"
          }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--fg)" }}>
                OWASP Top 10 (2021 Edition) Controls
              </h2>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Click a control category to inspect specific flaws & remediation guidelines</span>
            </div>
            {selectedCatId && (
              <button
                onClick={() => setSelectedCatId(null)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  color: "var(--fg-3)",
                  padding: "3px 8px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                Close Drill-down
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? (
              <div className="empty-state">
                <Loader2 size={24} className="spin" />
                <p>Analyzing compliance matrix...</p>
              </div>
            ) : (
              OWASP_TOP_10.map((cat) => {
                const stat = categoryStats[cat.id] || { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] };
                const isPassing = stat.total === 0;
                const isSelected = selectedCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatId(isSelected ? null : cat.id)}
                    style={{
                      background: isSelected ? "var(--bg-3)" : "var(--bg-1)",
                      border: `1px solid ${isSelected ? "var(--border-hi)" : "var(--border)"}`,
                      borderRadius: "var(--r)",
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = "var(--border-hi)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--fg)"
                          }}>
                            {cat.code}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>
                            {cat.name}
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: "var(--fg-3)", margin: 0, lineHeight: 1.4 }}>
                          {cat.description}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isPassing ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--sev-low)",
                            background: "var(--sev-low-bg)",
                            border: "1px solid var(--sev-low-bd)",
                            padding: "2px 8px",
                            borderRadius: 12
                          }}>
                            <CheckCircle2 size={12} /> PASS
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: stat.critical > 0 ? "var(--sev-critical)" : "var(--sev-high)",
                            background: stat.critical > 0 ? "var(--sev-critical-bg)" : "var(--sev-high-bg)",
                            border: `1px solid ${stat.critical > 0 ? "var(--sev-critical-bd)" : "var(--sev-high-bd)"}`,
                            padding: "2px 8px",
                            borderRadius: 12
                          }}>
                            <ShieldAlert size={12} /> {stat.total} FAILED
                          </span>
                        )}
                        <ChevronRight size={14} style={{ color: "var(--fg-3)", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </div>
                    </div>

                    {/* Meta Bar */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      fontSize: 11,
                      color: "var(--fg-3)",
                      flexWrap: "wrap",
                      gap: 8
                    }}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>NIST: <strong style={{ color: "var(--fg-2)" }}>{cat.nistMapping.split(" ")[0]}</strong></span>
                        <span>PCI-DSS: <strong style={{ color: "var(--fg-2)" }}>{cat.pciMapping.split(" ")[0]}</strong></span>
                      </div>

                      {/* Severity Pills if any */}
                      {stat.total > 0 && (
                        <div style={{ display: "flex", gap: 4 }}>
                          {stat.critical > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--sev-critical-bg)", color: "var(--sev-critical)", border: "1px solid var(--sev-critical-bd)" }}>
                              {stat.critical} Critical
                            </span>
                          )}
                          {stat.high > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--sev-high-bg)", color: "var(--sev-high)", border: "1px solid var(--sev-high-bd)" }}>
                              {stat.high} High
                            </span>
                          )}
                          {stat.medium > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--sev-medium-bg)", color: "var(--sev-medium)", border: "1px solid var(--sev-medium-bd)" }}>
                              {stat.medium} Med
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Findings Drill-Down Drawer */}
        {selectedCatId && (
          <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", background: "var(--bg-1)" }}>
            {(() => {
              const curCat = OWASP_TOP_10.find(c => c.id === selectedCatId);
              if (!curCat) return null;
              const curStat = categoryStats[selectedCatId] || { total: 0, items: [] };

              return (
                <>
                  <div style={{
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--sev-critical)" }}>
                        {curCat.code}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: curStat.total === 0 ? "var(--sev-low-bg)" : "var(--sev-critical-bg)",
                        color: curStat.total === 0 ? "var(--sev-low)" : "var(--sev-critical)",
                        border: `1px solid ${curStat.total === 0 ? "var(--sev-low-bd)" : "var(--sev-critical-bd)"}`
                      }}>
                        {curStat.total} Violations
                      </span>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", margin: 0 }}>
                      {curCat.name}
                    </h3>
                    <p style={{ fontSize: 11.5, color: "var(--fg-3)", margin: 0 }}>
                      {curCat.description}
                    </p>

                    <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,0,0,0.25)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", fontSize: 11 }}>
                      <div style={{ color: "var(--fg-3)", marginBottom: 2 }}>Audit Standard Mappings:</div>
                      <div style={{ color: "var(--fg-2)" }}><strong>NIST:</strong> {curCat.nistMapping}</div>
                      <div style={{ color: "var(--fg-2)" }}><strong>PCI-DSS:</strong> {curCat.pciMapping}</div>
                    </div>
                  </div>

                  {/* Findings List */}
                  <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {curStat.items.length === 0 ? (
                      <div style={{
                        textAlign: "center",
                        padding: "48px 16px",
                        color: "var(--fg-3)",
                        fontSize: 12,
                        border: "1px dashed var(--border)",
                        borderRadius: "var(--r)",
                        margin: 12
                      }}>
                        <CheckCircle2 size={32} style={{ color: "var(--sev-low)", margin: "0 auto 10px", display: "block", opacity: 0.8 }} />
                        <strong style={{ color: "var(--fg)", display: "block", marginBottom: 4 }}>Control Clean</strong>
                        No active vulnerabilities violate this OWASP control.
                      </div>
                    ) : (
                      curStat.items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--r-sm)",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                            <span className={`sev sev-${item.severity.toLowerCase() === "info" ? "informative" : item.severity.toLowerCase()}`} style={{ fontSize: 10, padding: "1px 5px" }}>
                              {item.severity}
                            </span>
                            {item.cvss && (
                              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
                                CVSS {item.cvss}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>
                            {item.title}
                          </div>

                          <div style={{
                            fontSize: 10.5,
                            fontFamily: "var(--font-mono)",
                            color: "var(--fg-3)",
                            background: "rgba(0,0,0,0.3)",
                            padding: "3px 6px",
                            borderRadius: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {item.method || "GET"} {item.endpoint}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, color: "var(--fg-3)" }}>
                            <span>Target: <strong style={{ color: "var(--fg-2)" }}>{item.scan?.target || "Unknown"}</strong></span>
                            <Link
                              href="/vulnerabilities"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--sev-critical)", fontWeight: 600 }}
                            >
                              Triage <ArrowRight size={11} />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

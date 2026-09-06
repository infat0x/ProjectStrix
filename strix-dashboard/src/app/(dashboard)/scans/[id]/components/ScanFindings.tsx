import { useState } from "react";
import { ScanDetail, Vulnerability } from "../types";
import { SeverityBadge } from "./SeverityBadge";
import styles from "../detail.module.css";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Copy, Check } from "lucide-react";

const STATUS_MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  OPEN: { bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.28)", label: "Open" },
  CONFIRMED: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)", label: "Confirmed" },
  RESOLVED: { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.28)", label: "Resolved" },
  FALSE_POSITIVE: { bg: "rgba(148, 163, 184, 0.12)", color: "#94a3b8", border: "rgba(148, 163, 184, 0.25)", label: "False Positive" },
};

export default function ScanFindings({ scan, vulns }: { scan: ScanDetail, vulns: Vulnerability[] }) {
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function updateStatus(vulnId: string, newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${vulnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (selectedVuln && selectedVuln.id === vulnId) {
          setSelectedVuln({ ...selectedVuln, status: newStatus });
        }
        const v = vulns.find(x => x.id === vulnId);
        if (v) v.status = newStatus;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function copyBugBountyReport(v: Vulnerability) {
    const report = `## Vulnerability Title:
${v.title}

## Target / Asset:
${v.target || scan.target}

## Severity & CVSS:
- **Severity:** ${v.severity.toUpperCase()}${v.cvss ? ` (CVSS ${v.cvss})` : ""}
- **Endpoint:** \`${v.method || "GET"} ${v.endpoint}\`
- **Status:** ${v.status || "OPEN"}

## Summary:
${v.description}

## Steps to Reproduce / Proof of Concept:
${v.poc_description ? `${v.poc_description}\n\n` : ""}${v.poc_script_code ? `\`\`\`bash\n${v.poc_script_code}\n\`\`\`\n\n` : ""}${v.poc && !v.poc_script_code ? `\`\`\`text\n${v.poc}\n\`\`\`\n\n` : ""}

## Impact:
Unauthorized access or manipulation of data via \`${v.endpoint}\`.

## Remediation Guidance:
${v.remediation || "Apply proper server-side authentication and input validation."}
`;
    navigator.clipboard.writeText(report.trim());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  }

  return (
    <div className={styles.findingsContainer}>
      <div className={`glass-panel ${styles.findingsTableWrapper}`}>
        {vulns.length === 0 ? (
          <div className={styles.emptyState}>No vulnerabilities found yet.</div>
        ) : (
          <table className={styles.findingsTable}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Status</th>
                <th>Title</th>
                <th>Endpoint</th>
                <th>Method</th>
                <th>CVSS</th>
              </tr>
            </thead>
            <tbody>
              {vulns.map((v) => {
                const bgMap = {
                  critical: styles.rowCritical,
                  high: styles.rowHigh,
                  medium: styles.rowMedium,
                  low: styles.rowLow,
                  informative: styles.rowInformative,
                  info: styles.rowInformative,
                } as Record<string, string>;
                const normalizedSev = v.severity.toLowerCase() === "info" ? "informative" : v.severity.toLowerCase();
                const rowClass = bgMap[normalizedSev] || styles.rowLow;
                const curStatus = (v.status || "OPEN").toUpperCase();
                const sConf = STATUS_MAP[curStatus] || STATUS_MAP.OPEN;
                
                return (
                <tr
                  key={v.id}
                  className={`${styles.findingsRow} ${rowClass} ${selectedVuln?.id === v.id ? styles.findingsRowActive : ""}`}
                  onClick={() =>
                    setSelectedVuln(selectedVuln?.id === v.id ? null : v)
                  }
                >
                  <td>
                    <SeverityBadge s={v.severity} />
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: sConf.bg,
                        color: sConf.color,
                        border: `1px solid ${sConf.border}`,
                        textTransform: "uppercase"
                      }}
                    >
                      {sConf.label}
                    </span>
                  </td>
                  <td className={styles.vulnTitleCell}>{v.title}</td>
                  <td className={styles.codeCell}>{v.endpoint}</td>
                  <td>
                    <span className={styles.methodTag}>
                      {v.method ?? "GET"}
                    </span>
                  </td>
                  <td>
                    {v.cvss ? (
                      <span className={styles.cvssScore}>CVSS {v.cvss}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Right Drawer for PoC details */}
      <div
        className={`glass-panel ${styles.pocDrawer} ${selectedVuln ? styles.pocDrawerOpen : ""}`}
        style={selectedVuln ? { borderLeft: `2px solid var(--sev-${selectedVuln.severity})` } : {}}
      >
        {selectedVuln ? (
          <div className={styles.pocContent}>
            <div className={styles.pocHeader} style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SeverityBadge s={selectedVuln.severity} />
                {selectedVuln.cvss && (
                  <span className={styles.cvssScore}>
                    CVSS {selectedVuln.cvss}
                  </span>
                )}
                {/* Status selector */}
                <select
                  value={(selectedVuln.status || "OPEN").toUpperCase()}
                  onChange={(e) => updateStatus(selectedVuln.id, e.target.value)}
                  disabled={updatingStatus}
                  style={{
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    background: "var(--bg-1)",
                    color: (STATUS_MAP[(selectedVuln.status || "OPEN").toUpperCase()] || STATUS_MAP.OPEN).color,
                    border: `1px solid ${(STATUS_MAP[(selectedVuln.status || "OPEN").toUpperCase()] || STATUS_MAP.OPEN).border}`,
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => copyBugBountyReport(selectedVuln)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: copiedReport ? "var(--sev-low)" : "#e5e5e5",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                  title="Copy HackerOne / Bugcrowd Report"
                >
                  {copiedReport ? <Check size={12} /> : <Copy size={12} />}
                  {copiedReport ? "Copied!" : "H1 Report"}
                </button>
                <button
                  className={styles.closePoC}
                  onClick={() => setSelectedVuln(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            <h2 className={styles.pocTitle}>{selectedVuln.title}</h2>

            <div className={styles.pocEndpoint} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Target Domain:</span>
                <span style={{ color: '#e5e5e5', fontFamily: 'monospace' }}>{selectedVuln.target || scan.target}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <span className={styles.methodTag}>
                  {selectedVuln.method ?? "GET"}
                </span>
                <code style={{ wordBreak: 'break-all' }}>{selectedVuln.endpoint}</code>
              </div>
            </div>

            <section className={styles.pocSection}>
              <h3>Description</h3>
              <MarkdownRenderer content={selectedVuln.description} />
            </section>

            <section className={styles.pocSection}>
              <h3>Proof of Concept (PoC)</h3>
              {selectedVuln.poc || selectedVuln.poc_description || selectedVuln.poc_script_code ? (
                <>
                  {selectedVuln.poc_description && (
                    <MarkdownRenderer content={selectedVuln.poc_description} />
                  )}
                  {selectedVuln.poc_script_code && (
                    <MarkdownRenderer content={selectedVuln.poc_script_code} />
                  )}
                  {selectedVuln.poc && !selectedVuln.poc_script_code && (
                    <MarkdownRenderer content={selectedVuln.poc.includes("```") ? selectedVuln.poc : `\`\`\`text\n${selectedVuln.poc}\n\`\`\``} />
                  )}
                </>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #333', borderRadius: '8px', color: '#888', fontSize: '13px' }}>
                  No automated PoC snippet was recorded for this specific finding. Check the Raw Artifacts or Logs for full exploitation steps.
                </div>
              )}
            </section>

            {selectedVuln.remediation && (
              <section className={styles.pocSection}>
                <h3>Remediation</h3>
                  <MarkdownRenderer content={selectedVuln.remediation} />
              </section>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Select a vulnerability to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

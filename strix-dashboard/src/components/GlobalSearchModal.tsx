"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, AlertCircle, Radar, ShieldAlert, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ScanResult {
  id: string;
  target: string;
  projectName: string;
  status: string;
  scanMode: string;
  llmModel: string;
  startedAt: string;
  vulnCount: number;
}

interface VulnResult {
  id: string;
  title: string;
  severity: string;
  endpoint: string;
  scanId: string;
  scan: { target: string; projectName: string };
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [vulns, setVulns] = useState<VulnResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const totalResults = scans.length + vulns.length;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalResults - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && totalResults > 0) {
        e.preventDefault();
        if (selectedIndex < scans.length) {
          handleScanClick(scans[selectedIndex].id);
        } else {
          const vuln = vulns[selectedIndex - scans.length];
          handleVulnClick(vuln.scanId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scans, vulns, selectedIndex, totalResults, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setScans([]);
      setVulns([]);
      setError(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    
    if (query.trim().length < 2) {
      setScans([]);
      setVulns([]);
      setError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setScans(data.scans || []);
        setVulns(data.vulnerabilities || []);
        setSelectedIndex(0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen]);

  const handleScanClick = (scanId: string) => {
    onClose();
    router.push(`/scans?id=${scanId}`);
  };

  const handleVulnClick = (scanId: string) => {
    onClose();
    router.push(`/vulnerabilities`);
  };

  if (!isOpen) return null;

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "var(--sev-critical)";
      case "high": return "var(--sev-high)";
      case "medium": return "var(--sev-medium)";
      case "low": return "var(--sev-low)";
      default: return "var(--fg-3)";
    }
  };

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div 
        className="global-search-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search scans, targets, projects, vulnerabilities..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-input"
          />
          {isLoading && <Loader2 className="search-spinner spin" size={18} />}
          <button className="search-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="search-results-container">
          {error && (
            <div className="search-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && query.trim().length > 1 && totalResults === 0 && (
            <div className="search-empty">
              <Search size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!isLoading && !error && query.trim().length <= 1 && (
            <div className="search-empty">
              <p style={{ opacity: 0.5 }}>Type at least 2 characters to search</p>
            </div>
          )}

          {/* Scans Section */}
          {scans.length > 0 && (
            <div>
              <div className="search-results-header">SCANS</div>
              {scans.map((scan, idx) => (
                <div 
                  key={scan.id} 
                  className={`search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleScanClick(scan.id)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="result-icon-wrapper">
                    <Radar size={16} />
                  </div>
                  <div className="result-content">
                    <div className="result-title">
                      <span className="result-target">{scan.target}</span>
                      {scan.projectName && (
                        <span className="result-project-badge">
                          <FolderOpen size={10} style={{ marginRight: 3 }} />
                          {scan.projectName}
                        </span>
                      )}
                    </div>
                    <div className="result-meta">
                      <span className="result-status" data-status={scan.status}>
                        {scan.status}
                      </span>
                      <span>{scan.scanMode}</span>
                      {scan.vulnCount > 0 && (
                        <span style={{ color: "var(--sev-high)" }}>
                          {scan.vulnCount} vuln{scan.vulnCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="result-date">
                        {new Date(scan.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vulnerabilities Section */}
          {vulns.length > 0 && (
            <div>
              <div className="search-results-header" style={{ marginTop: scans.length > 0 ? 8 : 0 }}>
                VULNERABILITIES
              </div>
              {vulns.map((vuln, idx) => {
                const globalIdx = scans.length + idx;
                return (
                  <div 
                    key={vuln.id} 
                    className={`search-result-item ${globalIdx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleVulnClick(vuln.scanId)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <div className="result-icon-wrapper">
                      <ShieldAlert size={16} />
                    </div>
                    <div className="result-content">
                      <div className="result-title">
                        <span className="result-target">{vuln.title}</span>
                        <span className="result-severity-badge" style={{ color: severityColor(vuln.severity) }}>
                          {vuln.severity}
                        </span>
                      </div>
                      <div className="result-meta">
                        <span>{vuln.scan.target}</span>
                        {vuln.endpoint && <span style={{ fontFamily: "monospace", fontSize: 11 }}>{vuln.endpoint}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="search-footer">
          <div className="search-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>Enter</kbd> select</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .global-search-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12vh;
          animation: overlayIn 0.15s ease-out;
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .global-search-modal {
          width: 100%;
          max-width: 640px;
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: modalIn 0.2s ease-out;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .search-icon {
          color: var(--fg-3);
          margin-right: 12px;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 17px;
          color: var(--fg);
          font-family: inherit;
        }

        .search-input::placeholder {
          color: var(--fg-3);
        }

        .search-spinner {
          color: var(--brand);
          margin-right: 12px;
          flex-shrink: 0;
        }

        .search-close-btn {
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--fg-2);
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .search-close-btn:hover {
          background: var(--bg-3);
          color: var(--fg);
        }

        .search-results-container {
          max-height: 400px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .search-empty {
          padding: 48px 20px;
          text-align: center;
          color: var(--fg-3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .search-error {
          padding: 16px 20px;
          color: var(--sev-high);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-results-header {
          padding: 8px 20px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--fg-3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .search-result-item {
          display: flex;
          gap: 14px;
          padding: 10px 20px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .search-result-item:hover,
        .search-result-item.selected {
          background: var(--bg-2);
        }

        .result-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-2);
          flex-shrink: 0;
        }

        .search-result-item.selected .result-icon-wrapper {
          background: var(--brand);
          color: #fff;
        }

        .result-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .result-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .result-target {
          font-weight: 500;
          font-size: 14px;
          color: var(--fg);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-project-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--fg-2);
          border: 1px solid var(--border);
          white-space: nowrap;
          display: flex;
          align-items: center;
        }

        .result-severity-badge {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .result-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--fg-3);
        }

        .result-status {
          text-transform: capitalize;
        }
        
        .result-status[data-status="running"],
        .result-status[data-status="crawling"],
        .result-status[data-status="scanning"],
        .result-status[data-status="analyzing"] {
          color: var(--brand);
        }
        
        .result-status[data-status="completed"] {
          color: #10b981;
        }
        
        .result-status[data-status="failed"] {
          color: var(--sev-critical);
        }

        .search-footer {
          padding: 10px 20px;
          border-top: 1px solid var(--border);
          background: var(--bg-0);
          display: flex;
          justify-content: flex-end;
        }

        .search-hint {
          display: flex;
          gap: 14px;
          font-size: 11px;
          color: var(--fg-3);
        }

        .search-hint span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        kbd {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: monospace;
          font-size: 10px;
          color: var(--fg-2);
          box-shadow: 0 1px 0 var(--border);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

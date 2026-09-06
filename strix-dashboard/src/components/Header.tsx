"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus, Bell, Search, CheckCircle2, XCircle, Clock, Settings2, Book, Loader2, ShieldAlert, Sun, Moon } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import GlobalSearchModal from "./GlobalSearchModal";

const routeTitles: Record<string, string> = {
  "/":               "Overview",
  "/scans":          "Scans",
  "/vulnerabilities":"Vulnerabilities",
  "/assets":         "Asset Inventory",
  "/compliance":     "Compliance & OWASP",
  "/tools":          "Hacker Toolkit",
  "/graph":          "Live Graph",
  "/reports":        "Reports",
  "/logs":           "System Logs",
  "/instructions":   "Instructions",
  "/api-docs":       "API Docs",
  "/settings":       "Settings",
};

interface InAppNotif {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  time: string;
  read: boolean;
  link?: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("strix_inapp_notifs");
    if (saved) {
      try { setNotifs(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Save to local storage when notifs change
  useEffect(() => {
    if (notifs.length > 0) {
      localStorage.setItem("strix_inapp_notifs", JSON.stringify(notifs));
    }
  }, [notifs]);

  const pollScans = useCallback(async () => {
    try {
      const res = await fetch("/api/scans");
      if (!res.ok) return;
      const data = await res.json();
      const scanList = Array.isArray(data?.scans) ? data.scans : (Array.isArray(data) ? data : []);
      
      const notifiedStr = localStorage.getItem("strix_notified_scans") || "[]";
      let notifiedIds: string[] = [];
      try { notifiedIds = JSON.parse(notifiedStr); } catch(e){}
      
      let newNotifs: InAppNotif[] = [];
      let updatedNotifiedIds = [...notifiedIds];

      for (const scan of scanList) {
        if ((scan.status === "completed" || scan.status === "failed") && !notifiedIds.includes(scan.id)) {
          const type = scan.status === "completed" ? "success" : "error";
          const title = scan.status === "completed" ? "Scan Completed" : "Scan Failed";
          const message = `Scan for ${scan.target} has finished. ${scan.vulnCount > 0 ? `Found ${scan.vulnCount} vulnerabilities.` : "No vulnerabilities found."}`;
          
          newNotifs.push({
            id: Math.random().toString(36).substring(7),
            title,
            message,
            type,
            time: new Date().toISOString(),
            read: false,
            link: `/scans/${scan.id}`
          });
          updatedNotifiedIds.push(scan.id);
        }
      }

      if (newNotifs.length > 0) {
        setNotifs(prev => [...newNotifs, ...prev].slice(0, 50)); // keep last 50
        localStorage.setItem("strix_notified_scans", JSON.stringify(updatedNotifiedIds));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    pollScans();
    const interval = setInterval(pollScans, 5000);
    return () => clearInterval(interval);
  }, [pollScans]);

  // Listen for Ctrl+K in Header
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleNotifClick = (n: InAppNotif) => {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setShowNotifs(false);
    if (n.link) router.push(n.link);
  };

  const markAllRead = () => {
    setNotifs(prev => prev.map(x => ({ ...x, read: true })));
  };

  let title = "Dashboard";
  for (const [route, label] of Object.entries(routeTitles)) {
    if (pathname === route || (route !== "/" && pathname.startsWith(route))) {
      title = label;
      break;
    }
  }

  return (
    <header className="header">
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
        <span className="header-title">{title}</span>
      </div>

      {/* Centered Large Search Bar */}
      <div style={{ flex: 2, display: "flex", justifyContent: "center", maxWidth: 600, padding: "0 20px" }}>
        <button 
          onClick={() => setIsSearchOpen(true)}
          style={{ 
            width: "100%", height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", 
            padding: "0 16px", background: "var(--bg-1)", border: "1px solid var(--border)", 
            borderRadius: "var(--r)", color: "var(--fg-3)", cursor: "text", transition: "all 0.2s",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)"
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--fg-2)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--fg-3)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Search size={16} />
            <span style={{ fontSize: 14 }}>Search targets, projects, vulnerabilities...</span>
          </div>
          <span style={{ fontSize: 11, background: "var(--bg-2)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", display: "flex", alignItems: "center" }}>⌘K</span>
        </button>
      </div>

      <div className="header-right" style={{ flex: 1, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <button 
            className="header-icon-btn" 
            title="API Documentation"
            onClick={() => window.open("https://infat0x.github.io/ProjectStrix/guide/what-is-strix.html", "_blank")}
          >
            <Book size={16} />
          </button>
          
          <button 
            className="header-icon-btn" 
            title="Settings"
            onClick={() => router.push("/settings")}
          >
            <Settings2 size={16} />
          </button>

          {mounted && (
            <button 
              className="header-icon-btn" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button 
              className="header-icon-btn" 
              onClick={() => setShowNotifs(!showNotifs)}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="notif-dot" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, width: 14, height: 14, top: 4, right: 4 }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifs && (
              <>
                <div 
                  style={{ position: "fixed", inset: 0, zIndex: 90 }} 
                  onClick={() => setShowNotifs(false)} 
                />
                <div 
                  className="glass-panel animate-fade-in" 
                  style={{ 
                    position: "absolute", top: "110%", right: 0, 
                    width: 340, zIndex: 100, padding: 0, 
                    display: "flex", flexDirection: "column",
                    maxHeight: 450, overflow: "hidden",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    border: "1px solid var(--border-md)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Notifications</div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 11, color: "var(--fg-3)", background: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 4, border: "1px solid transparent" }} className="nav-link">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div style={{ overflowY: "auto", flex: 1, padding: "0" }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                        <Bell size={24} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
                        No notifications yet
                      </div>
                    ) : (
                      notifs.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotifClick(n)}
                          style={{ 
                            padding: "16px", 
                            display: "flex", gap: 14,
                            cursor: "pointer",
                            background: n.read ? "transparent" : "var(--bg-2)",
                            borderBottom: "1px solid var(--border)",
                            transition: "background 0.2s"
                          }}
                          className="nav-link"
                        >
                          <div style={{ flexShrink: 0, marginTop: 2 }}>
                            {n.type === "success" ? <CheckCircle2 size={16} color="var(--sev-low)" /> : 
                             n.type === "error" ? <XCircle size={16} color="var(--sev-critical)" /> : 
                             <Clock size={16} color="var(--fg-3)" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: n.read ? "var(--fg-2)" : "var(--fg)", marginBottom: 4 }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 8 }}>
                              {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          {!n.read && (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ marginLeft: 8 }}
          onClick={() => router.push("/scans?new=1")}
        >
          <Plus size={14} />
          New Scan
        </button>
      </div>

      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </header>
  );
}

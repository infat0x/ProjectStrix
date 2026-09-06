"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  ShieldAlert,
  Activity,
  FileText,
  TerminalSquare,
  BookOpen,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  ShieldCheck,
  Key,
  Lock,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  UserCheck,
  HardDrive,
  BookText,
  Search,
  Globe,
  Wrench
} from "lucide-react";

const navItems = [
  { name: "Overview",         path: "/",               icon: LayoutDashboard },
  { name: "Scans",            path: "/scans",           icon: Radar },
  { name: "Vulnerabilities",  path: "/vulnerabilities", icon: ShieldAlert },
  { name: "Asset Inventory",  path: "/assets",          icon: Globe },
  { name: "Compliance",       path: "/compliance",      icon: ShieldCheck },
  { name: "Hacker Tools",     path: "/tools",           icon: Wrench },
  { name: "Live Graph",       path: "/graph",           icon: Activity },
  { name: "Reports",          path: "/reports",         icon: FileText },
  { name: "System Logs",      path: "/logs",            icon: TerminalSquare },
  { name: "Instructions",     path: "/instructions",    icon: BookText },
  { name: "API Docs",         path: "/api-docs",        icon: BookOpen },
];

interface UserProfile {
  id: string;
  username: string;
  role: string;
  status?: string;
  createdAt?: string;
  scanCount?: number;
  configuredKeysCount?: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Profile Modal State
  const [activeTab, setActiveTab] = useState<"overview" | "security">("overview");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          }
        }
      } catch (e) {}
    };
    fetchUser();

    const check = async () => {
      try {
        const r = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
        setApiStatus(r.ok ? "ok" : "error");
      } catch {
        setApiStatus("error");
      }
    };
    check();
    const iv = setInterval(check, 30000);

    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetch("/api/users/pending-count").then(r => r.json()).then(data => {
        setPendingCount(data.pendingCount || 0);
      }).catch(console.error);
    }
  }, [user]);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 12) {
      setPwdError("Password must be at least 12 characters long");
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPwdError("Password must contain uppercase, lowercase, and a number");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || "Failed to update password");
      } else {
        setPwdSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPwdError("Network error occurred. Please try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-header" style={{ justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark" style={{ background: "transparent", width: 32, height: 32 }}>
              <img src="/logo.svg" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <span className="sidebar-logo-text">Project Strix</span>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Scan */}
      <div className="sidebar-new-scan">
        <Link href="/scans?new=1" className="btn-new-scan" title="New Scan">
          <Plus size={14} />
          {!collapsed && "New Scan"}
        </Link>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if ((item.path === "/logs" || item.path === "/api-docs") && user?.role !== "ADMIN") {
            return null;
          }

          const active =
            item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`nav-link${active ? " active" : ""}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="nav-link-icon" />
              {!collapsed && <span className="nav-link-label">{item.name}</span>}
            </Link>
          );
        })}
        {user?.role === "ADMIN" && (
          <Link 
            href="/users" 
            className={`nav-link${pathname === "/users" ? " active" : ""}`}
            title="Team Management"
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users className="nav-link-icon" />
              {pendingCount > 0 && pathname !== "/users" && (
                <span style={{
                  position: "absolute", top: -4, right: -4, background: "var(--sev-critical)", color: "#fff",
                  fontSize: 10, fontWeight: "bold", width: 14, height: 14, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-1)"
                }}>{pendingCount}</span>
              )}
            </div>
            {!collapsed && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="nav-link-label">Team Control</span>
                {pendingCount > 0 && pathname !== "/users" && (
                  <span style={{ background: "var(--sev-critical)", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11, fontWeight: "bold" }}>
                    {pendingCount}
                  </span>
                )}
              </div>
            )}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Settings Link replacing API Status */}
        <Link 
          href="/settings"
          className={`sidebar-api-status ${pathname === "/settings" ? "active" : ""}`} 
          style={{ 
            display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "12px 0" : "12px", 
            justifyContent: collapsed ? "center" : "flex-start",
            color: pathname === "/settings" ? "var(--fg)" : "var(--fg-3)",
            textDecoration: "none",
            borderRadius: "var(--r)",
            transition: "background 0.2s, color 0.2s",
            background: pathname === "/settings" ? "var(--bg-2)" : "transparent"
          }}
          onMouseOver={e => {
            if (pathname !== "/settings") e.currentTarget.style.color = "var(--fg)";
          }}
          onMouseOut={e => {
            if (pathname !== "/settings") e.currentTarget.style.color = "var(--fg-3)";
          }}
        >
          <Settings size={18} style={{ color: pathname === "/settings" ? "var(--fg)" : "var(--fg-2)" }} />
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              Settings
            </span>
          )}
        </Link>

        {/* User */}
        <div 
          className="sidebar-user" 
          style={{ 
            position: "relative", cursor: "pointer", transition: "background 0.2s", borderRadius: 8, 
            padding: collapsed ? "8px 0" : "8px 12px", 
            display: "flex", alignItems: "center", gap: 10,
            justifyContent: collapsed ? "center" : "flex-start"
          }}
          onClick={() => setShowProfile(true)}
          onMouseOver={e => e.currentTarget.style.background = "var(--bg-2)"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <div className="sidebar-avatar">{user ? user.username.charAt(0).toUpperCase() : "U"}</div>
          {!collapsed && (
            <div className="sidebar-user-info" style={{ flex: 1 }}>
              <div className="sidebar-user-name" style={{ textTransform: "capitalize" }}>{user ? user.username : "Loading..."}</div>
              <div className="sidebar-user-role">{user ? (user.role === "ADMIN" ? "Administrator" : "Security Engineer") : ""}</div>
            </div>
          )}
          {!collapsed && user && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetch("/api/auth/logout", { method: "POST" }).then(() => {
                  window.location.href = "/login";
                });
              }}
              className="btn-ghost"
              style={{ padding: 6, minHeight: 0, color: "var(--fg-3)" }}
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Modern Compact Operator Profile & Security Modal */}
      {showProfile && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
            animation: "fade 0.15s forwards"
          }}
          onClick={() => setShowProfile(false)}
        >
          <div 
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--r-xl)",
              padding: "24px 26px",
              width: 540,
              maxWidth: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
              animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Close Button & Title */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ 
                  width: 52, height: 52, borderRadius: "50%", 
                  background: "var(--bg-3)", 
                  border: "1px solid var(--border-hi)",
                  color: "var(--fg)", display: "flex", alignItems: "center", justifyContent: "center", 
                  fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)"
                }}>
                  {user ? user.username.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 18, margin: 0, textTransform: "capitalize", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>
                      {user?.username || "Guest"}
                    </h2>
                    <span style={{ 
                      padding: "2px 8px", 
                      background: "var(--bg-3)", 
                      color: "var(--fg-2)", 
                      border: "1px solid var(--border-md)",
                      borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" 
                    }}>
                      {user?.role === "ADMIN" ? "Admin" : "Engineer"}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: "var(--sev-low)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sev-low)" }} />
                      {user?.status || "Active"}
                    </span>
                  </div>
                  <p style={{ color: "var(--fg-3)", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 5, margin: "4px 0 0" }}>
                    <Calendar size={12} /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowProfile(false)}
                style={{
                  background: "var(--bg-2)", border: "1px solid var(--border)",
                  color: "var(--fg-3)", borderRadius: "var(--r)",
                  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
                onMouseOver={e => {
                  e.currentTarget.style.color = "var(--fg)";
                  e.currentTarget.style.borderColor = "var(--border-hi)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = "var(--fg-3)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Segmented Tab Switcher */}
            <div style={{
              display: "flex",
              gap: 4,
              background: "var(--bg-2)",
              padding: 3,
              borderRadius: "var(--r)",
              border: "1px solid var(--border)"
            }}>
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  background: activeTab === "overview" ? "var(--bg-4)" : "transparent",
                  color: activeTab === "overview" ? "var(--fg)" : "var(--fg-3)"
                }}
              >
                <UserCheck size={14} /> Profile & Metadata
              </button>
              <button
                onClick={() => setActiveTab("security")}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  background: activeTab === "security" ? "var(--bg-4)" : "transparent",
                  color: activeTab === "security" ? "var(--fg)" : "var(--fg-3)"
                }}
              >
                <Lock size={14} /> Change Password
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* User ID */}
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--r)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>Operator ID</span>
                    <button 
                      onClick={handleCopyId}
                      style={{ background: "transparent", border: "none", color: copiedId ? "var(--sev-low)" : "var(--fg-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                    >
                      {copiedId ? <Check size={12} /> : <Copy size={12} />} {copiedId ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)", wordBreak: "break-all" }}>
                    {user?.id || "—"}
                  </div>
                </div>

                {/* 2x2 Clean Specs Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--r)" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Role & Scope</span>
                    <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600, marginTop: 3 }}>
                      {user?.role === "ADMIN" ? "Platform Administrator" : "Security Auditor"}
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--r)" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Scans Run</span>
                    <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600, marginTop: 3 }}>
                      {user?.scanCount ?? 0} Scans Recorded
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--r)" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>LLM Provider Keys</span>
                    <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600, marginTop: 3 }}>
                      {user?.configuredKeysCount ?? 0} Keys Active
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--r)" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Session Auth</span>
                    <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600, marginTop: 3 }}>
                      Signed JWT (HS256)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SECURITY */}
            {activeTab === "security" && (
              <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pwdError && (
                  <div style={{ background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", color: "var(--sev-critical)", padding: "8px 12px", borderRadius: "var(--r-sm)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} /> {pwdError}
                  </div>
                )}
                {pwdSuccess && (
                  <div style={{ background: "var(--sev-low-bg)", border: "1px solid var(--sev-low-bd)", color: "var(--sev-low)", padding: "8px 12px", borderRadius: "var(--r-sm)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={14} /> {pwdSuccess}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", color: "var(--fg-2)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    style={{
                      width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--r)",
                      background: "var(--bg-2)", border: "1px solid var(--border-md)",
                      color: "var(--fg)", fontSize: 13, outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", color: "var(--fg-2)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Min 12 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{
                        width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--r)",
                        background: "var(--bg-2)", border: "1px solid var(--border-md)",
                        color: "var(--fg)", fontSize: 13, outline: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--fg-2)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{
                        width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--r)",
                        background: "var(--bg-2)", border: "1px solid var(--border-md)",
                        color: "var(--fg)", fontSize: 13, outline: "none"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="btn-primary"
                  style={{
                    width: "100%", height: 38,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontSize: 13, marginTop: 4
                  }}
                >
                  <Lock size={14} /> {pwdLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            {/* Modal Footer Actions */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <Link 
                href="/settings" 
                onClick={() => setShowProfile(false)}
                className="btn-secondary"
                style={{ 
                  flex: 1, height: 36,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontSize: 12.5, textDecoration: "none"
                }}
              >
                <Settings size={14} /> Open Platform Settings
              </Link>
              <button 
                style={{ 
                  height: 36, padding: "0 16px",
                  borderRadius: "var(--r)",
                  border: "1px solid rgba(248,81,73,0.3)", 
                  background: "rgba(248,81,73,0.08)", 
                  color: "var(--sev-critical)", cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "rgba(248,81,73,0.18)";
                  e.currentTarget.style.borderColor = "var(--sev-critical)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "rgba(248,81,73,0.08)";
                  e.currentTarget.style.borderColor = "rgba(248,81,73,0.3)";
                }}
                onClick={() => {
                  fetch("/api/auth/logout", { method: "POST" }).then(() => {
                    window.location.href = "/login";
                  });
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}} />
        </div>
      )}
    </aside>
  );
}

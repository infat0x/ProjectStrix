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

      {/* Enlarged User Profile & Security Modal */}
      {showProfile && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
            animation: "fade 0.2s forwards"
          }}
          onClick={() => setShowProfile(false)}
        >
          <div 
            style={{
              background: "#0c0c0e",
              border: "1px solid var(--border-hi)",
              borderRadius: 24,
              padding: 36,
              width: 860,
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 28,
              boxShadow: "0 30px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowProfile(false)}
              style={{
                position: "absolute", top: 24, right: 24,
                background: "var(--bg-2)", border: "1px solid var(--border)",
                color: "var(--fg-2)", borderRadius: "50%",
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s ease"
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "var(--bg-3)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "var(--bg-2)";
                e.currentTarget.style.color = "var(--fg-2)";
              }}
            >
              <X size={18} />
            </button>

            {/* Profile Banner */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
              <div style={{ 
                width: 84, height: 84, borderRadius: "50%", 
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", 
                color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: 34, fontWeight: "bold",
                boxShadow: "0 10px 20px rgba(139, 92, 246, 0.3)"
              }}>
                {user ? user.username.charAt(0).toUpperCase() : "U"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 26, margin: 0, textTransform: "capitalize", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>
                    {user?.username || "Guest"}
                  </h2>
                  <span style={{ 
                    padding: "4px 12px", 
                    background: user?.role === "ADMIN" ? "rgba(139, 92, 246, 0.15)" : "rgba(59, 130, 246, 0.15)", 
                    color: user?.role === "ADMIN" ? "#c084fc" : "#60a5fa", 
                    border: user?.role === "ADMIN" ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: "uppercase" 
                  }}>
                    {user?.role === "ADMIN" ? "Administrator" : "Security Engineer"}
                  </span>
                  <span style={{ padding: "4px 12px", background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    ● {user?.status || "APPROVED"}
                  </span>
                </div>
                <p style={{ color: "var(--fg-3)", fontSize: 14, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={14} /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                </p>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s ease",
                  background: activeTab === "overview" ? "var(--bg-3)" : "transparent",
                  color: activeTab === "overview" ? "#fff" : "var(--fg-3)"
                }}
              >
                <UserCheck size={16} /> Overview & Metadata
              </button>
              <button
                onClick={() => setActiveTab("security")}
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s ease",
                  background: activeTab === "security" ? "var(--bg-3)" : "transparent",
                  color: activeTab === "security" ? "#fff" : "var(--fg-3)"
                }}
              >
                <Lock size={16} /> Security & Change Password
              </button>
            </div>

            {/* TAB 1: OVERVIEW & EXTENDED INFO */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  
                  {/* User ID */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>User ID (UUID)</span>
                      <button 
                        onClick={handleCopyId}
                        style={{ background: "transparent", border: "none", color: copiedId ? "#4ade80" : "var(--fg-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                      >
                        {copiedId ? <Check size={13} /> : <Copy size={13} />} {copiedId ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)", wordBreak: "break-all" }}>
                      {user?.id || "—"}
                    </div>
                  </div>

                  {/* Account Tier */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Account Tier</div>
                    <div style={{ fontSize: 16, color: "var(--fg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <ShieldCheck size={18} style={{ color: "#a855f7" }} /> Enterprise License
                    </div>
                  </div>

                  {/* Total Scans */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Total Scans Launched</div>
                    <div style={{ fontSize: 20, color: "var(--fg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <Layers size={20} style={{ color: "#3b82f6" }} /> {user?.scanCount ?? 0} Scans
                    </div>
                  </div>

                  {/* Configured Keys */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>LLM Provider Keys</div>
                    <div style={{ fontSize: 16, color: "var(--fg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <Key size={18} style={{ color: "#eab308" }} /> {user?.configuredKeysCount ?? 0} Provider Keys Configured
                    </div>
                  </div>

                  {/* Session IP */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Session IP & Protocol</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
                      <HardDrive size={16} style={{ color: "#64748b" }} /> 127.0.0.1 (Localhost / HTTP)
                    </div>
                  </div>

                  {/* 2FA Status */}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: 18, borderRadius: 14 }}>
                    <div style={{ color: "var(--fg-3)", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>2FA / Session Token</div>
                    <div style={{ fontSize: 13, color: "var(--sev-high)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      ● JWT Signed (HS256) / 2FA Disabled
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: SECURITY & CHANGE PASSWORD */}
            {activeTab === "security" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Security Banner */}
                <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <ShieldCheck size={24} style={{ color: "#60a5fa" }} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Account Password Security</div>
                    <div style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 2 }}>Passwords are stored securely using bcrypt hashing (cost factor 10).</div>
                  </div>
                </div>

                {/* Notifications */}
                {pwdError && (
                  <div style={{ background: "rgba(255, 59, 59, 0.12)", border: "1px solid rgba(255, 59, 59, 0.3)", color: "#ff6b6b", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertCircle size={16} /> {pwdError}
                  </div>
                )}
                {pwdSuccess && (
                  <div style={{ background: "rgba(74, 222, 128, 0.12)", border: "1px solid rgba(74, 222, 128, 0.3)", color: "#4ade80", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={16} /> {pwdSuccess}
                  </div>
                )}

                {/* Password Change Form */}
                <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", color: "var(--fg-2)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: 10,
                        background: "var(--bg-2)", border: "1px solid var(--border-hi)",
                        color: "#fff", fontSize: 14, outline: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", color: "var(--fg-2)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="At least 12 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          background: "var(--bg-2)", border: "1px solid var(--border-hi)",
                          color: "#fff", fontSize: 14, outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", color: "var(--fg-2)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          background: "var(--bg-2)", border: "1px solid var(--border-hi)",
                          color: "#fff", fontSize: 14, outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--fg-3)", background: "var(--bg-2)", padding: 12, borderRadius: 8 }}>
                    <strong>Password Requirements:</strong> Minimum 12 characters, including uppercase, lowercase, and a number.
                  </div>

                  <button
                    type="submit"
                    disabled={pwdLoading}
                    style={{
                      padding: "14px 20px", borderRadius: 10,
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "#fff", border: "none", fontWeight: 600, fontSize: 14,
                      cursor: pwdLoading ? "wait" : "pointer",
                      opacity: pwdLoading ? 0.7 : 1,
                      transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginTop: 4
                    }}
                  >
                    <Lock size={16} /> {pwdLoading ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* Actions / Sign Out Footer */}
            <div style={{ display: "flex", gap: 14, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <Link 
                href="/settings" 
                onClick={() => setShowProfile(false)}
                style={{ 
                  flex: 1, padding: "14px 0", borderRadius: 12, 
                  border: "1px solid var(--border-hi)", background: "var(--bg-2)", 
                  color: "var(--fg)", cursor: "pointer", fontWeight: 600, fontSize: 14,
                  transition: "all 0.2s ease", textAlign: "center", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "var(--bg-3)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "var(--bg-2)";
                  e.currentTarget.style.borderColor = "var(--border-hi)";
                }}
              >
                <Settings size={16} /> Settings Page
              </Link>
              <button 
                style={{ 
                  flex: 1, padding: "14px 0", borderRadius: 12, 
                  border: "1px solid rgba(255, 59, 59, 0.4)", 
                  background: "rgba(255, 59, 59, 0.15)", 
                  color: "#ff6b6b", cursor: "pointer", fontWeight: 600, fontSize: 14,
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "rgba(255, 59, 59, 0.35)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "rgba(255, 59, 59, 0.8)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "rgba(255, 59, 59, 0.15)";
                  e.currentTarget.style.color = "#ff6b6b";
                  e.currentTarget.style.borderColor = "rgba(255, 59, 59, 0.4)";
                }}
                onClick={() => {
                  fetch("/api/auth/logout", { method: "POST" }).then(() => {
                    window.location.href = "/login";
                  });
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}} />
        </div>
      )}
    </aside>
  );
}

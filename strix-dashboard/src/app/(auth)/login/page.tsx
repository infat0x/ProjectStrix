"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div 
      className="glass-panel animate-fade-in" 
      style={{ 
        width: "100%", 
        maxWidth: 420, 
        padding: "40px 32px", 
        display: "flex", 
        flexDirection: "column", 
        gap: 32, 
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        borderRadius: "var(--r-xl)",
        background: "linear-gradient(180deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.95) 100%)",
        backdropFilter: "blur(24px)",
        animation: "blurSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      }}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ 
          width: 120, 
          height: 120, 
          borderRadius: 24, 
          background: "rgba(255,0,0,0.05)",
          border: "1px solid rgba(255,0,0,0.1)",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          boxShadow: "0 0 30px rgba(255,0,0,0.1)",
        }}>
          <img src="/logo.svg" alt="Strix Logo" style={{ width: 90, height: 90, objectFit: "contain" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Welcome to Strix</h1>
          <p style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 4 }}>Sign in to continue to your dashboard</p>
        </div>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field" style={{ animation: "blurSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards", opacity: 0 }}>
          <label className="field-label" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>Username</label>
          <div style={{ position: "relative" }}>
            <User size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)", pointerEvents: "none" }} />
            <input
              className="field-input"
              style={{ width: "100%", paddingLeft: 42, height: 44, fontSize: 15, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-md)", transition: "all 0.2s" }}
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>
        </div>

        <div className="field" style={{ animation: "blurSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards", opacity: 0 }}>
          <label className="field-label" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>Password</label>
          <div style={{ position: "relative" }}>
            <Lock size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)", pointerEvents: "none" }} />
            <input
              className="field-input"
              style={{ width: "100%", paddingLeft: 42, paddingRight: 42, height: 44, fontSize: 15, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-md)", transition: "all 0.2s" }}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--fg-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                borderRadius: 4,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-3)")}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            animation: "blurSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            padding: "12px 16px", 
            background: "var(--sev-critical-bg)", 
            border: "1px solid var(--sev-critical-bd)", 
            borderRadius: "var(--r)", 
            fontSize: 13, 
            color: "var(--sev-critical)", 
            textAlign: "center" 
          }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          style={{ 
            animation: "blurSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards", opacity: 0,
            width: "100%", 
            height: 44,
            justifyContent: "center", 
            marginTop: 4,
            fontSize: 15,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(255,255,255,0.1)",
            transition: "all 0.2s"
          }} 
          disabled={loading}
        >
          {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Authenticating...</> : "Sign In"}
        </button>
      </form>

      <div style={{ animation: "blurSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards", opacity: 0, textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>
        Don't have an account? <Link href="/register" style={{ color: "var(--fg)", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--sev-high)"} onMouseOut={e => e.currentTarget.style.color="var(--fg)"}>Sign up</Link>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blurSlideIn {
          0% { opacity: 0; filter: blur(20px); transform: scale(0.9) translateY(30px) rotateX(-10deg); }
          100% { opacity: 1; filter: blur(0px); transform: scale(1) translateY(0) rotateX(0deg); }
        }
        .field-input:focus {
          border-color: rgba(255,255,255,0.3) !important;
          box-shadow: 0 0 0 3px rgba(255,255,255,0.05) !important;
          background: rgba(0,0,0,0.4) !important;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255,255,255,0.15);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
      `}} />
    </div>
  );
}

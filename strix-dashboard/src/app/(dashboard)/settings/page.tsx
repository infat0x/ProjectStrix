"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Key,
  Bot,
  BellRing,
  Settings2,
  Shield,
  Network,
  Lock,
  Activity,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  Sliders,
  Server,
  Cpu,
  Database,
  Globe,
  Download,
  Upload,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Terminal,
  Zap,
  Info
} from "lucide-react";

// Tab Navigation Structure
const TABS = [
  { id: "api",           label: "LLM & Inference",     icon: Key,       desc: "Cloud providers & local LLM studio" },
  { id: "agent",         label: "Agent Behavior",       icon: Bot,       desc: "Heuristics, turn budgets & headers" },
  { id: "scope",         label: "Scope & Governance",   icon: Network,   desc: "Target boundaries & egress proxy" },
  { id: "notifications", label: "Alerts & Webhooks",    icon: BellRing,  desc: "Slack, Discord & Telegram feeds" },
  { id: "security",      label: "Account & Password",   icon: Lock,      desc: "Credentials, sessions & encryption" },
  { id: "preferences",   label: "Data & Preferences",   icon: Settings2, desc: "Default scan modes & backups" },
  { id: "diagnostics",   label: "System Diagnostics",   icon: Activity,  desc: "Daemon health, engine & database" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("api");
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("Configuration saved successfully");

  // User & Profile State
  const [userProfile, setUserProfile] = useState<{
    id?: string;
    username?: string;
    role?: string;
    createdAt?: string;
    configuredKeysCount?: number;
    scansCount?: number;
  }>({});

  // System Diagnostics State
  const [healthData, setHealthData] = useState<{
    strixInstalled?: boolean;
    runsDirExists?: boolean;
    scanCount?: number;
    runningScanCount?: number;
    uptimeSeconds?: number;
  }>({});
  const [healthLoading, setHealthLoading] = useState(false);

  // API Keys State
  const [keys, setKeys] = useState({
    openai: "",
    anthropic: "",
    gemini: "",
    deepseek: "",
    groq: "",
    openrouter: "",
    mistral: "",
    cohere: "",
    dashscope: "",
    moonshot: "",
    vertex_ai: ""
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [providerSearch, setProviderSearch] = useState("");

  // Total configured keys count
  const configuredCount = useMemo(() => {
    return Object.values(keys).filter(k => typeof k === "string" && k.trim().length > 0).length;
  }, [keys]);

  // Custom Models State
  const [customModels, setCustomModels] = useState<{
    value: string;
    label: string;
    url?: string;
    apiKey?: string;
    testStatus?: "idle" | "loading" | "success" | "error";
    testMsg?: string;
  }[]>([]);

  // Agent Behavior State
  const [agentConfig, setAgentConfig] = useState({
    aggressiveness: 50,
    maxThreads: 4,
    requestDelayMs: 0,
    maxTurnsBudget: 30,
    exploitVerificationMode: "safe_poc", // safe_poc | active_replay
    crawlDepth: 3,
    customUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) StrixPentest/2.4",
    customHeaders: "X-Pentest-Authorization: Strix-Autonomous-Audit\nX-Security-Scanner: ProjectStrix-Active"
  });

  // Scope & Network Governance State
  const [scopeConfig, setScopeConfig] = useState({
    allowedCidrs: "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16",
    excludedDomains: "*.gov, *.mil, *.bank, *.internal.corp",
    proxyUrl: "",
    strictSsrfBlock: true,
    dnsResolvers: "1.1.1.1, 8.8.8.8"
  });

  // Notification Config State
  const [notificationConfig, setNotificationConfig] = useState({
    slackBotToken: "",
    slackChannelId: "",
    discordWebhookUrl: "",
    telegramBotToken: "",
    telegramChatId: "",
    notifyOnStart: false,
    notifyOnFinish: true,
    notifyOnlyHighCritical: false,
    dailyDigest: false
  });

  // Webhook Testing State
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    platform: string;
    success: boolean;
    msg: string;
  } | null>(null);

  // Preferences State
  const [preferencesConfig, setPreferencesConfig] = useState({
    theme: "dark",
    defaultModel: "openai/gpt-4o",
    defaultScanMode: "standard",
    autoDeleteDays: 0
  });

  // Password Change Form State
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Load Initial Settings & Keys
  useEffect(() => {
    // 1. Load API keys
    fetch("/api/user/keys")
      .then(r => r.json())
      .then(data => {
        if (!data.error && Object.keys(data).length > 0) {
          setKeys(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    // 2. Load User Profile
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserProfile(data.user);
        }
      })
      .catch(() => {});

    // 3. Load Settings & Custom Models
    fetch("/api/user/settings")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          if (data.settings) {
            setAgentConfig(prev => ({
              ...prev,
              aggressiveness: data.settings.aggressiveness ?? 50,
              maxThreads: data.settings.maxThreads ?? 4
            }));
            setNotificationConfig(prev => ({
              ...prev,
              slackBotToken: data.settings.slackBotToken || "",
              slackChannelId: data.settings.slackChannelId || "",
              discordWebhookUrl: data.settings.discordWebhookUrl || "",
              telegramBotToken: data.settings.telegramBotToken || "",
              telegramChatId: data.settings.telegramChatId || "",
              notifyOnStart: !!data.settings.notifyOnStart,
              notifyOnFinish: !!data.settings.notifyOnFinish
            }));
            setPreferencesConfig(prev => ({
              ...prev,
              theme: data.settings.theme || "dark",
              defaultModel: data.settings.defaultModel || "openai/gpt-4o",
              autoDeleteDays: data.settings.autoDeleteDays || 0
            }));
          }
          if (data.customModels) {
            setCustomModels(data.customModels.map((m: any) => ({
              value: m.value,
              label: m.label,
              url: m.url || "",
              apiKey: m.apiKey || ""
            })));
          }
        }
      })
      .catch(() => {});

    // 4. Load Scope & Agent client preferences from localStorage if present
    try {
      const savedScope = localStorage.getItem("strix_scope_governance");
      if (savedScope) setScopeConfig(prev => ({ ...prev, ...JSON.parse(savedScope) }));
      const savedAgentAdv = localStorage.getItem("strix_agent_advanced");
      if (savedAgentAdv) setAgentConfig(prev => ({ ...prev, ...JSON.parse(savedAgentAdv) }));
    } catch {}
  }, []);

  // Fetch Diagnostics
  const fetchDiagnostics = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {}
    setHealthLoading(false);
  };

  useEffect(() => {
    if (activeTab === "diagnostics") {
      fetchDiagnostics();
    }
  }, [activeTab]);

  // Save Handlers
  const handleSave = async (tab: string) => {
    if (tab === "api") {
      await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys)
      });
      const validModels = customModels.filter(m => m.value.trim() && m.label.trim());
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "customModels", data: validModels })
      });
      setSaveMsg("API keys and custom models updated");
    } else if (tab === "agent") {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: { aggressiveness: agentConfig.aggressiveness, maxThreads: agentConfig.maxThreads }
        })
      });
      try {
        localStorage.setItem("strix_agent_advanced", JSON.stringify(agentConfig));
      } catch {}
      setSaveMsg("Agent behavior and heuristics updated");
    } else if (tab === "scope") {
      try {
        localStorage.setItem("strix_scope_governance", JSON.stringify(scopeConfig));
      } catch {}
      setSaveMsg("Network boundaries and scope governance saved");
    } else if (tab === "notifications") {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: notificationConfig
        })
      });
      setSaveMsg("Alert channels and webhooks saved");
    } else if (tab === "preferences") {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: preferencesConfig
        })
      });
      setSaveMsg("Global preferences updated");
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Test Custom Model
  const handleTestModel = async (index: number, modelValue: string, modelUrl?: string, modelApiKey?: string) => {
    if (!modelValue) return;

    setCustomModels(prev => {
      const newModels = [...prev];
      newModels[index] = { ...newModels[index], testStatus: "loading" };
      return newModels;
    });

    try {
      const res = await fetch("/api/user/settings/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelValue, keys, url: modelUrl, apiKey: modelApiKey })
      });
      const data = await res.json();

      setCustomModels(prev => {
        const newModels = [...prev];
        if (data.success) {
          newModels[index] = { ...newModels[index], testStatus: "success", testMsg: data.message };
        } else {
          newModels[index] = { ...newModels[index], testStatus: "error", testMsg: data.error || "Failed to test" };
        }
        return newModels;
      });

      if (data.success) {
        handleSave("api");
      }
    } catch {
      setCustomModels(prev => {
        const newModels = [...prev];
        newModels[index] = { ...newModels[index], testStatus: "error", testMsg: "Network error" };
        return newModels;
      });
    }
  };

  // Test Webhook
  const handleTestWebhook = async (platform: "discord" | "telegram" | "slack") => {
    setTestingWebhook(platform);
    setWebhookTestResult(null);

    try {
      const res = await fetch("/api/user/settings/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, config: notificationConfig })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setWebhookTestResult({ platform, success: true, msg: data.message });
      } else {
        setWebhookTestResult({ platform, success: false, msg: data.error || "Webhook test failed" });
      }
    } catch (e: any) {
      setWebhookTestResult({ platform, success: false, msg: `Network request error: ${e.message}` });
    }

    setTestingWebhook(null);
  };

  // Password Change Submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError("All fields are required.");
      return;
    }

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New password and confirmation do not match.");
      return;
    }

    if (pwForm.newPassword.length < 12) {
      setPwError("New password must be at least 12 characters.");
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm)
      });
      const data = await res.json();

      if (res.ok) {
        setPwSuccess("Password successfully changed! Your credentials are updated.");
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPwError(data.error || "Failed to update password.");
      }
    } catch {
      setPwError("Network connection error. Try again.");
    }
    setPwSubmitting(false);
  };

  // Quick Presets for Custom Models
  const applyModelPreset = (preset: "ollama" | "vllm" | "lmstudio" | "azure") => {
    if (preset === "ollama") {
      setCustomModels(prev => [
        ...prev,
        { value: "ollama/llama3.3", label: "Ollama Llama 3.3 (Local)", url: "http://localhost:11434" }
      ]);
    } else if (preset === "vllm") {
      setCustomModels(prev => [
        ...prev,
        { value: "openai/vllm-deepseek", label: "vLLM High-Speed Cluster", url: "http://localhost:8000/v1" }
      ]);
    } else if (preset === "lmstudio") {
      setCustomModels(prev => [
        ...prev,
        { value: "openai/local-qwen", label: "LM Studio Local Workstation", url: "http://localhost:1234/v1" }
      ]);
    } else if (preset === "azure") {
      setCustomModels(prev => [
        ...prev,
        { value: "azure/gpt-4o-deployment", label: "Azure OpenAI Enterprise", url: "https://my-resource.openai.azure.com" }
      ]);
    }
  };

  // Provider Definitions Grouped
  const PROVIDER_GROUPS = useMemo(() => [
    {
      group: "Frontier Reasoning Engines",
      desc: "Top-tier models for deep architectural analysis, zero-day reasoning, and complex logic flaws.",
      items: [
        { key: "openai",    label: "OpenAI API Key",        placeholder: "sk-proj-…",      doc: "https://platform.openai.com/api-keys", hint: "GPT-4o, o1, o3-mini models" },
        { key: "anthropic", label: "Anthropic API Key",     placeholder: "sk-ant-api03-…", doc: "https://console.anthropic.com/settings/keys", hint: "Claude 3.5 Sonnet & Claude 3.7 reasoning" },
        { key: "gemini",    label: "Google Gemini API Key", placeholder: "AIzaSy…",        doc: "https://aistudio.google.com/app/apikey", hint: "Gemini 2.5 Pro multimodal DOM parsing" }
      ]
    },
    {
      group: "High-Throughput & Open-Weights",
      desc: "Ultra-fast inference engines ideal for rapid directory fuzzing and high-concurrency reconnaissance.",
      items: [
        { key: "deepseek",  label: "DeepSeek API Key",      placeholder: "sk-…",           doc: "https://platform.deepseek.com/api_keys", hint: "DeepSeek-V3 & DeepSeek-Coder" },
        { key: "groq",      label: "Groq Cloud API Key",    placeholder: "gsk_…",          doc: "https://console.groq.com/keys", hint: "Sub-second Llama 3.3 70B inference" },
        { key: "mistral",   label: "Mistral AI API Key",    placeholder: "…",              doc: "https://console.mistral.ai/api-keys", hint: "Mistral Large 2 & Codestral" },
        { key: "cohere",    label: "Cohere API Key",        placeholder: "…",              doc: "https://dashboard.cohere.com/api-keys", hint: "Command R+ enterprise models" }
      ]
    },
    {
      group: "Aggregators & Enterprise Gateways",
      desc: "Unified gateways for routing requests across dozens of distributed AI providers.",
      items: [
        { key: "openrouter", label: "OpenRouter Key",       placeholder: "sk-or-v1-…",     doc: "https://openrouter.ai/keys", hint: "Unified access to 200+ models" },
        { key: "vertex_ai",  label: "Google Vertex AI Key", placeholder: "…",              doc: "https://cloud.google.com/vertex-ai", hint: "Enterprise Google Cloud IAM" },
        { key: "dashscope",  label: "Alibaba DashScope Key",placeholder: "sk-…",           doc: "https://dashscope.console.aliyun.com/", hint: "Qwen 2.5 Max & Plus models" },
        { key: "moonshot",   label: "Moonshot AI Key",      placeholder: "sk-…",           doc: "https://platform.moonshot.cn/", hint: "Kimi long-context models" }
      ]
    }
  ], []);

  // Filtered providers based on search
  const filteredGroups = useMemo(() => {
    if (!providerSearch.trim()) return PROVIDER_GROUPS;
    const q = providerSearch.toLowerCase();
    return PROVIDER_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(i => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q) || i.key.toLowerCase().includes(q))
    })).filter(g => g.items.length > 0);
  }, [PROVIDER_GROUPS, providerSearch]);

  return (
    <div className="page" style={{ minHeight: "100%", maxWidth: 1280, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top Banner Header */}
      <div className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="tag" style={{ background: "var(--bg-2)", border: "1px solid var(--border-md)", color: "var(--fg-2)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Platform Governance
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>AES-256-GCM Keystore · Zero-Trust Encryption</span>
          </div>
          <h1 className="page-heading">Platform Settings & Orchestration</h1>
          <p className="page-desc">
            Configure inference engines, heuristic autonomous agent thresholds, network perimeter boundaries, and SIEM alert webhooks.
          </p>
        </div>

        {/* User Badge & Save Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {saved && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "var(--sev-low-bg)",
              border: "1px solid var(--sev-low-bd)",
              borderRadius: "var(--r)",
              color: "var(--sev-low)",
              fontSize: 12,
              fontWeight: 500
            }}>
              <CheckCircle2 size={14} /> {saveMsg}
            </div>
          )}

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            background: "var(--bg-1)",
            border: "1px solid var(--border-md)",
            borderRadius: "var(--r)",
            fontSize: 12
          }}>
            <span style={{ color: "var(--fg-3)" }}>Operator:</span>
            <strong style={{ color: "var(--fg)" }}>{userProfile.username || "Admin"}</strong>
            <span className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>{userProfile.role || "ADMIN"}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 10,
        marginBottom: 20,
        borderBottom: "1px solid var(--border)",
        scrollbarWidth: "none"
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: "var(--r)",
                border: `1px solid ${isActive ? "var(--border-hi)" : "transparent"}`,
                background: isActive ? "var(--bg-3)" : "transparent",
                color: isActive ? "var(--fg)" : "var(--fg-3)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
              onMouseOver={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--fg)";
                  e.currentTarget.style.background = "var(--bg-2)";
                }
              }}
              onMouseOut={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--fg-3)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={15} style={{ opacity: isActive ? 1 : 0.7 }} />
              <span>{label}</span>
              {id === "api" && configuredCount > 0 && (
                <span style={{
                  fontSize: 10.5,
                  padding: "1px 7px",
                  borderRadius: 10,
                  background: isActive ? "var(--sev-low-bg)" : "var(--bg-2)",
                  color: isActive ? "var(--sev-low)" : "var(--fg-3)",
                  border: `1px solid ${isActive ? "var(--sev-low-bd)" : "var(--border)"}`
                }}>
                  {configuredCount} Active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Full-Width Settings Panels */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* ============================================================== */}
        {/* TAB 1: LLM & INFERENCE ENGINES */}
        {/* ============================================================== */}
        {activeTab === "api" && (
          <>
            {/* Filter Bar & Header */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    LLM Provider Credentials
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Configure reasoning engines for autonomous pentesting, zero-day discovery, and verification.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Filter providers (e.g. OpenAI, DeepSeek)..."
                    value={providerSearch}
                    onChange={e => setProviderSearch(e.target.value)}
                    style={{
                      height: 38,
                      padding: "0 12px",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-md)",
                      borderRadius: "var(--r)",
                      fontSize: 12.5,
                      color: "var(--fg)",
                      width: 260,
                      outline: "none"
                    }}
                  />
                  <button className="btn-primary" onClick={() => handleSave("api")} style={{ height: 38, padding: "0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Save size={14} /> Save Keys
                  </button>
                </div>
              </div>
            </div>

            {/* Providers Grid */}
            {filteredGroups.map(grp => (
              <div key={grp.group} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", margin: 0 }}>{grp.group}</h3>
                  <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{grp.desc}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 }}>
                  {grp.items.map(item => {
                    const val = keys[item.key as keyof typeof keys] || "";
                    const isConfigured = val.trim().length > 0;
                    const isRevealed = !!showKeys[item.key];

                    return (
                      <div
                        key={item.key}
                        style={{
                          background: "var(--bg-2)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r)",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>{item.label}</label>
                            <a
                              href={item.doc}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--fg-3)", display: "flex", alignItems: "center" }}
                              title="Get API Key from official console"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>

                          <span style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--r-sm)",
                            background: isConfigured ? "var(--sev-low-bg)" : "var(--bg-3)",
                            color: isConfigured ? "var(--sev-low)" : "var(--fg-3)",
                            border: `1px solid ${isConfigured ? "var(--sev-low-bd)" : "var(--border)"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 5
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: isConfigured ? "var(--sev-low)" : "var(--fg-3)" }} />
                            {isConfigured ? "Configured" : "Not Set"}
                          </span>
                        </div>

                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={isRevealed ? "text" : "password"}
                            placeholder={item.placeholder}
                            value={val}
                            onChange={e => setKeys({ ...keys, [item.key]: e.target.value })}
                            style={{
                              width: "100%",
                              height: 40,
                              padding: "0 40px 0 12px",
                              background: "var(--bg-1)",
                              border: "1px solid var(--border-md)",
                              borderRadius: "var(--r)",
                              color: "var(--fg)",
                              fontSize: 13,
                              fontFamily: "var(--font-mono)",
                              outline: "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            style={{
                              position: "absolute",
                              right: 6,
                              width: 30,
                              height: 30,
                              background: "transparent",
                              border: "none",
                              color: "var(--fg-3)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "var(--r-sm)"
                            }}
                            title={isRevealed ? "Hide key" : "Reveal key"}
                          >
                            {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--fg-3)" }}>
                          <span>{item.hint}</span>
                          {isConfigured && (
                            <button
                              onClick={() => setKeys({ ...keys, [item.key]: "" })}
                              style={{ background: "transparent", border: "none", color: "var(--sev-critical)", cursor: "pointer", fontSize: 11.5 }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

              {/* Custom Models & Local LLM Studio */}
              <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                      Custom Models & Local LLM Endpoints
                    </h3>
                    <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                      Connect private fine-tuned models, local Ollama, vLLM, or LM Studio instances without cloud egress.
                    </span>
                  </div>

                  {/* Preset Template Triggers */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Quick Presets:</span>
                    <button onClick={() => applyModelPreset("ollama")} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>
                      + Ollama
                    </button>
                    <button onClick={() => applyModelPreset("vllm")} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>
                      + vLLM
                    </button>
                    <button onClick={() => applyModelPreset("lmstudio")} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>
                      + LM Studio
                    </button>
                    <button onClick={() => applyModelPreset("azure")} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>
                      + Azure
                    </button>
                  </div>
                </div>

                {/* Models List */}
                {customModels.length === 0 ? (
                  <div className="empty-state" style={{ padding: "28px 16px", background: "var(--bg-2)", borderRadius: "var(--r)", border: "1px dashed var(--border)" }}>
                    <Bot size={28} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 12.5, margin: 0 }}>No custom or local endpoints configured yet.</p>
                    <button
                      className="btn-secondary"
                      onClick={() => setCustomModels([...customModels, { value: "", label: "", url: "", apiKey: "" }])}
                      style={{ fontSize: 12 }}
                    >
                      <Plus size={13} /> Add Custom Model
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {customModels.map((model, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--bg-2)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r)",
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.5fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>Model ID (LiteLLM Format)</label>
                            <input
                              placeholder="e.g. ollama/llama3.3"
                              value={model.value}
                              onChange={e => {
                                const next = [...customModels];
                                next[i].value = e.target.value;
                                setCustomModels(next);
                              }}
                              style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>Display Label</label>
                            <input
                              placeholder="e.g. Local Llama 3.3"
                              value={model.label}
                              onChange={e => {
                                const next = [...customModels];
                                next[i].label = e.target.value;
                                setCustomModels(next);
                              }}
                              style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>Endpoint URL (Optional)</label>
                            <input
                              placeholder="e.g. http://localhost:11434"
                              value={model.url || ""}
                              onChange={e => {
                                const next = [...customModels];
                                next[i].url = e.target.value;
                                setCustomModels(next);
                              }}
                              style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 5 }}>API Key (Optional)</label>
                            <input
                              type="password"
                              placeholder="Bearer token..."
                              value={model.apiKey || ""}
                              onChange={e => {
                                const next = [...customModels];
                                next[i].apiKey = e.target.value;
                                setCustomModels(next);
                              }}
                              style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                            />
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 11.5 }}
                              onClick={() => handleTestModel(i, model.value, model.url, model.apiKey)}
                              disabled={model.testStatus === "loading"}
                            >
                              {model.testStatus === "loading" ? "Testing Ping..." : "Verify Connectivity"}
                            </button>

                            {model.testStatus === "success" && (
                              <span style={{ fontSize: 11, color: "var(--sev-low)", display: "flex", alignItems: "center", gap: 4 }}>
                                <CheckCircle2 size={12} /> Response: {model.testMsg || "Connected"}
                              </span>
                            )}
                            {model.testStatus === "error" && (
                              <span style={{ fontSize: 11, color: "var(--sev-critical)", display: "flex", alignItems: "center", gap: 4 }}>
                                <AlertCircle size={12} /> {model.testMsg || "Endpoint unreachable"}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => setCustomModels(customModels.filter((_, idx) => idx !== i))}
                            style={{ background: "transparent", border: "none", color: "var(--sev-critical)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      className="btn-secondary"
                      style={{ alignSelf: "flex-start", fontSize: 12 }}
                      onClick={() => setCustomModels([...customModels, { value: "", label: "", url: "", apiKey: "" }])}
                    >
                      <Plus size={13} /> Add Another Model
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 2: AUTONOMOUS AGENT BEHAVIOR & HEURISTICS */}
          {/* ============================================================== */}
          {activeTab === "agent" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    Autonomous Agent Heuristics & Execution Policy
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Configure the aggressiveness, concurrency limits, and containment policies for AI scanning workers.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => handleSave("agent")}>
                  <Save size={13} /> Save Agent Policy
                </button>
              </div>

              {/* Slider 1: Aggressiveness */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Exploitation Aggressiveness</span>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                      {agentConfig.aggressiveness <= 25 ? "Level 1: Passive Reconnaissance & Read-Only Probe" :
                       agentConfig.aggressiveness <= 50 ? "Level 2: Standard Pentest (Non-destructive validation)" :
                       agentConfig.aggressiveness <= 75 ? "Level 3: Deep Heuristic Fuzzing & SQLi/XSS Probes" :
                       "Level 4: High Intrusiveness (Privilege escalation & active bypasses)"}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                    {agentConfig.aggressiveness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={agentConfig.aggressiveness}
                  onChange={e => setAgentConfig({ ...agentConfig, aggressiveness: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
                />
              </div>

              {/* Sliders Grid: Concurrency & Delay */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>Max Concurrent Threads</span>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Parallel sub-agents spawned for reconnaissance</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                      {agentConfig.maxThreads} Workers
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1} max={16} step={1}
                    value={agentConfig.maxThreads}
                    onChange={e => setAgentConfig({ ...agentConfig, maxThreads: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>Probe Delay (Rate Throttling)</span>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Interval between HTTP payloads to prevent WAF bans</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                      {agentConfig.requestDelayMs} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0} max={2000} step={50}
                    value={agentConfig.requestDelayMs}
                    onChange={e => setAgentConfig({ ...agentConfig, requestDelayMs: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Turn Budget & Exploit Verification */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Max Reasoning Turn Budget
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Maximum LLM iterations allocated per scan before force-terminating analysis.
                  </p>
                  <select
                    value={agentConfig.maxTurnsBudget}
                    onChange={e => setAgentConfig({ ...agentConfig, maxTurnsBudget: Number(e.target.value) })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  >
                    <option value={15}>15 Turns (Quick Audit)</option>
                    <option value={30}>30 Turns (Standard Benchmark)</option>
                    <option value={50}>50 Turns (Deep Exhaustive Recon)</option>
                    <option value={100}>100 Turns (Zero-Day Research)</option>
                  </select>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Exploit Proof-of-Concept Mode
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Controls whether the agent executes live payloads or only builds theoretical PoCs.
                  </p>
                  <select
                    value={agentConfig.exploitVerificationMode}
                    onChange={e => setAgentConfig({ ...agentConfig, exploitVerificationMode: e.target.value })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  >
                    <option value="safe_poc">Safe PoC Only (Non-destructive validation)</option>
                    <option value="active_replay">Active Replay (Execute live payload verification)</option>
                  </select>
                </div>
              </div>

              {/* Custom User Agent & Injected Headers */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Custom Client User-Agent
                  </label>
                  <input
                    value={agentConfig.customUserAgent}
                    onChange={e => setAgentConfig({ ...agentConfig, customUserAgent: e.target.value })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, display: "block" }}>
                    Sent with all reconnaissance browser and HTTP API probe requests.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Global Authorization Headers (Injected on all requests)
                  </label>
                  <textarea
                    rows={3}
                    value={agentConfig.customHeaders}
                    onChange={e => setAgentConfig({ ...agentConfig, customHeaders: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", resize: "vertical", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, display: "block" }}>
                    Format: Header-Name: Value (one per line). Ideal for bug bounty authorization tokens or staging bypass cookies.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: NETWORK SCOPE & TARGET GOVERNANCE */}
          {/* ============================================================== */}
          {activeTab === "scope" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    Scope Boundaries & Network Governance
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Strict perimeter rules preventing autonomous agents from touching out-of-scope or sensitive infrastructure.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => handleSave("scope")}>
                  <Save size={13} /> Save Scope Rules
                </button>
              </div>

              {/* Allowed vs Disallowed */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    In-Scope Subnets & CIDR Ranges
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Comma-separated IP subnets authorized for automated reconnaissance.
                  </p>
                  <textarea
                    rows={3}
                    value={scopeConfig.allowedCidrs}
                    onChange={e => setScopeConfig({ ...scopeConfig, allowedCidrs: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", minHeight: 80, background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                  />
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--sev-critical)", marginBottom: 4 }}>
                    Out-of-Scope Blacklist (Strict Exclusion)
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Wildcards and hostnames the agent will instantly refuse to target.
                  </p>
                  <textarea
                    rows={3}
                    value={scopeConfig.excludedDomains}
                    onChange={e => setScopeConfig({ ...scopeConfig, excludedDomains: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", minHeight: 80, background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                  />
                </div>
              </div>

              {/* Egress Proxy & DNS */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Egress Proxy & Upstream Routing</h3>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>
                    Upstream HTTP / SOCKS5 Proxy
                  </label>
                  <input
                    placeholder="e.g. http://127.0.0.1:8080 or socks5://proxy.corp.internal:1080"
                    value={scopeConfig.proxyUrl}
                    onChange={e => setScopeConfig({ ...scopeConfig, proxyUrl: e.target.value })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, display: "block" }}>
                    Routes all scan traffic through an inspection proxy (e.g. Burp Suite Professional, OWASP ZAP, or corporate egress NAT).
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
                  <input
                    type="checkbox"
                    id="strictSsrf"
                    checked={scopeConfig.strictSsrfBlock}
                    onChange={e => setScopeConfig({ ...scopeConfig, strictSsrfBlock: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                  <div>
                    <label htmlFor="strictSsrf" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", cursor: "pointer" }}>
                      Enforce Strict SSRF & RFC 1918 Guard (<code style={{ fontSize: 11 }}>urlGuard.ts</code>)
                    </label>
                    <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                      Automatically blocks attacks against loopback (`127.0.0.1`), metadata endpoints (`169.254.169.254`), and private LANs unless whitelisted.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: ALERTS, SIEM & WEBHOOK INTEGRATIONS */}
          {/* ============================================================== */}
          {activeTab === "notifications" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    Security Feeds, SIEM & Webhook Alerts
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Deliver instant notifications to your incident response channels on Slack, Discord, and Telegram.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => handleSave("notifications")}>
                  <Save size={13} /> Save Webhooks
                </button>
              </div>

              {/* Status banner for webhook test */}
              {webhookTestResult && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "var(--r-sm)",
                  background: webhookTestResult.success ? "var(--sev-low-bg)" : "var(--sev-critical-bg)",
                  border: `1px solid ${webhookTestResult.success ? "var(--sev-low-bd)" : "var(--sev-critical-bd)"}`,
                  color: webhookTestResult.success ? "var(--sev-low)" : "var(--sev-critical)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  {webhookTestResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span><strong>{webhookTestResult.platform.toUpperCase()}:</strong> {webhookTestResult.msg}</span>
                </div>
              )}

              {/* Discord Card */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: notificationConfig.discordWebhookUrl ? "var(--sev-low)" : "var(--fg-3)" }} />
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Discord Webhook Integration</h3>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                    disabled={!notificationConfig.discordWebhookUrl || testingWebhook === "discord"}
                    onClick={() => handleTestWebhook("discord")}
                  >
                    {testingWebhook === "discord" ? "Sending Embed..." : "Send Test Embed"}
                  </button>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Webhook URL</label>
                  <input
                    type="password"
                    placeholder="https://discord.com/api/webhooks/123.../abc..."
                    value={notificationConfig.discordWebhookUrl}
                    onChange={e => setNotificationConfig({ ...notificationConfig, discordWebhookUrl: e.target.value })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, display: "block" }}>
                    Posts formatted vulnerability embeds directly into your designated Discord triage channel.
                  </span>
                </div>
              </div>

              {/* Telegram Card */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: notificationConfig.telegramBotToken && notificationConfig.telegramChatId ? "var(--sev-low)" : "var(--fg-3)" }} />
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Telegram Bot Integration</h3>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                    disabled={!notificationConfig.telegramBotToken || !notificationConfig.telegramChatId || testingWebhook === "telegram"}
                    onClick={() => handleTestWebhook("telegram")}
                  >
                    {testingWebhook === "telegram" ? "Sending..." : "Send Test Message"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Bot Token (@BotFather)</label>
                    <input
                      type="password"
                      placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                      value={notificationConfig.telegramBotToken}
                      onChange={e => setNotificationConfig({ ...notificationConfig, telegramBotToken: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Chat ID or Channel ID</label>
                    <input
                      placeholder="e.g. -1001234567890 or 987654321"
                      value={notificationConfig.telegramChatId}
                      onChange={e => setNotificationConfig({ ...notificationConfig, telegramChatId: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Slack Card */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: notificationConfig.slackBotToken && notificationConfig.slackChannelId ? "var(--sev-low)" : "var(--fg-3)" }} />
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Slack Bot Integration</h3>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                    disabled={!notificationConfig.slackBotToken || !notificationConfig.slackChannelId || testingWebhook === "slack"}
                    onClick={() => handleTestWebhook("slack")}
                  >
                    {testingWebhook === "slack" ? "Sending..." : "Send Test Message"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Bot OAuth Token (`xoxb-`)</label>
                    <input
                      type="password"
                      placeholder="xoxb-..."
                      value={notificationConfig.slackBotToken}
                      onChange={e => setNotificationConfig({ ...notificationConfig, slackBotToken: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Slack Channel ID</label>
                    <input
                      placeholder="e.g. C01234567"
                      value={notificationConfig.slackChannelId}
                      onChange={e => setNotificationConfig({ ...notificationConfig, slackChannelId: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Granular Trigger Toggles */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Alert Delivery Triggers</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={notificationConfig.notifyOnStart}
                      onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnStart: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "var(--fg)" }}
                    />
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>Scan Initiation Alert</span>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Dispatches when an autonomous agent boots</div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={notificationConfig.notifyOnFinish}
                      onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnFinish: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "var(--fg)" }}
                    />
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>Scan Completion Report</span>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Includes total findings & severity counts</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: ACCOUNT, SECURITY & PASSWORD ROTATION */}
          {/* ============================================================== */}
          {activeTab === "security" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                  Account Security & Credential Rotation
                </h2>
                <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                  Manage session tokens, cryptographic password policies, and role-based permissions.
                </p>
              </div>

              {/* Account Meta Card */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Active User</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>{userProfile.username || "Operator"}</div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>UUID: {userProfile.id?.slice(0, 12)}...</span>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>RBAC Role</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>{userProfile.role || "ADMIN"}</div>
                  <span style={{ fontSize: 11, color: "var(--sev-low)" }}>Full Platform Governance</span>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Total Scans Initiated</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>{userProfile.scansCount ?? 0}</div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Stored in PostgreSQL</span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handlePasswordChange} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Rotate Account Password</h3>

                {pwError && (
                  <div style={{ padding: "8px 12px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r-sm)", color: "var(--sev-critical)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} /> {pwError}
                  </div>
                )}

                {pwSuccess && (
                  <div style={{ padding: "8px 12px", background: "var(--sev-low-bg)", border: "1px solid var(--sev-low-bd)", borderRadius: "var(--r-sm)", color: "var(--sev-low)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={14} /> {pwSuccess}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={pwForm.currentPassword}
                      onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>New Password (min 12 chars)</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={pwForm.newPassword}
                      onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={pwForm.confirmPassword}
                      onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    Policy: At least 12 characters, uppercase, lowercase, and numbers.
                  </span>
                  <button type="submit" className="btn-primary" disabled={pwSubmitting} style={{ fontSize: 12 }}>
                    {pwSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: GLOBAL PREFERENCES & BACKUPS */}
          {/* ============================================================== */}
          {activeTab === "preferences" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    Global Workspace Preferences & Retention
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Configure default launcher presets, retention periods, and configuration exports.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => handleSave("preferences")}>
                  <Save size={13} /> Save Preferences
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Default LLM Model for New Scans
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Pre-selected model when an operator initiates a scan.
                  </p>
                  <select
                    value={preferencesConfig.defaultModel}
                    onChange={e => setPreferencesConfig({ ...preferencesConfig, defaultModel: e.target.value })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  >
                    <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                    <option value="anthropic/claude-3-5-sonnet-latest">Anthropic Claude 3.5 Sonnet</option>
                    <option value="google/gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                    <option value="deepseek/deepseek-v3">DeepSeek V3</option>
                    <option value="groq/llama-3.3-70b-versatile">Groq Llama 3.3 70B</option>
                    {customModels.map(m => (
                      <option key={m.value} value={m.value}>{m.label || m.value}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                    Automated Data Retention & Purge
                  </label>
                  <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    Automatically removes historical scan telemetry and logs to conserve disk.
                  </p>
                  <select
                    value={preferencesConfig.autoDeleteDays}
                    onChange={e => setPreferencesConfig({ ...preferencesConfig, autoDeleteDays: Number(e.target.value) })}
                    style={{ width: "100%", height: 38, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--border-md)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  >
                    <option value={0}>Never Auto-Delete (Retain indefinitely)</option>
                    <option value={7}>Auto-purge after 7 Days</option>
                    <option value={30}>Auto-purge after 30 Days</option>
                    <option value={90}>Auto-purge after 90 Days</option>
                  </select>
                </div>
              </div>

              {/* Data Backup & Export Studio */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Data Export & Configuration Backup</h3>
                <p style={{ fontSize: 11.5, color: "var(--fg-3)", margin: 0 }}>
                  Export all discovered assets, scans, and system settings as JSON backup archives.
                </p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const backupObj = {
                        agentConfig,
                        scopeConfig,
                        notificationConfig: { ...notificationConfig, slackBotToken: "", telegramBotToken: "" }, // sanitize tokens
                        preferencesConfig,
                        customModels,
                        exportedAt: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `strix_settings_backup_${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                  >
                    <Download size={13} /> Export Settings JSON Backup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: SYSTEM DIAGNOSTICS & TELEMETRY */}
          {/* ============================================================== */}
          {activeTab === "diagnostics" && (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    System Health & Engine Telemetry
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "4px 0 0" }}>
                    Live runtime statistics, embedded scheduler status, and database connectivity.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={fetchDiagnostics}
                  disabled={healthLoading}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                >
                  <RefreshCw size={12} className={healthLoading ? "spin" : ""} /> Refresh Telemetry
                </button>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Scheduler Daemon</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--sev-low)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sev-low)" }} />
                    ACTIVE
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>10s Polling Loop</span>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>PostgreSQL DB</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>CONNECTED</div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>SCRAM-SHA-256</span>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Total Run Records</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>{healthData.scanCount ?? 0}</div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>/tmp/strix_runs</span>
                </div>

                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Active Workers</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 4 }}>{healthData.runningScanCount ?? 0}</div>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Child Processes</span>
                </div>
              </div>

              {/* Environment Specifications */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", margin: 0 }}>Runtime Architecture Specs</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--fg-3)" }}>Frontend Stack:</span>
                    <span style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>Next.js 16.2 · React 19 · Turbopack</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--fg-3)" }}>Node.js Runtime:</span>
                    <span style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>Node.js 22 LTS</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--fg-3)" }}>Security Isolation:</span>
                    <span style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>Rootless Podman / Linux Bare-Metal</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--fg-3)" }}>Strix CLI Orchestrator:</span>
                    <span style={{ color: healthData.strixInstalled ? "var(--sev-low)" : "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                      {healthData.strixInstalled ? "Installed & Linked" : "Simulated / Host Linked"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

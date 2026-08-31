"use client";

import { useState, useEffect } from "react";
import { Key, Bot, BellRing, Save, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";

const TABS = [
  { id: "api",           label: "API Keys",      icon: Key },
  { id: "agent",         label: "Agent Behavior", icon: Bot },
  { id: "notifications", label: "Notifications",  icon: BellRing },
  { id: "preferences",   label: "Preferences",    icon: Settings2 },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("api");
  const [keys, setKeys] = useState({ openai: "", anthropic: "", gemini: "", deepseek: "", groq: "", openrouter: "", mistral: "", cohere: "", dashscope: "", moonshot: "", vertex_ai: "" });
  const [customModels, setCustomModels] = useState<{value: string, label: string, testStatus?: "idle" | "loading" | "success" | "error", testMsg?: string}[]>([]);
  const [agentConfig, setAgentConfig] = useState({ aggressiveness: 50, maxThreads: 4 });
  const [notificationConfig, setNotificationConfig] = useState({ slackBotToken: "", slackChannelId: "", notifyOnStart: false, notifyOnFinish: true });
  const [preferencesConfig, setPreferencesConfig] = useState({ theme: "dark", defaultModel: "openai/gpt-4o", autoDeleteDays: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/keys")
      .then(r => r.json())
      .then(data => {
        if (!data.error && Object.keys(data).length > 0) {
          setKeys(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    fetch("/api/user/settings")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          if (data.settings) {
            setAgentConfig({ aggressiveness: data.settings.aggressiveness, maxThreads: data.settings.maxThreads });
            setNotificationConfig({ slackBotToken: data.settings.slackBotToken || "", slackChannelId: data.settings.slackChannelId || "", notifyOnStart: data.settings.notifyOnStart, notifyOnFinish: data.settings.notifyOnFinish });
            setPreferencesConfig({ 
              theme: data.settings.theme || "dark", 
              defaultModel: data.settings.defaultModel || "openai/gpt-4o", 
              autoDeleteDays: data.settings.autoDeleteDays || 0 
            });
          }
          if (data.customModels) {
            setCustomModels(data.customModels.map((m: any) => ({ value: m.value, label: m.label })));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (tab: "api" | "agent" | "notifications" | "preferences") => {
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
    }
    else if (tab === "agent" || tab === "notifications" || tab === "preferences") {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: { ...agentConfig, ...notificationConfig, ...preferencesConfig }
        })
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestModel = async (index: number, modelValue: string) => {
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
        body: JSON.stringify({ model: modelValue, keys })
      });
      const data = await res.json();
      
      setCustomModels(prev => {
        const newModels = [...prev];
        if (data.success) {
          newModels[index] = { ...newModels[index], testStatus: "success", testMsg: "" };
        } else {
          newModels[index] = { ...newModels[index], testStatus: "error", testMsg: data.error || "Failed to test" };
        }
        return newModels;
      });
      
      if (data.success) {
        handleSave("api");
      }
    } catch (e) {
      setCustomModels(prev => {
        const newModels = [...prev];
        newModels[index] = { ...newModels[index], testStatus: "error", testMsg: "Network error" };
        return newModels;
      });
    }
  };

  const s: any = {
    page: { padding: 28, display: "flex", flexDirection: "column", gap: 24, height: "100%", overflowY: "auto" },
    layout: { display: "flex", gap: 20, flex: 1 },
    nav: { width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 },
    navBtn: (active: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", gap: 8, width: "100%",
      padding: "9px 12px", borderRadius: "var(--r)", border: "1px solid",
      borderColor: active ? "var(--border-md)" : "transparent",
      background: active ? "var(--bg-3)" : "none",
      color: active ? "var(--fg)" : "var(--fg-3)",
      fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)",
      cursor: "pointer", textAlign: "left", transition: "all var(--dur)",
    }),
    card: { background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden", flex: 1 },
    cardHead: { padding: "18px 20px", borderBottom: "1px solid var(--border)" },
    cardTitle: { fontSize: 14, fontWeight: 600, color: "var(--fg)" },
    cardDesc: { fontSize: 12, color: "var(--fg-3)", marginTop: 4 },
    cardBody: { padding: "20px", display: "flex", flexDirection: "column", gap: 18 },
    cardFoot: { padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 500, color: "var(--fg-2)" },
    input: {
      padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--border-md)",
      borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13,
      fontFamily: "var(--font-sans)", outline: "none",
    },
    hint: { fontSize: 11, color: "var(--fg-3)" },
    sliderWrap: { display: "flex", flexDirection: "column", gap: 8 },
    sliderRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    sliderVal: { fontSize: 14, fontWeight: 700, color: "var(--fg)", fontFamily: "var(--font-mono)" },
    sliderTrack: (pct: number): React.CSSProperties => ({
      width: "100%", height: 4, background: "var(--bg-3)", borderRadius: 2, position: "relative",
      backgroundImage: `linear-gradient(to right, var(--fg) ${pct}%, var(--bg-3) ${pct}%)`,
    }),
  };

  return (
    <div style={s.page}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--fg)" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>Configure global preferences and AI agent behavior.</p>
      </div>

      <div style={s.layout}>
        {/* Side nav */}
        <nav style={s.nav}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} style={s.navBtn(activeTab === id)} onClick={() => setActiveTab(id)}>
              <Icon size={14} />
              {label}
              {activeTab === id && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* API Keys */}
          {activeTab === "api" && (
            <>
            <div style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>API Keys</div>
                <div style={s.cardDesc}>Configure external LLM providers for autonomous analysis.</div>
              </div>
              <div style={s.cardBody}>
                {([
                  { key: "openai",     label: "OpenAI API Key",        placeholder: "sk-…",      hint: "Used for gpt-4o models during penetration testing." },
                  { key: "anthropic",  label: "Anthropic API Key",     placeholder: "sk-ant-…",  hint: "Used for claude-3.5-sonnet reasoning capabilities." },
                  { key: "gemini",     label: "Google Gemini API Key", placeholder: "AIza…",     hint: "Used for gemini-2.5-pro multimodal analysis." },
                  { key: "deepseek",   label: "DeepSeek API Key",      placeholder: "sk-…",      hint: "Used for DeepSeek v3 and DeepSeek Coder models." },
                  { key: "groq",       label: "Groq API Key",          placeholder: "gsk_…",     hint: "Used for ultra-fast Llama 3 and Mixtral models." },
                  { key: "openrouter", label: "OpenRouter API Key",    placeholder: "sk-or-…",   hint: "Used for unified access to dozens of models." },
                  { key: "mistral",    label: "Mistral API Key",       placeholder: "…",         hint: "Used for Mistral Large and other models." },
                  { key: "cohere",     label: "Cohere API Key",        placeholder: "…",         hint: "Used for Command R+ and other Cohere models." },
                  { key: "dashscope",  label: "DashScope API Key",     placeholder: "sk-…",      hint: "Used for Qwen models via Alibaba Cloud DashScope." },
                  { key: "moonshot",   label: "Moonshot API Key",      placeholder: "sk-…",      hint: "Used for Kimi models via Moonshot AI." },
                  { key: "vertex_ai",  label: "Vertex AI API Key",     placeholder: "…",         hint: "Used for Gemini models via Google Cloud Vertex AI." },
                ] as any).map(({ key, label, placeholder, hint }: any) => (
                  <div key={key} style={s.field}>
                    <label style={s.label}>{label}</label>
                    <input
                      style={s.input}
                      type="password"
                      placeholder={placeholder}
                      value={keys[key as keyof typeof keys]}
                      onChange={(e) => setKeys({ ...keys, [key]: e.target.value })}
                    />
                    <span style={s.hint}>{hint}</span>
                  </div>
                ))}
              </div>
              <div style={s.cardFoot}>
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sev-low)", marginRight: "auto" }}>
                    <CheckCircle2 size={13} /> Saved
                  </div>
                )}
                <button className="btn-primary" onClick={() => handleSave("api")}>
                  <Save size={13} /> Save Configuration
                </button>
              </div>
            </div>

            <div style={{ ...s.card, marginTop: 24 }}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Custom Models</div>
                <div style={s.cardDesc}>Add custom LiteLLM compatible models (e.g., fine-tunes, local Ollama endpoints).</div>
              </div>
              <div style={s.cardBody}>
                {customModels.map((model, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={s.label}>Model ID (LiteLLM Format)</label>
                      <input
                        style={s.input}
                        placeholder="e.g. openai/ft:gpt-4o-my-custom-model"
                        value={model.value}
                        onChange={(e) => {
                          const newModels = [...customModels];
                          newModels[i].value = e.target.value;
                          setCustomModels(newModels);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={s.label}>Display Name</label>
                      <input
                        style={s.input}
                        placeholder="e.g. My Custom GPT-4o"
                        value={model.label}
                        onChange={(e) => {
                          const newModels = [...customModels];
                          newModels[i].label = e.target.value;
                          setCustomModels(newModels);
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 22 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-secondary"
                          style={{ borderColor: "var(--border-md)", padding: "8px 12px", borderRadius: "var(--r)", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", cursor: "pointer", border: "1px solid" }}
                          onClick={() => handleTestModel(i, model.value)}
                          disabled={model.testStatus === "loading"}
                        >
                          {model.testStatus === "loading" ? "Testing..." : "Test"}
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ color: "var(--sev-critical)", borderColor: "var(--sev-critical-bd)" }}
                          onClick={() => {
                            const newModels = customModels.filter((_, idx) => idx !== i);
                            setCustomModels(newModels);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      
                      {model.testStatus === "success" && (
                        <span style={{ fontSize: 11, color: "var(--sev-low)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sev-low)", display: "inline-block" }}></span>
                          Success (Saved)
                        </span>
                      )}
                      {model.testStatus === "error" && (
                        <span style={{ fontSize: 11, color: "var(--sev-critical)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sev-critical)", display: "inline-block" }}></span>
                          {model.testMsg || "Error"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  className="btn-ghost"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => setCustomModels([...customModels, { value: "", label: "" }])}
                >
                  + Add Custom Model
                </button>
              </div>
              <div style={s.cardFoot}>
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sev-low)", marginRight: "auto" }}>
                    <CheckCircle2 size={13} /> Saved
                  </div>
                )}
                <button className="btn-primary" onClick={() => handleSave("api")}>
                  <Save size={13} /> Save Configuration
                </button>
              </div>
            </div>
          </>
          )}

          {/* Agent Behavior */}
          {activeTab === "agent" && (
            <div style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Agent Behavior</div>
                <div style={s.cardDesc}>Tune the heuristics and aggressiveness of the autonomous agent.</div>
              </div>
              <div style={s.cardBody}>
                {/* Aggressiveness */}
                <div style={s.sliderWrap}>
                  <div style={s.sliderRow}>
                    <span style={s.label}>Exploitation Aggressiveness</span>
                    <span style={s.sliderVal}>{agentConfig.aggressiveness}%</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={100} step={1}
                    value={agentConfig.aggressiveness}
                    onChange={(e) => setAgentConfig({ ...agentConfig, aggressiveness: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                  <span style={s.hint}>Higher values allow the agent to attempt more intrusive exploits and bypasses.</span>
                </div>

                {/* Max Threads */}
                <div style={s.sliderWrap}>
                  <div style={s.sliderRow}>
                    <span style={s.label}>Max Concurrent Threads</span>
                    <span style={s.sliderVal}>{agentConfig.maxThreads}</span>
                  </div>
                  <input
                    type="range"
                    min={1} max={16} step={1}
                    value={agentConfig.maxThreads}
                    onChange={(e) => setAgentConfig({ ...agentConfig, maxThreads: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                  <span style={s.hint}>Number of parallel tasks the agent can spawn during reconnaissance.</span>
                </div>
              </div>
              <div style={s.cardFoot}>
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sev-low)", marginRight: "auto" }}>
                    <CheckCircle2 size={13} /> Saved
                  </div>
                )}
                <button className="btn-primary" onClick={() => handleSave("agent")}>
                  <Save size={13} /> Save Configuration
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Webhook Notifications</div>
                <div style={s.cardDesc}>Configure webhook URLs to receive scan updates in Slack, Discord, or other services.</div>
              </div>
              <div style={s.cardBody}>
                <div style={s.field}>
                  <label style={s.label}>Slack Bot Token</label>
                  <input
                    style={s.input}
                    type="password"
                    placeholder="xoxb-..."
                    value={notificationConfig.slackBotToken}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, slackBotToken: e.target.value })}
                  />
                  <span style={s.hint}>Create a Slack App, add 'chat:write' scope, install to workspace, and paste the Bot User OAuth Token here.</span>
                </div>
                
                <div style={{...s.field, marginTop: 12}}>
                  <label style={s.label}>Slack Channel ID</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="e.g. C01234567"
                    value={notificationConfig.slackChannelId}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, slackChannelId: e.target.value })}
                  />
                  <span style={s.hint}>Right click a channel in Slack -› Copy Link. The Channel ID is the last part of the URL.</span>
                </div>
                
                <div style={{ ...s.field, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <input
                    type="checkbox"
                    id="notifyStart"
                    checked={notificationConfig.notifyOnStart}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, notifyOnStart: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                  <div>
                    <label htmlFor="notifyStart" style={{ ...s.label, marginBottom: 2, cursor: "pointer" }}>Notify on Scan Start</label>
                    <div style={s.hint}>Sends an alert when a scan begins execution.</div>
                  </div>
                </div>

                <div style={{ ...s.field, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <input
                    type="checkbox"
                    id="notifyFinish"
                    checked={notificationConfig.notifyOnFinish}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, notifyOnFinish: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: "var(--fg)", cursor: "pointer" }}
                  />
                  <div>
                    <label htmlFor="notifyFinish" style={{ ...s.label, marginBottom: 2, cursor: "pointer" }}>Notify on Scan Finish</label>
                    <div style={s.hint}>Sends an alert containing vulnerability counts and final status when a scan completes.</div>
                  </div>
                </div>
              </div>
              <div style={s.cardFoot}>
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sev-low)", marginRight: "auto" }}>
                    <CheckCircle2 size={13} /> Saved
                  </div>
                )}
                <button className="btn-primary" onClick={() => handleSave("notifications")}>
                  <Save size={13} /> Save Configuration
                </button>
              </div>
            </div>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <div style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Global Preferences</div>
                <div style={s.cardDesc}>Configure default workspace and interface settings.</div>
              </div>
              <div style={s.cardBody}>


                <div style={s.field}>
                  <label style={s.label}>Default LLM Model</label>
                  <select
                    style={s.input}
                    value={preferencesConfig.defaultModel}
                    onChange={(e) => setPreferencesConfig({ ...preferencesConfig, defaultModel: e.target.value })}
                  >
                    <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                    <option value="anthropic/claude-3-5-sonnet-latest">Anthropic Claude 3.5 Sonnet</option>
                    <option value="google/gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                    <option value="deepseek/deepseek-v3">DeepSeek v3</option>
                    <option value="groq/llama-3.3-70b-versatile">Groq Llama 3.3 70B</option>
                    <option value="openrouter/auto">OpenRouter Auto</option>
                  </select>
                  <span style={s.hint}>The standard model selected automatically when starting a new scan.</span>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Auto-Delete Scans</label>
                  <select
                    style={s.input}
                    value={preferencesConfig.autoDeleteDays}
                    onChange={(e) => setPreferencesConfig({ ...preferencesConfig, autoDeleteDays: Number(e.target.value) })}
                  >
                    <option value={0}>Never Delete</option>
                    <option value={7}>After 7 Days</option>
                    <option value={30}>After 30 Days</option>
                    <option value={90}>After 90 Days</option>
                  </select>
                  <span style={s.hint}>Scans older than this duration will be automatically deleted from the database to save space.</span>
                </div>
              </div>
              <div style={s.cardFoot}>
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sev-low)", marginRight: "auto" }}>
                    <CheckCircle2 size={13} /> Saved
                  </div>
                )}
                <button className="btn-primary" onClick={() => handleSave("preferences")}>
                  <Save size={13} /> Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

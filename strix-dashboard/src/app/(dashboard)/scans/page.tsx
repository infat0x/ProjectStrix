"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play, Trash2, Square, Folder, FolderOpen,
  Search, Plus, Loader2, Settings2, ChevronDown, ChevronRight, Clock,
  ChevronsDownUp, ChevronsUpDown
} from "lucide-react";
import { useDialog } from "@/components/DialogProvider";

interface Scan {
  id: string;
  target: string;
  scanName?: string;
  projectName?: string;
  llmModel: string;
  scanMode: string;
  status: "running" | "completed" | "failed" | "stopped" | "crawling" | "scanning" | "analyzing";
  startedAt: string;
  finishedAt: string | null;
  vulnCount: number;
  period?: "none" | "daily" | "weekly" | "monthly";
  nextRunAt?: string;
}

const LLM_MODELS = [
  // OpenAI
  { value: "openai/gpt-4o", label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/o1-preview", label: "OpenAI o1-Preview" },
  { value: "openai/gpt-5", label: "OpenAI GPT-5" },
  { value: "openai/gpt-5.3-codex", label: "OpenAI GPT-5.3 Codex" },
  { value: "openai/gpt-5.4", label: "OpenAI GPT-5.4" },
  { value: "openai/gpt-5.5", label: "OpenAI GPT-5.5" },
  { value: "openai/gpt-5.5-pro", label: "OpenAI GPT-5.5 Pro" },
  { value: "openai/gpt-5.6", label: "OpenAI GPT-5.6" },
  { value: "openai/gpt-5.6-luna", label: "OpenAI GPT-5.6 Luna" },
  { value: "openai/gpt-5.6-terra", label: "OpenAI GPT-5.6 Terra" },
  { value: "openai/gpt-5.6-sol", label: "OpenAI GPT-5.6 Sol" },
  // Anthropic
  { value: "anthropic/claude-3-5-sonnet-latest", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-5-haiku-latest", label: "Anthropic Claude 3.5 Haiku" },
  { value: "anthropic/claude-3-opus-latest", label: "Anthropic Claude 3 Opus" },
  { value: "anthropic/claude-sonnet-4-6", label: "Anthropic Claude 4.6 Sonnet" },
  { value: "anthropic/claude-opus-4-8", label: "Anthropic Claude 4.8 Opus" },
  { value: "anthropic/claude-sonnet-5", label: "Anthropic Claude 5 Sonnet" },
  { value: "anthropic/claude-opus-5", label: "Anthropic Claude 5 Opus" },
  { value: "anthropic/claude-fable-5", label: "Anthropic Claude 5 Fable" },
  // Google
  { value: "gemini/gemini-3.1-flash", label: "Google Gemini 3.1 Flash (Free)" },
  { value: "gemini/gemini-3.1-pro", label: "Google Gemini 3.1 Pro (Free)" },
  { value: "gemini/gemini-3.5-flash", label: "Google Gemini 3.5 Flash (Free)" },
  { value: "gemini/gemini-3.5-pro", label: "Google Gemini 3.5 Pro (Free)" },
  { value: "gemini/gemini-3.6-flash", label: "Google Gemini 3.6 Flash (Free)" },
  { value: "gemini/gemini-exp-1206", label: "Google Gemini Exp 1206 (Free)" },
  // Vertex AI
  { value: "vertex_ai/gemini-3.1-pro-preview", label: "Vertex AI Gemini 3.1 Pro" },
  // DeepSeek
  { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { value: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek/deepseek-v4-flash-vision-exp", label: "DeepSeek V4 Flash Vision Exp" },
  { value: "deepseek/deepseek-coder", label: "DeepSeek Coder" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek/deepseek-reasoner", label: "DeepSeek Reasoner" },
  // Groq
  { value: "groq/llama-3.3-70b-versatile", label: "Groq Llama 3.3 70B (Free)" },
  { value: "groq/llama3-70b-8192", label: "Groq Llama 3 70B (Free)" },
  { value: "groq/mixtral-8x7b-32768", label: "Groq Mixtral 8x7B (Free)" },
  { value: "groq/compound", label: "Groq Compound (Free)" },
  { value: "groq/compound-mini", label: "Groq Compound Mini (Free)" },
  { value: "groq/qwen/qwen3.6-27b", label: "Groq Qwen 3.6 27B (Free)" },
  { value: "groq/canopylabs/orpheus-arabic-saudi", label: "Groq CanopyLabs Orpheus Arabic (Saudi) (Free)" },
  { value: "groq/canopylabs/orpheus-v1-english", label: "Groq CanopyLabs Orpheus v1 English (Free)" },
  { value: "groq/meta-llama/llama-prompt-guard-2-22m", label: "Groq Meta Llama Prompt Guard 2 22M (Free)" },
  { value: "groq/meta-llama/llama-prompt-guard-2-86m", label: "Groq Meta Llama Prompt Guard 2 86M (Free)" },
  { value: "groq/openai/gpt-oss-120b", label: "Groq OpenAI GPT-OSS 120B (Free)" },
  { value: "groq/openai/gpt-oss-20b", label: "Groq OpenAI GPT-OSS 20B (Free)" },
  { value: "groq/openai/gpt-oss-safeguard-20b", label: "Groq OpenAI GPT-OSS Safeguard 20B (Free)" },
  { value: "groq/whisper-large-v3", label: "Groq Whisper Large v3 (Free)" },
  { value: "groq/whisper-large-v3-turbo", label: "Groq Whisper Large v3 Turbo (Free)" },
  // OpenRouter
  { value: "openrouter/auto", label: "OpenRouter Auto (Best Model)" },
  { value: "openrouter/free", label: "OpenRouter Free (Auto-Select Free)" },
  { value: "openrouter/anthropic/claude-3.5-sonnet", label: "OpenRouter Claude 3.5 Sonnet" },
  { value: "openrouter/meta-llama/llama-3.3-70b-instruct", label: "OpenRouter Llama 3.3 70B" },
  { value: "openrouter/qwen/qwen-2.5-72b-instruct", label: "OpenRouter Qwen 2.5 72B (Paid)" },
  { value: "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free", label: "OpenRouter Nemotron 3 Ultra 550B (Free)" },
  { value: "openrouter/inclusionai/ling-3.0-flash:free", label: "OpenRouter Ling 3.0 Flash (Free)" },
  { value: "openrouter/google/gemma-4-31b-it:free", label: "OpenRouter Gemma 4 31B (Free)" },
  { value: "openrouter/google/gemma-4-26b-a4b-it:free", label: "OpenRouter Gemma 4 26B (Free)" },
  { value: "openrouter/cohere/north-mini-code:free", label: "OpenRouter Cohere North Mini Code (Free)" },
  { value: "openrouter/openai/gpt-oss-20b:free", label: "OpenRouter GPT-OSS 20B (Free)" },
  { value: "openrouter/nvidia/nemotron-3-nano-30b-a3b:free", label: "OpenRouter Nemotron 3 Nano 30B (Free)" },
  { value: "openrouter/nvidia/nemotron-nano-12b-v2-vl:free", label: "OpenRouter Nemotron Nano 12B V2 (Free)" },
  { value: "openrouter/nvidia/nemotron-nano-9b-v2:free", label: "OpenRouter Nemotron Nano 9B (Free)" },
  { value: "openrouter/poolside/laguna-s-2.1:free", label: "OpenRouter Poolside Laguna S 2.1 (Free)" },
  { value: "openrouter/poolside/laguna-xs-2.1:free", label: "OpenRouter Poolside Laguna XS 2.1 (Free)" },
  { value: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", label: "OpenRouter Nemotron 3 Super 120B (Free)" },
  { value: "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "OpenRouter Nemotron 3 Nano Omni (Free)" },
  { value: "openrouter/nvidia/nemotron-3.5-content-safety:free", label: "OpenRouter Nemotron 3.5 Content Safety (Free)" },
  // Mistral
  { value: "mistral/mistral-large-3", label: "Mistral Large 3 (675B MoE)" },
  { value: "mistral/ministral-3-14b", label: "Ministral 3 14B (Reasoning)" },
  { value: "mistral/shieldstral-3b", label: "Shieldstral (3B)" },
  { value: "mistral/mistral-large-latest", label: "Mistral Large" },
  { value: "mistral/mistral-medium-latest", label: "Mistral Medium" },
  { value: "mistral/mistral-small-latest", label: "Mistral Small" },
  { value: "mistral/open-mixtral-8x22b", label: "Mistral 8x22B" },
  { value: "mistral/open-mixtral-8x7b", label: "Mistral 8x7B" },
  // Cohere
  { value: "cohere/command-r-plus", label: "Cohere Command R+" },
  // DashScope
  { value: "dashscope/qwen3.7-max-2026-06-08", label: "Qwen 3.7 Max" },
  { value: "dashscope/qwen3.8-max", label: "Qwen 3.8 Max" },
  // Moonshot
  { value: "moonshot/kimi-k2.7-code", label: "Kimi k2.7 Code" },
  { value: "moonshot/kimi-k3", label: "Kimi k3" },
  // Local (Ollama)
  { value: "ollama/llama3.1:70b", label: "Local: Llama 3.1 70B (Ollama)" },
  { value: "ollama/qwen2.5:72b", label: "Local: Qwen 2.5 72B (Ollama)" },
  { value: "ollama/deepseek-v3", label: "Local: DeepSeek v3 (Ollama)" },
];

const SCAN_MODES = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep" },
];

function timeAgo(iso: string) {
  if (!iso) return "Unknown";
  const time = new Date(iso).getTime();
  if (isNaN(time)) return "Unknown";
  const diff = Date.now() - time;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(iso: string, nowMs?: number) {
  if (!iso) return "Unknown";
  const time = new Date(iso).getTime();
  if (isNaN(time)) return "Unknown";
  const now = nowMs || Date.now();
  const diff = time - now;
  if (diff < 0) return "soon";
  
  if (diff >= 86400000) {
    const d = Math.floor(diff / 86400000);
    return `in ${d}d`;
  }
  
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `in ${pad(h)}:${pad(m)}:${pad(s)}`;
}

function statusLedClass(status: string) {
  const isActive = ["crawling", "scanning", "analyzing", "running"].includes(status);
  if (isActive) return "status-led running";
  if (status === "completed") return "status-led completed";
  if (status === "failed") return "status-led failed";
  if (status === "scheduled") return "status-led scheduled";
  return "status-led stopped";
}

function ScansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "finished">("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterModel, setFilterModel] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  
  const { confirm, alert } = useDialog();
  const [scheduleModal, setScheduleModal] = useState<{ scanId: string, period: string, llmModel: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [customModels, setCustomModels] = useState<{value: string, label: string}[]>([]);
  const [savedInstructions, setSavedInstructions] = useState<{id: string, title: string, content: string}[]>([]);
  const [now, setNow] = useState(Date.now());

  const groupedModels = useMemo(() => {
    const groups: Record<string, {value: string, label: string}[]> = {};
    LLM_MODELS.forEach(m => {
      let group = "Other";
      if (m.value.startsWith("openai/")) group = "OpenAI";
      else if (m.value.startsWith("anthropic/")) group = "Anthropic";
      else if (m.value.startsWith("google/") || m.value.startsWith("gemini/")) group = "Google Gemini";
      else if (m.value.startsWith("deepseek/")) group = "DeepSeek";
      else if (m.value.startsWith("groq/")) group = "Groq";
      else if (m.value.startsWith("openrouter/")) group = "OpenRouter";
      else if (m.value.startsWith("mistral/")) group = "Mistral";
      else if (m.value.startsWith("cohere/")) group = "Cohere";
      else if (m.value.startsWith("dashscope/")) group = "DashScope";
      else if (m.value.startsWith("moonshot/")) group = "Moonshot";
      else if (m.value.startsWith("ollama/")) group = "Local (Ollama)";
      else if (m.value.startsWith("vertex_ai/")) group = "Vertex AI";
      
      if (!groups[group]) groups[group] = [];
      groups[group].push(m);
    });

    if (customModels && customModels.length > 0) {
      groups["My Custom Models"] = customModels;
    }

    return groups;
  }, [customModels]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const [form, setForm] = useState({
    target: "",
    scanName: "",
    targetList: "",
    projectName: "",
    llmModel: "openai/gpt-4o",
    scanMode: "standard",
    instruction: "",
    simulationMode: false,
    scheduledAt: "",
    // Advanced
    scopeMode: "auto",
    diffBase: "",
    configFile: "",
    maxBudget: "",
    maxTurns: "",
    resumeRun: "",
    overrideLlm: false,
  });

  function fetchScans() {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data) => {
        setScans(data.scans || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }

  // Adaptive polling: 2s when scans are active, 8s when idle
  useEffect(() => {
    fetchScans();
    const hasActive = scans.some(s =>
      ["running", "crawling", "scanning", "analyzing"].includes(s.status)
    );
    const interval = setInterval(fetchScans, hasActive ? 2000 : 8000);
    return () => clearInterval(interval);
  }, [scans.some(s => ["running", "crawling", "scanning", "analyzing"].includes(s.status))]);


  useEffect(() => {
    fetch("/api/user/settings")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          if (data.customModels) {
            setCustomModels(data.customModels);
          }
          if (data.settings?.defaultModel) {
            setForm(prev => ({ ...prev, llmModel: data.settings.defaultModel }));
          }
        }
      })
      .catch(() => {});

    fetch("/api/instructions")
      .then(r => r.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          setSavedInstructions(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  const filteredScans = scans.filter((scan) => {
    if (filter !== "all") {
      const isFinished = ["completed", "failed", "stopped"].includes(scan.status);
      if (filter === "active" && isFinished) return false;
      if (filter === "finished" && !isFinished) return false;
    }
    if (filterMode !== "all" && scan.scanMode !== filterMode) return false;
    if (filterModel !== "all" && scan.llmModel !== filterModel) return false;
    return true;
  });

  const groupedScans = useMemo(() => {
    const groups: Record<string, Scan[]> = {};
    for (const scan of filteredScans) {
      let group = scan.projectName || scan.scanName;
      if (!group) {
        try {
          group = new URL(scan.target.startsWith("http") ? scan.target : `http://${scan.target}`).hostname;
        } catch {
          group = "Other";
        }
      }
      if (!group) group = "Other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(scan);
    }
    return groups;
  }, [filteredScans]);

  const toggleGroup = (g: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.target.trim() && !form.targetList.trim() && !form.resumeRun.trim()) return setError("Target is required");
    
    setLaunching(true);
    try {
      const payload = { ...form };
      if (payload.scheduledAt) {
        payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
      }

      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start scan");
      setShowModal(false);
      setShowResumeModal(false);
      router.push(`/scans/${data.scanId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  }

  async function handleStop(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    await fetch(`/api/scans/${id}`, { method: "DELETE" });
    fetchScans();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    confirm("Are you sure you want to permanently delete this scan?", async () => {
        await fetch(`/api/scans/${id}?purge=true`, { method: "DELETE" });
        fetchScans();
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    
    confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected scan(s)?`, async () => {
      setDeletingBulk(true);
      try {
        await fetch("/api/scans/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selectedIds) })
        });
        setSelectedIds(new Set());
        setSelectionMode(false);
        fetchScans();
      } catch (e) {
        console.error("Bulk delete failed", e);
      } finally {
        setDeletingBulk(false);
      }
    });
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  async function handleSchedulePeriod(scan: Scan, period: string) {
    if (period === "none") {
      // Clear period immediately
      await fetch(`/api/scans/${scan.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "none" })
      });
      fetchScans();
      return;
    }
    // For new periods, just show confirm dialog
    setScheduleModal({ scanId: scan.id, period, llmModel: scan.llmModel });
  }

  async function confirmSchedule() {
    if (!scheduleModal) return;
    setScheduling(true);
    try {
      const res = await fetch(`/api/scans/${scheduleModal.scanId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: scheduleModal.period })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      setScheduleModal(null);
      fetchScans();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none", gap: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-heading">Scans</h1>
          <p className="page-desc">Launch and monitor your security assessments.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {selectionMode && (
            <button 
              className="btn-primary" 
              style={{ background: selectedIds.size > 0 ? "var(--sev-critical-bg)" : "var(--bg-3)", color: selectedIds.size > 0 ? "var(--sev-critical)" : "var(--fg-3)", border: selectedIds.size > 0 ? "1px solid var(--sev-critical-bd)" : "1px solid var(--border)", pointerEvents: selectedIds.size > 0 ? "auto" : "none" }} 
              onClick={handleBulkDelete}
              disabled={deletingBulk}
            >
              {deletingBulk ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete Selected ({selectedIds.size})
            </button>
          )}
          <button className="btn-secondary" onClick={() => {
            setSelectionMode(!selectionMode);
            setSelectedIds(new Set());
          }}>
            {selectionMode ? "Cancel" : "Choose Scans"}
          </button>
          <button className="btn-secondary" onClick={() => setShowResumeModal(true)}>
            <Play size={14} /> Resume Scan
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Scan
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {/* Filter bar */}
        <div className="scan-filter-bar" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="filter-tabs">
            {(["all", "active", "finished"] as const).map((t) => (
              <button key={t} className={`filter-tab${filter === t ? " active" : ""}`} onClick={() => setFilter(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <button 
              className={`btn-secondary ${showFilters ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: "0 12px", background: showFilters || filterMode !== "all" || filterModel !== "all" ? "var(--bg-3)" : "transparent", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--fg-2)", cursor: "pointer" }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Settings2 size={14} /> Filters
              {(filterMode !== "all" || filterModel !== "all") && (
                <span style={{ width: 6, height: 6, background: "var(--fg)", borderRadius: "50%" }} />
              )}
            </button>
            
            {showFilters && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowFilters(false)} />
                <div className="glass-panel animate-fade-in" style={{ position: "absolute", top: "110%", left: 0, width: 260, zIndex: 100, padding: 16, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>Scan Mode</label>
                    <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13 }}>
                      <option value="all">All Modes</option>
                      {SCAN_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>LLM Model</label>
                    <select value={filterModel} onChange={e => setFilterModel(e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--fg)", fontSize: 13 }}>
                      <option value="all">All Models</option>
                      {LLM_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  {(filterMode !== "all" || filterModel !== "all") && (
                    <button 
                      onClick={() => { setFilterMode("all"); setFilterModel("all"); }}
                      style={{ background: "none", border: "none", color: "var(--fg-3)", fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            {Object.keys(groupedScans).length > 1 && (
              <button
                onClick={() => {
                  const allKeys = Object.keys(groupedScans);
                  const allCollapsed = allKeys.every(k => collapsedGroups[k]);
                  if (allCollapsed) {
                    setCollapsedGroups({});
                  } else {
                    const collapsed: Record<string, boolean> = {};
                    allKeys.forEach(k => { collapsed[k] = true; });
                    setCollapsedGroups(collapsed);
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "4px 10px", fontSize: 11, color: "var(--fg-3)", cursor: "pointer", height: 28, transition: "all var(--dur)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--fg)"; e.currentTarget.style.borderColor = "var(--fg-3)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--fg-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {Object.keys(groupedScans).every(k => collapsedGroups[k])
                  ? <><ChevronsUpDown size={12} /> Expand All</>
                  : <><ChevronsDownUp size={12} /> Collapse All</>
                }
              </button>
            )}
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {filteredScans.length} scan{filteredScans.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: selectionMode ? "30px 2fr 1fr 1fr 1.5fr 1fr 1.5fr 100px 60px 80px" : "2fr 1fr 1fr 1.5fr 1fr 1.5fr 100px 60px 80px",
          gap: 12,
          padding: "10px 20px",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--fg-3)",
          position: "sticky",
          top: 0,
          background: "var(--bg-1)",
          zIndex: 10,
        }}>
          {selectionMode && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <input 
                type="checkbox" 
                style={{ accentColor: "var(--fg)" }}
                checked={filteredScans.length > 0 && selectedIds.size === filteredScans.length}
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(filteredScans.map(s => s.id)));
                  else setSelectedIds(new Set());
                }}
              />
            </div>
          )}
          <div>Target</div>
          <div>Tags</div>
          <div>Mode</div>
          <div>Model</div>
          <div>Status</div>
          <div>Date</div>
          <div>Period</div>
          <div>Vulns</div>
          <div></div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div className="empty-state">
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="empty-state">
              <Search size={32} style={{ opacity: 0.15 }} />
              <p>No scans found</p>
              <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 4 }}>
                <Plus size={14} /> New Scan
              </button>
            </div>
          ) : (
            Object.entries(groupedScans).map(([group, groupScans]) => {
              const isCollapsed = collapsedGroups[group];
              return (
                <div key={group}>
                  {/* Group header */}
                  <div
                    onClick={() => toggleGroup(group)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 20px",
                      background: "var(--bg-2)",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {isCollapsed
                      ? <Folder size={13} style={{ color: "var(--fg-3)" }} />
                      : <FolderOpen size={13} style={{ color: "var(--fg-3)" }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>{group}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>
                      {groupScans.length}
                    </span>
                    {isCollapsed
                      ? <ChevronRight size={12} style={{ color: "var(--fg-3)" }} />
                      : <ChevronDown size={12} style={{ color: "var(--fg-3)" }} />}
                  </div>

                  {/* Group rows */}
                  {!isCollapsed && groupScans.map((scan) => (
                    <div
                      key={scan.id}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleSelection(scan.id);
                        } else {
                          router.push(`/scans/${scan.id}`);
                        }
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: selectionMode ? "30px 2fr 1fr 1fr 1.5fr 1fr 1.5fr 100px 60px 80px" : "2fr 1fr 1fr 1.5fr 1fr 1.5fr 100px 60px 80px",
                        gap: 12,
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        alignItems: "center",
                        background: selectedIds.has(scan.id) ? "var(--bg-3)" : "",
                        transition: "background var(--dur)",
                      }}
                      onMouseEnter={(e) => { if (!selectedIds.has(scan.id)) e.currentTarget.style.background = "var(--bg-2)"; }}
                      onMouseLeave={(e) => { if (!selectedIds.has(scan.id)) e.currentTarget.style.background = ""; }}
                      className="scan-row"
                    >
                      {selectionMode && (
                        <div style={{ display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            style={{ accentColor: "var(--fg)" }}
                            checked={selectedIds.has(scan.id)}
                            onChange={() => toggleSelection(scan.id)}
                          />
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {scan.scanName ? <span style={{ fontWeight: 600 }}>{scan.scanName}</span> : scan.target}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", overflow: "hidden", alignItems: "center" }}>
                        {scan.target.startsWith("Multiple_Targets") ? (
                          <span className="tag" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#d8b4fe", border: "1px solid rgba(139, 92, 246, 0.3)", fontWeight: 600 }}>
                            Multiple ({scan.target.match(/\d+/)?.[0] || "?"})
                          </span>
                        ) : scan.target === "Unknown_Target" ? (
                          <span className="tag" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: 600 }}>
                            Unknown
                          </span>
                        ) : (
                          <span className="tag" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 600 }}>
                            Single
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="tag" style={{ textTransform: "capitalize" }}>{scan.scanMode}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {scan.llmModel}
                      </div>
                      <div>
                        <div className="status-badge">
                          <span className={statusLedClass(scan.status)} />
                          <span style={{ fontSize: 11, textTransform: "capitalize", letterSpacing: "0.3px" }}>
                            {scan.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                        <div>{new Date(scan.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        {scan.period && scan.period !== "none" && scan.nextRunAt && (
                          <div style={{ color: "var(--sev-info)", marginTop: 4, fontWeight: 500, fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={10} />
                            Next: {timeUntil(scan.nextRunAt, now)}
                          </div>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={scan.period || "none"}
                          onChange={(e) => handleSchedulePeriod(scan, e.target.value)}
                          style={{
                            background: "var(--bg-1)",
                            border: "1px solid var(--border)",
                            color: "var(--fg)",
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: "var(--r)",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          <option value="none">None</option>
                          <option value="3_minutes">Every 3 Minutes (Test)</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        {scan.vulnCount > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", background: "var(--sev-critical-bg)", color: "var(--sev-critical)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r-sm)" }}>
                            {scan.vulnCount}
                          </span>
                        ) : (
                          <span style={{ color: "var(--fg-3)", fontSize: 13 }}>—</span>
                        )}
                      </div>
                      <div
                        style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {["running", "crawling", "scanning", "analyzing"].includes(scan.status) ? (
                          <button
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: 11, color: "var(--sev-critical)", borderColor: "var(--sev-critical-bd)" }}
                            onClick={(e) => handleStop(scan.id, e)}
                            title="Stop"
                          >
                            <Square size={11} />
                          </button>
                        ) : (
                          <button
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={(e) => handleDelete(scan.id, e)}
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Scan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Launch New Scan</div>
            </div>
            <form onSubmit={handleLaunch}>
              <div className="modal-body">
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label">Target(s) *</label>
                    <textarea
                      className="field-input"
                      style={{ minHeight: 60, resize: "vertical" }}
                      placeholder="https://app.example.com&#10;192.168.1.42&#10;./my-project"
                      value={form.targetList || form.target}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('\n')) {
                          setForm({ ...form, target: "", targetList: val });
                        } else {
                          setForm({ ...form, target: val, targetList: "" });
                        }
                      }}
                      disabled={launching}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Scan Name (Optional)</label>
                    <input
                      className="field-input"
                      placeholder="e.g. Weekly Payment Test"
                      value={form.scanName}
                      onChange={(e) => setForm({ ...form, scanName: e.target.value })}
                      disabled={launching}
                    />
                  </div>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label">Project Group</label>
                    <select
                      className="field-select"
                      value={Object.keys(groupedScans).includes(form.projectName) ? form.projectName : (form.projectName ? "custom" : "")}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setForm({ ...form, projectName: "New Project" });
                        } else {
                          setForm({ ...form, projectName: e.target.value });
                        }
                      }}
                      disabled={launching}
                    >
                      <option value="">Auto-detected / Default</option>
                      {Object.keys(groupedScans).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      <option value="custom">+ Custom Project...</option>
                    </select>
                    {!Object.keys(groupedScans).includes(form.projectName) && form.projectName !== "" && (
                      <input
                        style={{ marginTop: 8 }}
                        className="field-input animate-fade-in"
                        placeholder="Enter project name"
                        value={form.projectName}
                        onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                        disabled={launching}
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label className="field-label">LLM Model</label>
                    <div style={{ position: "relative" }}>
                      <div 
                        className={`field-input ${launching ? 'disabled' : ''}`} 
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: launching ? "not-allowed" : "pointer", userSelect: "none", opacity: launching ? 0.6 : 1 }}
                        onClick={() => !launching && setShowModelSelect(!showModelSelect)}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[...LLM_MODELS, ...customModels].find(m => m.value === form.llmModel)?.label || form.llmModel}
                        </span>
                        <ChevronDown size={14} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                      </div>
                      
                      {showModelSelect && (
                        <>
                          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowModelSelect(false)} />
                          <div className="glass-panel animate-fade-in" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 100, maxHeight: 300, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.3)", borderRadius: "var(--r)", border: "1px solid var(--border)", background: "var(--bg-1)" }}>
                            {Object.entries(groupedModels).map(([group, models]) => (
                              <div key={group} style={{ borderBottom: "1px solid var(--border)" }}>
                                <div 
                                  onClick={() => setExpandedProviders(prev => ({ ...prev, [group]: !prev[group] }))}
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-2)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}
                                >
                                  {group}
                                  {expandedProviders[group] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </div>
                                {expandedProviders[group] && (
                                  <div>
                                    {models.map(m => (
                                      <div 
                                        key={m.value}
                                        onClick={() => { setForm({ ...form, llmModel: m.value }); setShowModelSelect(false); }}
                                        style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", background: form.llmModel === m.value ? "var(--bg-3)" : "transparent", color: form.llmModel === m.value ? "var(--fg)" : "var(--fg-2)" }}
                                        onMouseEnter={e => { if(form.llmModel !== m.value) e.currentTarget.style.background = "var(--bg-2)"; }}
                                        onMouseLeave={e => { if(form.llmModel !== m.value) e.currentTarget.style.background = "transparent"; }}
                                      >
                                        {m.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Scan Mode</label>
                    <select
                      className="field-select"
                      value={form.scanMode}
                      onChange={(e) => setForm({ ...form, scanMode: e.target.value })}
                      disabled={launching}
                    >
                      {SCAN_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="field-label" style={{ margin: 0 }}>Custom Instructions (Optional)</label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <label style={{ cursor: "pointer", fontSize: 11, background: "var(--bg-2)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "var(--r-sm)", color: "var(--fg)", display: "flex", alignItems: "center" }}>
                        Browse...
                        <input 
                          type="file" 
                          accept=".txt,.md,.json,.yaml,.yml" 
                          style={{ display: "none" }} 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const text = ev.target?.result as string;
                              if (text) setForm(prev => ({ ...prev, instruction: text }));
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {savedInstructions.length > 0 && (
                        <select
                          className="field-select"
                          style={{ width: "auto", padding: "2px 8px", fontSize: 11, background: "var(--bg-2)" }}
                          onChange={(e) => {
                            if (e.target.value) {
                              setForm({ ...form, instruction: e.target.value });
                            }
                          }}
                        >
                          <option value="">Load from Pool...</option>
                          {savedInstructions.map(inst => (
                            <option key={inst.id} value={inst.content}>{inst.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <textarea
                    className="field-input"
                    style={{ minHeight: 60, resize: "vertical" }}
                    placeholder="e.g. Focus on authentication vulnerabilities, use admin:password123"
                    value={form.instruction}
                    onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                    disabled={launching}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 2, accentColor: "var(--fg)", flexShrink: 0 }}
                    checked={form.simulationMode}
                    onChange={(e) => setForm({ ...form, simulationMode: e.target.checked })}
                    disabled={launching}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Simulation Mode</div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                      Inject mock vulnerabilities for UI demonstration.
                    </div>
                  </div>
                </label>

                {/* Advanced */}
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: "100%", justifyContent: "space-between" }}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Settings2 size={13} /> Advanced
                  </span>
                  {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {showAdvanced && (
                  <>
                    <div className="field">
                      <label className="field-label">Scheduled Time</label>
                      <input
                        className="field-input"
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      />
                    </div>
                    
                    <div className="field-grid">
                      <div className="field">
                        <label className="field-label">Scope Mode</label>
                        <select
                          className="field-select"
                          value={form.scopeMode}
                          onChange={(e) => setForm({ ...form, scopeMode: e.target.value })}
                        >
                          <option value="auto">Auto (PR diff-scope if available)</option>
                          <option value="diff">Diff (force changed-files only)</option>
                          <option value="full">Full (disable diff-scope)</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label">Diff Base Branch/Commit</label>
                        <input
                          className="field-input"
                          placeholder="e.g. origin/main"
                          value={form.diffBase}
                          onChange={(e) => setForm({ ...form, diffBase: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Custom Config File Path</label>
                      <input
                        className="field-input"
                        placeholder="/path/to/custom/cli-config.json"
                        value={form.configFile}
                        onChange={(e) => setForm({ ...form, configFile: e.target.value })}
                      />
                    </div>

                    <div className="field-grid">
                      <div className="field">
                        <label className="field-label">Max Budget (USD)</label>
                        <input
                          className="field-input"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 50.00"
                          value={form.maxBudget}
                          onChange={(e) => setForm({ ...form, maxBudget: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Max Turns per Agent</label>
                        <input
                          className="field-input"
                          type="number"
                          min="1"
                          placeholder="e.g. 500"
                          value={form.maxTurns}
                          onChange={(e) => setForm({ ...form, maxTurns: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Resume Previous Scan (Run Name/UUID)</label>
                      <input
                        className="field-input"
                        placeholder="e.g. 3a9e3..."
                        value={form.resumeRun}
                        onChange={(e) => setForm({ ...form, resumeRun: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div style={{ padding: "10px 12px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r)", fontSize: 13, color: "var(--sev-critical)" }}>
                    {error}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)} disabled={launching}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={launching}>
                  {launching ? (
                    <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Launching…</>
                  ) : (
                    <><Play size={13} /> Launch Scan</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Schedule API Key Modal */}
      {scheduleModal && (
        <div className="modal-overlay" onClick={() => { setScheduleModal(null); setError(""); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Schedule Recurring Scan</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 16 }}>
                You selected <strong>{scheduleModal.period}</strong>. Strix will automatically use the saved API Key for <strong>{scheduleModal.llmModel}</strong> to run this scan in the background.
              </p>
              {error && (
                <div style={{ marginTop: 12, padding: "8px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical-bd)", borderRadius: "var(--r)", fontSize: 12, color: "var(--sev-critical)" }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => { setScheduleModal(null); setError(""); }} disabled={scheduling}>Cancel</button>
              <button className="btn-primary" onClick={confirmSchedule} disabled={scheduling}>
                {scheduling ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />} Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Resume Scan Modal */}
      {showResumeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResumeModal(false)}>
          <div className="modal animate-fade-in" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><Play size={16} color="var(--brand)" /> Resume Scan</div>
              <button className="btn-icon" onClick={() => setShowResumeModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form className="modal-body" onSubmit={handleLaunch}>
              {error && (
                <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--r)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Previous Run ID (UUID)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={form.resumeRun}
                    onChange={(e) => setForm({ ...form, resumeRun: e.target.value, target: "" })}
                    required
                  />
                  <div className="field-hint">Paste the ID of the stopped or failed scan to resume its progress.</div>
                </div>

                <div className="field-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--fg)" }}>
                    <input 
                      type="checkbox" 
                      checked={form.overrideLlm} 
                      onChange={(e) => setForm({ ...form, overrideLlm: e.target.checked })}
                      style={{ accentColor: "var(--fg)" }}
                    />
                    Override LLM Model?
                  </label>
                  {form.overrideLlm && (
                    <div style={{ marginTop: 12 }}>
                      <select
                        className="field-input"
                        value={form.llmModel}
                        onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                        disabled={launching}
                      >
                        {[...LLM_MODELS, ...customModels].map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <div className="field-hint" style={{ marginTop: 6 }}>Select a different AI model to continue the scan with. Note: You must have the API Key for the selected model.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowResumeModal(false)} disabled={launching}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={launching} style={{ gap: 8 }}>
                  {launching ? <Loader2 size={16} className="spin" /> : <Play size={16} />} 
                  {launching ? "Resuming..." : "Resume Scan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScansPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-3)" }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <ScansContent />
    </Suspense>
  );
}

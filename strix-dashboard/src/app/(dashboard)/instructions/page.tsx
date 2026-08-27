"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Search, FileText, Loader2, Check, AlertCircle, Edit3, Eye, Copy } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface Instruction {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState({ title: "", content: "" });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // Editor mode
  const [previewMode, setPreviewMode] = useState(false);

  const { confirm, alert } = useDialog();

  const fetchInstructions = async (autoSelectId?: string) => {
    try {
      const res = await fetch("/api/instructions");
      if (res.ok) {
        const data = await res.json();
        setInstructions(data);
        if (autoSelectId) {
          setSelectedId(autoSelectId);
        } else if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  // Update editor when selected instruction changes
  useEffect(() => {
    setPreviewMode(false);
    if (selectedId === "new") {
      setTitle("");
      setContent("");
      setLastSaved({ title: "", content: "" });
      setSaveStatus("idle");
    } else {
      const found = instructions.find(i => i.id === selectedId);
      if (found) {
        setTitle(found.title);
        setContent(found.content);
        setLastSaved({ title: found.title, content: found.content });
        setSaveStatus("idle");
      }
    }
  }, [selectedId, instructions]);

  // Auto-save logic
  useEffect(() => {
    if (!selectedId) return;
    if (title === lastSaved.title && content === lastSaved.content) {
       if (saveStatus === "saving") setSaveStatus("saved");
       return;
    }
    
    // Don't auto-save if empty
    if (!title.trim() || !content.trim()) return;

    setSaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        const isNew = selectedId === "new";
        const url = isNew ? "/api/instructions" : `/api/instructions/${selectedId}`;
        const method = isNew ? "POST" : "PUT";
        
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) throw new Error("Save failed");
        
        const savedInst = await res.json();
        setLastSaved({ title: savedInst.title, content: savedInst.content });
        setSaveStatus("saved");
        
        // Silent update to list
        fetch("/api/instructions")
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setInstructions(data);
              if (isNew) setSelectedId(savedInst.id);
            }
          });
          
      } catch (e) {
        setSaveStatus("error");
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeout);
  }, [title, content, selectedId, lastSaved]);

  const filteredInstructions = useMemo(() => {
    return instructions.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
  }, [instructions, search]);

  const handleNew = () => {
    setSelectedId("new");
  };

  const handleDelete = async (id: string) => {
    confirm("Are you sure you want to delete this instruction?", async () => {
      try {
        const res = await fetch(`/api/instructions/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        
        if (selectedId === id) {
          setSelectedId(null);
        }
        fetchInstructions();
      } catch (e: any) {
        alert(e.message, "Error");
      }
    }, "Delete Instruction");
  };

  return (
    <div className="page" style={{ height: "100%", maxWidth: "none", gap: 0, padding: 0, display: "flex", flexDirection: "row", overflow: "hidden" }}>
      
      {/* Left Sidebar */}
      <div style={{ width: 320, background: "var(--bg-1)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)" }}>Instructions</h2>
          <button onClick={handleNew} className="btn-icon" title="New Instruction">
            <Plus size={16} />
          </button>
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center", background: "var(--bg-2)" }}>
          <Search size={14} color="var(--fg-3)" />
          <input 
            type="text" 
            placeholder="Search prompts..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--fg)", fontSize: 13 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>Loading...</div>
          ) : filteredInstructions.length === 0 && search === "" && selectedId !== "new" ? (
             <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                No instructions yet.<br/>
                <button onClick={handleNew} style={{ color: "var(--brand)", marginTop: 8, textDecoration: "underline", cursor: "pointer", background: "transparent", border: "none" }}>Create one</button>
             </div>
          ) : (
            <>
              {selectedId === "new" && (
                <div style={{ padding: "12px 16px", borderRadius: "var(--r)", cursor: "pointer", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--brand)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>New Instruction...</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Unsaved</div>
                </div>
              )}
              {filteredInstructions.map(inst => (
                <div 
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  style={{ 
                    padding: "12px 16px", 
                    borderRadius: "var(--r)", 
                    cursor: "pointer", 
                    transition: "all 0.2s",
                    background: selectedId === inst.id ? "var(--bg-3)" : "transparent",
                    border: selectedId === inst.id ? "1px solid var(--border)" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== inst.id) e.currentTarget.style.background = "var(--bg-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== inst.id) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {inst.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {inst.content}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative" }}>
        {selectedId ? (
          <>
            <div style={{ padding: "16px 32px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ padding: 8, background: "var(--bg-2)", borderRadius: "var(--r)", color: "var(--fg-2)" }}>
                  <FileText size={16} />
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  {selectedId === "new" ? "Create New Instruction" : "Edit Instruction"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
                  <button 
                    onClick={() => setPreviewMode(false)}
                    style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: !previewMode ? "var(--bg-3)" : "transparent", color: !previewMode ? "var(--fg)" : "var(--fg-3)", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <Edit3 size={13}/> Edit
                  </button>
                  <button 
                    onClick={() => setPreviewMode(true)}
                    style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: previewMode ? "var(--bg-3)" : "transparent", color: previewMode ? "var(--fg)" : "var(--fg-3)", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <Eye size={13}/> Preview
                  </button>
                </div>
                {selectedId !== "new" && (
                  <button 
                    onClick={() => handleDelete(selectedId)} 
                    className="btn-icon" 
                    style={{ color: "var(--sev-critical)" }}
                    title="Delete Instruction"
                  >
                    <Trash2 size={16}/>
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <input
                type="text"
                placeholder="Instruction Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: "var(--fg)", 
                  background: "transparent", 
                  border: "none", 
                  outline: "none", 
                  width: "100%" 
                }}
              />
              {!previewMode ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                  <textarea
                    placeholder="Write your custom prompt or logic here... (Markdown supported)"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    style={{ 
                      flex: 1, 
                      fontSize: 14, 
                      color: "var(--fg-2)", 
                      background: "transparent", 
                      border: "none", 
                      outline: "none", 
                      resize: "none", 
                      fontFamily: "monospace", 
                      lineHeight: 1.6,
                      width: "100%"
                    }}
                  />
                  <div style={{ 
                    position: "absolute", 
                    bottom: 0, 
                    right: 0, 
                    fontSize: 12, 
                    color: "var(--fg-3)",
                    background: "var(--bg)",
                    padding: "4px 8px",
                    borderRadius: "4px"
                  }}>
                    {String(content.length).padStart(5, '0')}/25000
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, color: "var(--fg-1)", fontSize: 14, lineHeight: 1.6 }} className="markdown-body">
                  <MarkdownRenderer content={content || "*Nothing to preview*"} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--fg-3)" }}>
            <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--fg-2)" }}>No Instruction Selected</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Select an instruction from the sidebar or create a new one.</div>
            <button onClick={handleNew} className="btn-primary" style={{ marginTop: 24, gap: 8 }}>
              <Plus size={14} /> Create Instruction
            </button>
          </div>
        )}
      </div>
      
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { model, keys, url, apiKey } = await req.json();

    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }
    
    // Helper to perform the test prompt
    const runTestPrompt = async (targetUrl: string, authHeader: string | null, rawModelId: string) => {
      // Strip provider prefix for the actual request body if it exists, but some proxies (like LiteLLM) need it.
      // Usually, OpenAI or Ollama v1 API expects the model name without prefix.
      const actualModelId = rawModelId.includes("/") ? rawModelId.split("/").slice(1).join("/") : rawModelId;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeader) headers["Authorization"] = authHeader;

      const body = JSON.stringify({
        model: actualModelId,
        messages: [{ role: "user", content: "Hello, this is a test. Please reply with a short greeting." }],
        max_tokens: 50
      });

      const response = await fetch(targetUrl, { method: "POST", headers, body });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status}: ${errText.slice(0, 100)}`);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Success but no text returned.";
    };
    
    // If a custom URL is provided
    if (url) {
      try {
        let targetUrl = url;
        // Assume OpenAI v1 compatible chat endpoint if not explicitly provided
        if (!targetUrl.endsWith("/chat/completions")) {
           targetUrl = targetUrl.replace(/\/+$/, "") + (targetUrl.includes("/v1") ? "/chat/completions" : "/v1/chat/completions");
        }
        const authHeader = apiKey ? `Bearer ${apiKey}` : null;
        const reply = await runTestPrompt(targetUrl, authHeader, model);
        return NextResponse.json({ success: true, message: reply });
      } catch (e: any) {
        return NextResponse.json({ error: `Failed: ${e.message}` }, { status: 400 });
      }
    }

    // Default Ollama
    if (model.startsWith("ollama/")) {
      try {
        const reply = await runTestPrompt("http://localhost:11434/v1/chat/completions", null, model);
        return NextResponse.json({ success: true, message: reply });
      } catch (e: any) {
        return NextResponse.json({ error: `Ollama error: ${e.message}` }, { status: 400 });
      }
    }

    // Default OpenAI
    if (model.startsWith("openai/")) {
      const openAiKey = keys?.openai;
      if (!openAiKey) {
        return NextResponse.json({ error: "OpenAI API Key is required." }, { status: 400 });
      }
      try {
        const reply = await runTestPrompt("https://api.openai.com/v1/chat/completions", `Bearer ${openAiKey}`, model);
        return NextResponse.json({ success: true, message: reply });
      } catch (e: any) {
        return NextResponse.json({ error: `OpenAI error: ${e.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: "Model saved (No default test endpoint defined for this provider)" });

  } catch (e: any) {
    return NextResponse.json({ error: "Failed to test model" }, { status: 500 });
  }
}

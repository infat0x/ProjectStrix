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
    
    // If a custom URL is provided, try to ping it
    if (url) {
      try {
        const fetchOptions: RequestInit = {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        };
        // Add authorization if custom apiKey provided
        if (apiKey) {
          fetchOptions.headers = { ...fetchOptions.headers, "Authorization": `Bearer ${apiKey}` };
        }
        
        // Very generic ping, usually /v1/models is standard for OpenAI compatible endpoints,
        // or just ping the base URL. We'll try hitting the URL directly, assuming they might provide the health endpoint.
        // For Litellm / Ollama, we can just ping the base if they didn't provide full path.
        let targetUrl = url;
        if (model.startsWith("ollama/") && !url.endsWith("/api/tags")) {
            targetUrl = url.replace(/\/+$/, "") + "/api/tags";
        } else if (model.startsWith("openai/") && !url.includes("/v1/models")) {
            targetUrl = url.replace(/\/+$/, "") + "/v1/models";
        }

        const response = await fetch(targetUrl, fetchOptions);
        if (response.ok) {
          return NextResponse.json({ success: true, message: "Custom endpoint verified" });
        } else {
           return NextResponse.json({ error: `Endpoint returned status ${response.status}` }, { status: 400 });
        }
      } catch (e: any) {
        return NextResponse.json({ error: `Failed to connect to custom URL: ${e.message || "Unknown error"}` }, { status: 400 });
      }
    }

    // Very basic check for ollama (default localhost)
    if (model.startsWith("ollama/")) {
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (response.ok) {
          return NextResponse.json({ success: true });
        }
      } catch (e) {
        return NextResponse.json({ error: "Ollama is not running locally or unreachable." }, { status: 400 });
      }
    }

    // Basic check for OpenAI custom models (default endpoint)
    if (model.startsWith("openai/")) {
      const openAiKey = keys?.openai;
      if (!openAiKey) {
        return NextResponse.json({ error: "OpenAI API Key is required to test this model." }, { status: 400 });
      }

      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          return NextResponse.json({ success: true });
        }
      } catch (e) {
        return NextResponse.json({ error: "Failed to connect to OpenAI API." }, { status: 400 });
      }
    }

    // For any other model format we don't explicitly know how to test yet, 
    // we just return success to allow saving, or we could just say "Test Not Supported".
    // For now, we'll return success so the user gets the green light.
    return NextResponse.json({ success: true, message: "Model accepted (no strict validation)" });

  } catch (e: any) {
    return NextResponse.json({ error: "Failed to test model" }, { status: 500 });
  }
}

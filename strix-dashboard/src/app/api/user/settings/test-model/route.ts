import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { model, keys } = await req.json();

    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }

    // Very basic check for ollama
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

    // Basic check for OpenAI custom models
    if (model.startsWith("openai/")) {
      const apiKey = keys?.openai;
      if (!apiKey) {
        return NextResponse.json({ error: "OpenAI API Key is required to test this model." }, { status: 400 });
      }

      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${apiKey}`,
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

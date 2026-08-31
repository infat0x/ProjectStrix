import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
      include: {
        settings: true,
        customModels: true
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      settings: user.settings || { 
        aggressiveness: 50, 
        maxThreads: 4, 
        slackBotToken: "", 
        slackChannelId: "",
        notifyOnStart: false, 
        notifyOnFinish: true,
        theme: "dark",
        defaultModel: "openai/gpt-4o",
        autoDeleteDays: 0
      },
      customModels: user.customModels
    });
  } catch (e: any) {
    log.error("GET /api/user/settings", "Failed to fetch settings", e);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const userId = session.userId as string;

    if (body.type === "settings") {
      // L-2: validate and clamp all fields server-side.
      const d = body.data || {};
      const clamp = (v: any, min: number, max: number, def: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
      };
      const aggressiveness = clamp(d.aggressiveness, 0, 100, 50);
      const maxThreads = clamp(d.maxThreads, 1, 32, 4);
      const slackBotToken = typeof d.slackBotToken === "string" ? d.slackBotToken.trim().slice(0, 255) : "";
      const slackChannelId = typeof d.slackChannelId === "string" ? d.slackChannelId.trim().slice(0, 100) : "";
      const notifyOnStart = !!d.notifyOnStart;
      const notifyOnFinish = !!d.notifyOnFinish;

      const theme = typeof d.theme === "string" && ["dark", "light", "system"].includes(d.theme) ? d.theme : "dark";
      const defaultModel = typeof d.defaultModel === "string" ? d.defaultModel.trim().slice(0, 100) : "openai/gpt-4o";
      const autoDeleteDays = clamp(d.autoDeleteDays, 0, 365, 0);

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        create: { 
          userId, aggressiveness, maxThreads, slackBotToken, slackChannelId, notifyOnStart, notifyOnFinish,
          theme, defaultModel, autoDeleteDays
        },
        update: { 
          aggressiveness, maxThreads, slackBotToken, slackChannelId, notifyOnStart, notifyOnFinish,
          theme, defaultModel, autoDeleteDays
        }
      });

      return NextResponse.json({ success: true, settings });
    }

    if (body.type === "customModels") {
      // L-2: cap count and length, and drop malformed entries.
      const models = Array.isArray(body.data) ? body.data : [];
      if (models.length > 50) {
        return NextResponse.json({ error: "Too many custom models (max 50)" }, { status: 400 });
      }
      const clean: { userId: string; value: string; label: string; url: string | null; apiKey: string | null }[] = [];
      for (const m of models) {
        if (!m || typeof m !== "object") continue;
        const value = typeof m.value === "string" ? m.value.trim().slice(0, 200) : "";
        const label = typeof m.label === "string" ? m.label.trim().slice(0, 200) : "";
        const url = typeof m.url === "string" && m.url.trim() ? m.url.trim().slice(0, 500) : null;
        const apiKey = typeof m.apiKey === "string" && m.apiKey.trim() ? m.apiKey.trim().slice(0, 500) : null;
        
        if (value && label) clean.push({ userId, value, label, url, apiKey });
      }

      // Delete existing
      await prisma.customModel.deleteMany({ where: { userId } });

      // Create new
      if (clean.length > 0) {
        await prisma.customModel.createMany({ data: clean });
      }

      const updatedModels = await prisma.customModel.findMany({ where: { userId } });
      return NextResponse.json({ success: true, customModels: updatedModels });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e: any) {
    log.error("POST /api/user/settings", "Failed to update settings", e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { platform, config } = await req.json();

    if (!platform || !config) {
      return NextResponse.json({ error: "Platform and configuration are required" }, { status: 400 });
    }

    if (platform === "discord") {
      const url = config.discordWebhookUrl?.trim();
      if (!url) return NextResponse.json({ error: "Discord Webhook URL is empty" }, { status: 400 });

      const testPayload = {
        embeds: [
          {
            title: "🔔 Project Strix — Webhook Test",
            description: "Discord integration is successfully configured and active! You will receive real-time autonomous scan alerts and vulnerability triage reports here.",
            color: 0xe11d48,
            fields: [
              { name: "⚡ Status", value: "Verified & Connected", inline: true },
              { name: "👤 Initiated By", value: session.username || "Operator", inline: true },
              { name: "⚔️ Platform", value: "Strix Pentest Console", inline: true }
            ],
            footer: { text: "Project Strix Autonomous Pentest Orchestrator" },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Discord returned HTTP ${res.status}: ${text.slice(0, 150)}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "Test embed sent to Discord successfully!" });
    }

    if (platform === "telegram") {
      const token = config.telegramBotToken?.trim();
      const chatId = config.telegramChatId?.trim();
      if (!token || !chatId) {
        return NextResponse.json({ error: "Both Telegram Bot Token and Chat ID are required" }, { status: 400 });
      }

      const text = `🔔 <b>Project Strix — Telegram Test</b>\n\n` +
        `✅ <b>Status:</b> Verified & Connected\n` +
        `👤 <b>Operator:</b> <code>${session.username || "Admin"}</code>\n` +
        `🛡️ <i>Your Telegram channel is ready to receive real-time offensive scan telemetry!</i>`;

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML"
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return NextResponse.json({ error: data.description || `Telegram returned HTTP ${res.status}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "Test notification sent to Telegram successfully!" });
    }

    if (platform === "slack") {
      const token = config.slackBotToken?.trim();
      const channel = config.slackChannelId?.trim();
      if (!token || !channel) {
        return NextResponse.json({ error: "Both Slack Bot Token and Channel ID are required" }, { status: 400 });
      }

      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channel,
          text: `🔔 *Project Strix — Slack Alert Test*\n> Status: *Connected*\n> Operator: *${session.username || "Operator"}*\n> Autonomous pentest notifications will be delivered to this channel.`
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json({ error: `Slack API error: ${data.error}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "Test message delivered to Slack successfully!" });
    }

    return NextResponse.json({ error: "Unknown notification platform" }, { status: 400 });
  } catch (err: any) {
    log.error("TEST_WEBHOOK", "Failed to dispatch test notification", err);
    return NextResponse.json({ error: `Connection failed: ${err.message}` }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { registerProcess, removeProcess } from "@/lib/scanStore";
import { log } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readApiKeys } from "@/lib/apiKeys";
import { isSafePublicUrl } from "@/lib/urlGuard";

import os from "os";

const RUNS_DIR = path.join(os.tmpdir(), "strix_runs");

function getStrixCommand(): string {
  if (process.env.STRIX_PATH && fs.existsSync(process.env.STRIX_PATH)) {
    log.debug("STRIX_CMD", `Using STRIX_PATH env: ${process.env.STRIX_PATH}`);
    return process.env.STRIX_PATH;
  }
  const home = process.env.HOME || "/root";
  const candidates = [
    "/usr/local/bin/strix",
    path.join(home, ".local/bin/strix"),
    path.join(process.cwd(), "../strix-venv/bin/strix"),
    path.join(process.cwd(), "../venv/bin/strix"),
    path.join(process.cwd(), "../strix/venv/bin/strix"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      log.debug("STRIX_CMD", `Found strix at: ${c}`);
      return c;
    }
  }
  log.warn(
    "STRIX_CMD",
    "strix not found in any candidate path, falling back to PATH lookup",
    { candidates },
  );
  return "strix";
}

function ensureRunsDir() {
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    log.info("RUNS_DIR", `Created strix_runs directory at ${RUNS_DIR}`);
  }
}

async function sendWebhookNotification(config: any, event: "start" | "finish", scanMeta: any, vulnCount: number = 0) {
  if (!config || !config.slackBotToken || !config.slackChannelId) return;
  
  if (event === "start" && !config.notifyOnStart) return;
  if (event === "finish" && !config.notifyOnFinish) return;

  let blocks: any[] = [];
  let fallbackText = "";
  let color = "#36a64f";

  if (event === "start") {
    fallbackText = `🚀 Scan Started on ${scanMeta.target}`;
    color = "#3498db";
    blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: "🚀 Strix Scan Initiated", emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Target:*\n\`${scanMeta.target}\`` },
          { type: "mrkdwn", text: `*Mode:*\n${scanMeta.scanMode}` },
          { type: "mrkdwn", text: `*Model:*\n${scanMeta.llmModel}` },
          { type: "mrkdwn", text: `*Scan ID:*\n\`${scanMeta.id.slice(0, 8)}\`` }
        ]
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `🕒 Started at: ${new Date().toLocaleString()}` }
        ]
      }
    ];
  } else {
    fallbackText = `🏁 Scan Finished on ${scanMeta.target} - ${vulnCount} vulns`;
    color = scanMeta.status === "failed" ? "#e74c3c" : vulnCount > 0 ? "#f39c12" : "#2ecc71";
    
    let headerText = scanMeta.status === "failed" ? "❌ Scan Failed" : "✅ Scan Completed";
    
    blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: headerText, emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Target:*\n\`${scanMeta.target}\`` },
          { type: "mrkdwn", text: `*Status:*\n${scanMeta.status.toUpperCase()}` },
          { type: "mrkdwn", text: `*Vulnerabilities Found:*\n${vulnCount > 0 ? '🚨 *' + vulnCount + '*' : '✅ 0'}` },
          { type: "mrkdwn", text: `*Scan ID:*\n\`${scanMeta.id.slice(0, 8)}\`` }
        ]
      }
    ];

    if (vulnCount > 0) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `⚠️ *Action Required:* Vulnerabilities were detected on the target. Please review the detailed Strix report immediately.` }
      });
    }

    blocks.push({ type: "divider" });
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `🕒 Finished at: ${new Date().toLocaleString()}` }
      ]
    });
  }

  const payload: any = {
    channel: config.slackChannelId,
    text: fallbackText,
    attachments: [
      {
        color: color,
        blocks: blocks
      }
    ]
  };

  try {
    let endpoint = "https://slack.com/api/chat.postMessage";
    
    if (event === "finish") {
      const dbScan = await prisma.scan.findUnique({ 
        where: { id: scanMeta.id }, 
        select: { slackMessageTs: true } 
      });
      if (dbScan?.slackMessageTs) {
        endpoint = "https://slack.com/api/chat.update";
        payload.ts = dbScan.slackMessageTs;
      }
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.slackBotToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      log.warn("SLACK", `Failed to reach Slack API: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      log.warn("SLACK", `Slack API returned error: ${data.error}`);
    } else if (event === "start" && data.ts) {
      await prisma.scan.update({
        where: { id: scanMeta.id },
        data: { slackMessageTs: data.ts }
      });
      log.info("SLACK", `Saved Slack message ts: ${data.ts}`);
    } else {
      log.info("SLACK", `Successfully sent ${event} notification to Slack`);
    }
  } catch (err: any) {
    log.error("SLACK", `Error sending Slack notification`, err);
  }
}

// GET /api/scans — list all scans
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  ensureRunsDir();
  try {
    let where = {};
    if (session.role !== "ADMIN") {
      where = { userId: session.userId as string };
    }
    const dbScans = await prisma.scan.findMany({ where, orderBy: { startedAt: "desc" }, include: { project: true } });
    
    // Sync logic: loop through dbScans, read vulnerabilities.json and run.json, update DB if changed.
    const syncedScans = await Promise.all(dbScans.map(async (scan) => {
      const scanDir = path.join(RUNS_DIR, scan.id);
      const runFile = path.join(scanDir, "run.json");
      const vulnFile = path.join(scanDir, "vulnerabilities.json");
      
      let changed = false;
      let newStatus = scan.status;
      let newVulnCount = scan.vulnCount;
      
      if (fs.existsSync(runFile)) {
         try {
           const runData = JSON.parse(fs.readFileSync(runFile, "utf-8"));
           if (runData.status && runData.status !== scan.status) {
             newStatus = runData.status;
             changed = true;
           }
         } catch(e) {}
      }
      
      if (fs.existsSync(vulnFile)) {
         try {
           const vulns = JSON.parse(fs.readFileSync(vulnFile, "utf-8"));
           const count = Array.isArray(vulns) ? vulns.length : 0;
           if (count !== scan.vulnCount) {
             newVulnCount = count;
             changed = true;
           }
         } catch(e) {}
      }
      
      if (changed) {
         try {
           await prisma.scan.update({ 
             where: { id: scan.id }, 
             data: { status: newStatus, vulnCount: newVulnCount } 
           });
         } catch(e) {}
         return { ...scan, status: newStatus, vulnCount: newVulnCount, scanName: (scan.payload as any)?.scanName || "", projectName: scan.project?.name || scan.projectName };
      }
      
      return { ...scan, scanName: (scan.payload as any)?.scanName || "", projectName: scan.project?.name || scan.projectName };
    }));

    return NextResponse.json({ scans: syncedScans });
  } catch (err) {
    log.error("GET /api/scans", "Failed to list scans from DB", err);
    return NextResponse.json(
      { scans: [], error: "Failed to list scans" },
      { status: 200 },
    );
  }
}

// POST /api/scans — start a new scan
export async function POST(req: NextRequest) {
  log.info("POST /api/scans", "New scan request received");
  const body = await req.json();
  let {
    target,
    scanName,
    projectName,
    llmModel,
    scanMode,
    instruction,
    targetList,
    scopeMode,
    diffBase,
    configFile,
    maxBudget,
    maxTurns,
    resumeRun,
    overrideLlm,
  } = body;

  log.debug("POST /api/scans", "Scan parameters", {
    target,
    llmModel,
    scanMode,
    instruction: instruction ? "(provided)" : "(none)",
  });

  const schedulerKey = req.headers.get('x-scheduler-secret');
  let session = null;
  let isScheduler = false;

  const expectedSchedulerKey = process.env.SCHEDULER_SECRET;
  if (schedulerKey && expectedSchedulerKey && schedulerKey === expectedSchedulerKey) {
    isScheduler = true;
    session = { userId: "scheduler", role: "ADMIN" };
  } else {
    session = await getSession();
  }

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (resumeRun) {
    const oldScan = await prisma.scan.findUnique({ where: { id: resumeRun } });
    if (oldScan) {
      // H-1: IDOR check — user must own the scan or be an admin
      if (!isScheduler && session.role !== "ADMIN" && oldScan.userId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      target = oldScan.target;
      llmModel = overrideLlm && body.llmModel ? body.llmModel : oldScan.llmModel;
      scanMode = oldScan.scanMode;
      projectName = oldScan.projectName;
    } else if (!target) {
      target = "Resumed Scan";
    }
  }

  if (!target && !targetList) {
    log.warn("POST /api/scans", "Rejected: target or targetList is required");
    return NextResponse.json({ error: "target or targetList is required" }, { status: 400 });
  }

  // M-4: Input length limits
  if (instruction && instruction.length > 25000) {
    return NextResponse.json({ error: "Instruction too long (max 25000 chars)" }, { status: 400 });
  }
  if (targetList && targetList.length > 100000) {
    return NextResponse.json({ error: "Target list too large (max 100 000 chars)" }, { status: 400 });
  }
  if (maxBudget && String(maxBudget).length > 20) {
    return NextResponse.json({ error: "Invalid maxBudget value" }, { status: 400 });
  }
  if (maxTurns && String(maxTurns).length > 10) {
    return NextResponse.json({ error: "Invalid maxTurns value" }, { status: 400 });
  }

  let displayTarget = (target || "").replace(/ /g, '_');
  if (!displayTarget && targetList) {
    const list = targetList.split('\n').filter((t: string) => t.trim().length > 0);
    if (list.length === 1) {
      displayTarget = list[0].trim().replace(/ /g, '_');
    } else if (list.length > 1) {
      displayTarget = `Multiple_Targets_(${list.length})`;
    } else {
      displayTarget = "Unknown_Target";
    }
  } else if (!displayTarget) {
    displayTarget = "Unknown_Target";
  }

  const scanId = resumeRun || body.preGeneratedScanId || randomUUID();
  const scanDir = path.join(RUNS_DIR, scanId);
  const isScheduled = body.scheduledAt && !body.preGeneratedScanId && new Date(body.scheduledAt).getTime() > Date.now();

  const createdUserId = (isScheduler && body.userId) ? body.userId : (session.userId as string);
  const userExists = await prisma.user.findUnique({ 
    where: { id: createdUserId },
    include: { settings: true }
  });
  
  if (!userExists) {
    log.error("POST /api/scans", `User ${createdUserId} not found in DB (Stale session)`);
    return NextResponse.json({ error: "Invalid session. Please log out and log in again." }, { status: 401 });
  }

  // Fetch API Keys directly from DB (M-5: stored encrypted, decrypt to use).
  const userKeys: any = readApiKeys(userExists.apiKeys);

  let resolvedApiKey = "";
  if (llmModel.startsWith("openai/")) resolvedApiKey = userKeys.openai || "";
  else if (llmModel.startsWith("anthropic/")) resolvedApiKey = userKeys.anthropic || "";
  else if (llmModel.startsWith("google/") || llmModel.startsWith("gemini/")) resolvedApiKey = userKeys.gemini || "";
  else if (llmModel.startsWith("deepseek/")) resolvedApiKey = userKeys.deepseek || "";
  else if (llmModel.startsWith("groq/")) resolvedApiKey = userKeys.groq || "";
  else if (llmModel.startsWith("openrouter/")) resolvedApiKey = userKeys.openrouter || "";
  else if (llmModel.startsWith("mistral/")) resolvedApiKey = userKeys.mistral || "";
  else if (llmModel.startsWith("cohere/")) resolvedApiKey = userKeys.cohere || "";
  else if (llmModel.startsWith("dashscope/")) resolvedApiKey = userKeys.dashscope || "";
  else if (llmModel.startsWith("moonshot/")) resolvedApiKey = userKeys.moonshot || "";
  else if (llmModel.startsWith("vertex_ai/")) resolvedApiKey = userKeys.vertex_ai || "";

  if (!resolvedApiKey && !body.simulationMode && !llmModel.startsWith("ollama/")) {
    log.warn("POST /api/scans", `Rejected: API key for ${llmModel} is missing in DB`);
    return NextResponse.json({ error: `API Key for ${llmModel} is not configured in Settings.` }, { status: 400 });
  }

  const apiKey = resolvedApiKey;

  try {
    const existing = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!existing) {
       await prisma.scan.create({
         data: {
           id: scanId,
           userId: createdUserId,
           target: displayTarget,
           projectName: projectName || "",
           llmModel: llmModel || "openai/gpt-4o",
           scanMode: scanMode || "standard",
           status: isScheduled ? "scheduled" : "running",
           startedAt: isScheduled ? new Date(body.scheduledAt) : new Date(),
           // L-1: Strip the resolved API key before persisting — keys are fetched fresh from DB on each run
           payload: { ...body, apiKey: undefined } as any,
         }
       });
    } else if (isScheduler || resumeRun) {
      // If triggered by scheduler or resume, keep existing user but update status.
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: "running",
          startedAt: new Date()
        }
      });
    }
  } catch (e) {
    log.error("POST /api/scans", "DB Create Error", e);
  }

  // If scheduledAt is in the future, don't run it now. Save it for the scheduler.
  if (body.scheduledAt && !body.preGeneratedScanId) {
    const scheduledTime = new Date(body.scheduledAt).getTime();
    if (scheduledTime > Date.now()) {
      log.info("POST /api/scans", `Scheduling scan for ${body.scheduledAt}`);
      return NextResponse.json({ scanId, status: "scheduled", scheduledAt: body.scheduledAt });
    }
  }

  fs.mkdirSync(scanDir, { recursive: true });

  const logFile = path.join(scanDir, "log.txt");
  const runFile = path.join(scanDir, "run.json");
  const vulnFile = path.join(scanDir, "vulnerabilities.json");

  const runMeta = {
    id: scanId,
    target,
    scanName,
    projectName,
    llmModel,
    scanMode,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
  };
  if (!resumeRun) {
    fs.writeFileSync(runFile, JSON.stringify(runMeta, null, 2));
    fs.writeFileSync(vulnFile, JSON.stringify([], null, 2));
  } else if (fs.existsSync(runFile)) {
    try {
      const existingRunMeta = JSON.parse(fs.readFileSync(runFile, "utf-8"));
      existingRunMeta.status = "running";
      fs.writeFileSync(runFile, JSON.stringify(existingRunMeta, null, 2));
    } catch(e) {}
  }
  log.info("POST /api/scans", `Scan created/resumed`, { scanId, scanDir });

  const userSettings = userExists.settings || { slackBotToken: "", slackChannelId: "", notifyOnStart: false, notifyOnFinish: true, aggressiveness: 50, maxThreads: 4 };
  const notificationConfig = {
    slackBotToken: (userSettings as any).slackBotToken,
    slackChannelId: (userSettings as any).slackChannelId,
    notifyOnStart: userSettings.notifyOnStart,
    notifyOnFinish: userSettings.notifyOnFinish
  };

  // Send start notification
  sendWebhookNotification(notificationConfig, "start", runMeta);

  const strixCmd = getStrixCommand();
  const args = ["-n"]; // Non-interactive to ensure clean logs
  
  if (resumeRun) {
    let actualResumeName = resumeRun.trim();
    try {
      const strixRunsDir = path.join(scanDir, "strix_runs");
      if (fs.existsSync(strixRunsDir)) {
        const dirs = fs.readdirSync(strixRunsDir).filter(f => fs.statSync(path.join(strixRunsDir, f)).isDirectory());
        if (dirs.length > 0) {
          actualResumeName = dirs[0];
          log.info("POST /api/scans", `Found internal strix run name: ${actualResumeName}`);
        }
      }
    } catch (e) {
      log.error("POST /api/scans", "Failed to find internal strix run name", e);
    }
    args.push("--resume", actualResumeName);
  } else {
    if (target && target !== "Unknown_Target" && !target.startsWith("Multiple_Targets")) {
      args.push("-t", target);
    }
    
    if (targetList?.trim()) {
      const targetListFile = path.join(scanDir, "targets.txt");
      fs.writeFileSync(targetListFile, targetList.trim());
      args.push("--target-list", targetListFile);
    } else {
      const existingTargetListFile = path.join(scanDir, "targets.txt");
      if (fs.existsSync(existingTargetListFile)) {
        args.push("--target-list", existingTargetListFile);
      }
    }

    if (scanMode) args.push("-m", scanMode);
    if (instruction?.trim()) args.push("--instruction", instruction.trim());
    
    if (scopeMode && scopeMode !== "auto") args.push("--scope-mode", scopeMode);

    // C-4 / L-3: Path traversal protection for diffBase.
    // path.resolve() already collapses '..', so a substring check is insufficient —
    // require the resolved path to be contained within RUNS_DIR.
    if (diffBase?.trim()) {
      const resolvedDiff = path.resolve(diffBase.trim());
      if (resolvedDiff === RUNS_DIR || resolvedDiff.startsWith(RUNS_DIR + path.sep)) {
        args.push("--diff-base", resolvedDiff);
      } else {
        log.warn("POST /api/scans", "Rejected out-of-bounds diffBase path", { diffBase });
      }
    }

    // C-3 / L-3: Path traversal protection for configFile — same containment rule,
    // blocking arbitrary absolute-path passthrough (e.g. --config /etc/passwd).
    if (configFile?.trim()) {
      const resolvedConfig = path.resolve(configFile.trim());
      if (resolvedConfig === RUNS_DIR || resolvedConfig.startsWith(RUNS_DIR + path.sep)) {
        args.push("--config", resolvedConfig);
      } else {
        log.warn("POST /api/scans", "Rejected out-of-bounds configFile path", { configFile });
      }
    }

    if (maxBudget?.trim()) args.push("--max-budget", maxBudget.trim());
    if (maxTurns?.trim()) args.push("--max-turns", maxTurns.trim());
    
  }

  const env = {
    ...process.env,
    PATH: `${process.env.PATH || ""}:/usr/local/bin:${process.env.HOME || ""}/.local/bin`,
    STRIX_LLM: (llmModel || "openai/gpt-4o").replace(/^google\//, "gemini/"),
    LLM_API_KEY: apiKey,
    OPENAI_API_KEY: apiKey,
    ANTHROPIC_API_KEY: apiKey,
    GEMINI_API_KEY: apiKey,
    DEEPSEEK_API_KEY: apiKey,
    DASHSCOPE_API_KEY: apiKey,
    MOONSHOT_API_KEY: apiKey,
    VERTEX_AI_API_KEY: apiKey,
  };

  log.info("POST /api/scans", `Spawning strix process`, {
    cmd: strixCmd,
    args,
  });

  if (body.simulationMode) {
    log.info("POST /api/scans", "Simulation Mode enabled, bypassing real agent");
    runMockScan(scanId, scanDir, runFile, vulnFile, logFile, target, notificationConfig);
    return NextResponse.json({ scanId, status: "running", mode: "simulation" });
  }

  let proc;
  try {
    proc = spawn(strixCmd, args, { env, cwd: scanDir, detached: false });
    log.info("POST /api/scans", `Process spawned`, { pid: proc.pid, scanId });
  } catch (err: any) {
    log.error(
      "POST /api/scans",
      `Failed to spawn strix (ENOENT likely — not installed)`,
      err,
    );
    log.warn("POST /api/scans", "Falling back to DEMO mode");
    runMockScan(scanId, scanDir, runFile, vulnFile, logFile, target, notificationConfig);
    return NextResponse.json({ scanId, status: "running", mode: "demo" });
  }

  registerProcess(scanId, proc);

  const logStream = fs.createWriteStream(logFile, { flags: "a" });
  let pythonDirSyncInterval: NodeJS.Timeout | null = null;

  // Poll for the nested python vulnerabilities.json and copy it to our UUID vulnerabilities.json
  pythonDirSyncInterval = setInterval(() => {
    const nestedRunsDir = path.join(scanDir, "strix_runs");
    if (fs.existsSync(nestedRunsDir)) {
      try {
        const nestedDirs = fs.readdirSync(nestedRunsDir, { withFileTypes: true });
        const targetDir = nestedDirs.find(d => d.isDirectory());
        if (targetDir) {
          const nestedVulnFile = path.join(nestedRunsDir, targetDir.name, "vulnerabilities.json");
          if (fs.existsSync(nestedVulnFile)) {
             const vulns = fs.readFileSync(nestedVulnFile, "utf-8");
             // Only write if it's valid JSON and different
             try {
                const parsed = JSON.parse(vulns);
                if (Array.isArray(parsed) && parsed.length > 0) {
                   fs.writeFileSync(vulnFile, JSON.stringify(parsed, null, 2));
                }
             } catch {}
          }
        }
      } catch (e) {
        // ignore errors during polling
      }
    }
  }, 2000);

  proc.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    logStream.write(chunk);
    log.debug(
      "PROC_STDOUT",
      `[${scanId.slice(0, 8)}] ${text.slice(0, 200).trim()}`,
    );
    parseVulnFromLog(text, vulnFile, scanId);
    parseStatusFromLog(text, runFile);
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    logStream.write(`[stderr] ${text}`);
    log.warn(
      "PROC_STDERR",
      `[${scanId.slice(0, 8)}] ${text.slice(0, 500).trim()}`,
    );
    parseStatusFromLog(text, runFile);
  });

  proc.on("close", (code: number | null) => {
    if (pythonDirSyncInterval) clearInterval(pythonDirSyncInterval);
    logStream.end();
    removeProcess(scanId);
    const updated = JSON.parse(fs.readFileSync(runFile, "utf-8"));
    let finalStatus = code === 0 ? "completed" : "failed";
    if (updated.status === "completed" || updated.status === "stopped" || updated.status === "analyzing") {
      finalStatus = "completed"; // Enforce completed if manually stopped or finished analyzing
    }
    updated.status = finalStatus;
    updated.finishedAt = new Date().toISOString();
    updated.exitCode = code;
    fs.writeFileSync(runFile, JSON.stringify(updated, null, 2));
    
    // Read vulns for notification and DB update
    let vulnCount = 0;
    try {
      const vulns = JSON.parse(fs.readFileSync(vulnFile, "utf-8"));
      vulnCount = Array.isArray(vulns) ? vulns.length : 0;
      
      if (vulnCount > 0) {
        // Sync vulnerabilities to database
        const dbVulns = vulns.map((v: any) => ({
          scanId,
          vulnId: v.id || randomUUID(),
          title: v.title || "Unknown",
          severity: v.severity || "info",
          endpoint: v.endpoint || "",
          method: v.method || "",
          description: v.description || "",
          poc: v.poc || "",
          cvss: v.cvss || 0.0,
          remediation: v.remediation || "",
          impact: v.impact || "",
          technical_analysis: v.technical_analysis || "",
          poc_description: v.poc_description || "",
          poc_script_code: v.poc_script_code || "",
          remediation_steps: v.remediation_steps || "",
          evidence: v.evidence || "",
          assumptions: v.assumptions || "",
          fix_effort: v.fix_effort || "",
          cwe: v.cwe || "",
          finding_class: v.finding_class || ""
        }));
        
        prisma.vulnerability.createMany({
          data: dbVulns,
          skipDuplicates: true
        }).catch(e => log.error("PROC_CLOSE", "Failed to sync vulns to DB", e));
      }
    } catch {}
    
    // Update DB with final status and vuln count
    prisma.scan.update({
      where: { id: scanId },
      data: { status: finalStatus, vulnCount }
    }).catch(err => log.error("PROC_CLOSE", "Failed to update DB status on scan close", err));
    
    // Send finish notification
    sendWebhookNotification(notificationConfig, "finish", updated, vulnCount);
    
    log.info("PROC_CLOSE", `Scan ${scanId.slice(0, 8)} finished`, {
      exitCode: code,
      status: updated.status,
    });
  });

  proc.on("error", (err: Error) => {
    if (pythonDirSyncInterval) clearInterval(pythonDirSyncInterval);
    log.error(
      "PROC_ERROR",
      `Process error for scan ${scanId.slice(0, 8)}`,
      err,
    );
    logStream.write(`[error] ${err.message}\n`);
    logStream.end();
    removeProcess(scanId);
    const updated = JSON.parse(fs.readFileSync(runFile, "utf-8"));
    updated.status = "failed";
    updated.finishedAt = new Date().toISOString();
    fs.writeFileSync(runFile, JSON.stringify(updated, null, 2));
    // ✅ Bug #3b Fix: Update DB on proc error too
    prisma.scan.update({
      where: { id: scanId },
      data: { status: "failed" }
    }).catch(() => {});
    log.warn("PROC_ERROR", "Falling back to DEMO mode after process error");
    runMockScan(scanId, scanDir, runFile, vulnFile, logFile, target, notificationConfig);
  });

  return NextResponse.json({ scanId, status: "running" });
}

function parseVulnFromLog(text: string, vulnFile: string, scanId: string) {
  const vulnPattern = /\[VULNERABILITY\]\s*({[\s\S]*?})/g;
  let match;
  while ((match = vulnPattern.exec(text)) !== null) {
    try {
      const vuln = JSON.parse(match[1]);
      let existing: any[] = [];
      try {
        existing = JSON.parse(fs.readFileSync(vulnFile, "utf-8"));
      } catch { }
      if (!existing.find((v: any) => v.id === vuln.id)) {
        existing.push(vuln);
        fs.writeFileSync(vulnFile, JSON.stringify(existing, null, 2));
        log.info(
          "VULN_PARSER",
          `New vulnerability found for scan ${scanId.slice(0, 8)}`,
          {
            id: vuln.id,
            title: vuln.title,
            severity: vuln.severity,
          },
        );
      }
    } catch (e) {
      log.warn("VULN_PARSER", "Failed to parse vulnerability from log", {
        err: String(e),
      });
    }
  }
}

function parseStatusFromLog(text: string, runFile: string) {
  let newStatus = "";
  if (text.includes("Crawling target") || text.includes("Initial")) {
    newStatus = "crawling";
  } else if (text.includes("Testing for") || text.includes("Spawning exploitation")) {
    newStatus = "scanning";
  } else if (text.includes("Summary:") || text.includes("Assessment complete") || text.includes("Penetration test completed")) {
    newStatus = "analyzing";
  }

  if (newStatus) {
    try {
      const data = JSON.parse(fs.readFileSync(runFile, "utf-8"));
      // Don't overwrite if it's already completed or failed
      if (data.status !== "completed" && data.status !== "failed" && data.status !== "stopped" && data.status !== newStatus) {
        data.status = newStatus;
        fs.writeFileSync(runFile, JSON.stringify(data, null, 2));
      }
    } catch {}
  }
}

function runMockScan(
  scanId: string,
  scanDir: string,
  runFile: string,
  vulnFile: string,
  logFile: string,
  target: string,
  notificationConfig?: any
) {
  log.info("MOCK_SCAN", `Starting mock scan for ${target}`, {
    scanId: scanId.slice(0, 8),
  });

  const mockVulns = [
    {
      id: "v1",
      title: "SQL Injection in /api/login",
      severity: "critical",
      endpoint: "/api/login",
      method: "POST",
      description:
        "The login endpoint is vulnerable to SQL injection via the username parameter.",
      poc: "username=admin' OR 1=1--&password=x",
      cvss: 9.8,
      remediation: "Use parameterized queries or prepared statements.",
    },
    {
      id: "v2",
      title: "Reflected XSS in Search",
      severity: "high",
      endpoint: "/search",
      method: "GET",
      description:
        "The q parameter is reflected without sanitization, allowing script injection.",
      poc: "/search?q=<script>alert(1)</script>",
      cvss: 7.4,
      remediation:
        "Encode all user-supplied data before rendering in HTML context.",
    },
    {
      id: "v3",
      title: "IDOR on /api/users/{id}",
      severity: "high",
      endpoint: "/api/users/{id}",
      method: "GET",
      description:
        "Any authenticated user can read any other user profile by changing the ID.",
      poc: "GET /api/users/1 with any valid JWT",
      cvss: 7.1,
      remediation:
        "Enforce ownership checks server-side for all resource access.",
    },
    {
      id: "v4",
      title: "Missing Rate Limiting on /api/auth",
      severity: "medium",
      endpoint: "/api/auth",
      method: "POST",
      description: "No rate limiting allows brute-force credential attacks.",
      poc: "Send 1000 requests/min with no throttling",
      cvss: 5.3,
      remediation:
        "Implement rate limiting and account lockout after failed attempts.",
    },
    {
      id: "v5",
      title: "Exposed Debug Endpoint",
      severity: "low",
      endpoint: "/debug/config",
      method: "GET",
      description:
        "Configuration details including environment variables are exposed.",
      poc: "GET /debug/config returns full server config",
      cvss: 3.1,
      remediation: "Disable or restrict debug endpoints in production.",
    },
  ];

  const logs = [
    `[${new Date().toISOString()}] Starting Strix security assessment (DEMO MODE)`,
    `[${new Date().toISOString()}] Target: ${target}`,
    `[${new Date().toISOString()}] Initializing reconnaissance agent...`,
    `[${new Date().toISOString()}] Crawling target endpoints...`,
    `[${new Date().toISOString()}]  Discovered 24 endpoints`,
    `[${new Date().toISOString()}] Spawning exploitation agents...`,
    `[${new Date().toISOString()}] Testing for injection vulnerabilities...`,
    `[${new Date().toISOString()}] CRITICAL: SQL Injection found at /api/login`,
    `[${new Date().toISOString()}] Testing for XSS vulnerabilities...`,
    `[${new Date().toISOString()}] ️ HIGH: Reflected XSS found in /search`,
    `[${new Date().toISOString()}] Testing for access control issues...`,
    `[${new Date().toISOString()}] ️ HIGH: IDOR vulnerability found at /api/users/{id}`,
    `[${new Date().toISOString()}] Testing rate limiting...`,
    `[${new Date().toISOString()}]  MEDIUM: No rate limiting on /api/auth`,
    `[${new Date().toISOString()}] Checking for exposed endpoints...`,
    `[${new Date().toISOString()}]  LOW: Debug endpoint exposed at /debug/config`,
    `[${new Date().toISOString()}] Assessment complete. Found 5 vulnerabilities.`,
    `[${new Date().toISOString()}] Summary: 1 Critical, 2 High, 1 Medium, 1 Low`,
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < logs.length) {
      fs.appendFileSync(logFile, logs[i] + "\n");
      log.debug("MOCK_SCAN", `[${scanId.slice(0, 8)}] ${logs[i]}`);
      if (i === 2) {
        parseStatusFromLog(logs[2], runFile);
      }
      if (i === 6) {
        parseStatusFromLog(logs[6], runFile);
      }
      if (i === 16) {
        parseStatusFromLog(logs[16], runFile);
      }
      if (i === 7) {
        const v = [mockVulns[0]];
        fs.writeFileSync(vulnFile, JSON.stringify(v, null, 2));
        log.info("MOCK_SCAN", "Added vuln: SQL Injection");
      }
      if (i === 9) {
        const v = mockVulns.slice(0, 2);
        fs.writeFileSync(vulnFile, JSON.stringify(v, null, 2));
        log.info("MOCK_SCAN", "Added vuln: Reflected XSS");
      }
      if (i === 11) {
        const v = mockVulns.slice(0, 3);
        fs.writeFileSync(vulnFile, JSON.stringify(v, null, 2));
        log.info("MOCK_SCAN", "Added vuln: IDOR");
      }
      if (i === 13) {
        const v = mockVulns.slice(0, 4);
        fs.writeFileSync(vulnFile, JSON.stringify(v, null, 2));
        log.info("MOCK_SCAN", "Added vuln: Missing Rate Limit");
      }
      if (i === 15) {
        fs.writeFileSync(vulnFile, JSON.stringify(mockVulns, null, 2));
        log.info("MOCK_SCAN", "Added all 5 vulnerabilities");
      }
      i++;
    } else {
      clearInterval(interval);
      const updated = JSON.parse(fs.readFileSync(runFile, "utf-8"));
      updated.status = "completed";
      updated.finishedAt = new Date().toISOString();
      updated.exitCode = 0;
      fs.writeFileSync(runFile, JSON.stringify(updated, null, 2));
      
      // Sync mock vulns to DB
      const dbVulns = mockVulns.map((v: any) => ({
        scanId,
        vulnId: v.id || randomUUID(),
        title: v.title || "Unknown",
        severity: v.severity || "info",
        endpoint: v.endpoint || "",
        method: v.method || "",
        description: v.description || "",
        poc: v.poc || "",
        cvss: v.cvss || 0.0,
        remediation: v.remediation || ""
      }));
      prisma.vulnerability.createMany({
        data: dbVulns,
        skipDuplicates: true
      }).catch(() => {});

      // Update DB when mock scan finishes
      prisma.scan.update({
        where: { id: scanId },
        data: { status: "completed", vulnCount: mockVulns.length }
      }).catch(() => {});
      
      // Send finish notification for mock
      sendWebhookNotification(notificationConfig, "finish", updated, mockVulns.length);
      
      log.info("MOCK_SCAN", `Mock scan ${scanId.slice(0, 8)} completed`, {
        totalVulns: mockVulns.length,
      });
    }
  }, 1500);
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getProcess, removeProcess } from "@/lib/scanStore";
import { log } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

import os from "os";

const RUNS_DIR = path.join(os.tmpdir(), "strix_runs");

function getScanDir(id: string) {
  return path.join(RUNS_DIR, id);
}

// GET /api/scans/[id] — get scan status + vulnerabilities
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  log.debug(`GET /api/scans/${id}`, "Fetching scan detail");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbScan = await prisma.scan.findUnique({ where: { id } });
  if (!dbScan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  if (session.role !== "ADMIN" && dbScan.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scanDir = getScanDir(id);
  const runFile = path.join(scanDir, "run.json");
  const vulnFile = path.join(scanDir, "vulnerabilities.json");

  if (!fs.existsSync(runFile)) {
    log.warn(`GET /api/scans/${id}`, "Scan not found — run.json missing", {
      scanDir,
    });
    // Fallback to DB info if run.json isn't created yet
    return NextResponse.json({ 
      ...dbScan, 
      vulnerabilities: [] 
    });
  }

  const run = JSON.parse(fs.readFileSync(runFile, "utf-8"));
  log.debug(`GET /api/scans/${id}`, `Scan status: ${run.status}`, {
    target: run.target,
  });

  let vulnerabilities: any[] = [];
  if (fs.existsSync(vulnFile)) {
    try {
      vulnerabilities = JSON.parse(fs.readFileSync(vulnFile, "utf-8"));
      log.debug(
        `GET /api/scans/${id}`,
        `Loaded ${vulnerabilities.length} vulnerabilities`,
      );
    } catch (e) {
      log.error(
        `GET /api/scans/${id}`,
        "Failed to parse vulnerabilities.json",
        e,
      );
    }
  } else {
    log.debug(`GET /api/scans/${id}`, "No vulnerabilities.json yet");
  }

  return NextResponse.json({ ...dbScan, ...run, vulnerabilities });
}

// DELETE /api/scans/[id] — stop a running scan or delete it
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "true";
  
  log.info(`DELETE /api/scans/${id}`, `Stop/Delete scan requested, purge=${purge}`);

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbScan = await prisma.scan.findUnique({ where: { id } });
  if (!dbScan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  if (session.role !== "ADMIN" && dbScan.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scanDir = getScanDir(id);
  const runFile = path.join(scanDir, "run.json");

  if (!fs.existsSync(runFile) && !purge) {
    // Allow cancelling a scheduled scan even without run.json (it hasn't run yet)
    if (dbScan.status === "scheduled") {
      await prisma.scan.update({ where: { id }, data: { status: "completed", period: "none", nextRunAt: null } });
      log.info(`DELETE /api/scans/${id}`, "Scheduled scan cancelled (no run.json)");
      return NextResponse.json({ success: true });
    }
    log.warn(`DELETE /api/scans/${id}`, "Scan not found — cannot stop");
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const proc = getProcess(id);
  if (proc) {
    log.info(`DELETE /api/scans/${id}`, `Killing process pid=${proc.pid}`);
    try {
      proc.kill("SIGTERM");
      log.info(`DELETE /api/scans/${id}`, "SIGTERM sent successfully");
    } catch (e) {
      log.error(`DELETE /api/scans/${id}`, "Failed to kill process", e);
    }
    removeProcess(id);
  } else {
    log.warn(
      `DELETE /api/scans/${id}`,
      "No running process found in memory (may have already finished)",
    );
  }

  if (purge) {
    if (fs.existsSync(scanDir)) {
      fs.rmSync(scanDir, { recursive: true, force: true });
      log.info(`DELETE /api/scans/${id}`, "Scan directory deleted from disk");
    }
    const scheduledFile = path.join(RUNS_DIR, "scheduled.json");
    if (fs.existsSync(scheduledFile)) {
      try {
        let schedules = JSON.parse(fs.readFileSync(scheduledFile, "utf-8"));
        const originalLength = schedules.length;
        schedules = schedules.filter((s: any) => s.scanId !== id);
        if (schedules.length !== originalLength) {
          fs.writeFileSync(scheduledFile, JSON.stringify(schedules, null, 2));
          log.info(`DELETE /api/scans/${id}`, "Scan removed from scheduled.json");
        }
      } catch (e) {}
    }
    await prisma.scan.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  }

  const run = JSON.parse(fs.readFileSync(runFile, "utf-8"));
  run.status = "completed";
  run.finishedAt = new Date().toISOString();
  fs.writeFileSync(runFile, JSON.stringify(run, null, 2));
  await prisma.scan.update({ where: { id }, data: { status: "completed" } });
  log.info(`DELETE /api/scans/${id}`, "Scan marked as completed");

  return NextResponse.json({ success: true });
}

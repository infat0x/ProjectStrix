import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { log } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import os from "os";

const RUNS_DIR = path.join(os.tmpdir(), "strix_runs");

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Expecting items: { scanId: string, vulnId: string }[]
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid or empty items" }, { status: 400 });
    }

    log.info(`DELETE /api/vulnerabilities/bulk`, `Bulk delete requested for ${items.length} vulnerabilities`);

    // Group items by scanId
    const scanMap: Record<string, string[]> = {};
    for (const item of items) {
      if (!scanMap[item.scanId]) scanMap[item.scanId] = [];
      scanMap[item.scanId].push(item.vulnId || item.id);
    }

    let deletedCount = 0;

    for (const [scanId, vulnIds] of Object.entries(scanMap)) {
      // Check permissions
      const dbScan = await prisma.scan.findUnique({ where: { id: scanId } });
      if (!dbScan) continue;
      if (session.role !== "ADMIN" && dbScan.userId !== session.userId) continue;

      const vulnFile = path.join(RUNS_DIR, scanId, "vulnerabilities.json");
      
      // Delete from vulnerabilities.json
      let deletedFromJson = false;
      if (fs.existsSync(vulnFile)) {
        try {
          const vulns = JSON.parse(fs.readFileSync(vulnFile, "utf-8"));
          const originalLength = vulns.length;
          
          const newVulns = vulns.filter((v: any) => !vulnIds.includes(v.id));
          
          if (newVulns.length !== originalLength) {
            fs.writeFileSync(vulnFile, JSON.stringify(newVulns, null, 2));
            deletedCount += (originalLength - newVulns.length);
            deletedFromJson = true;
            
            // Update the run.json vulnCount if needed
            const runFile = path.join(RUNS_DIR, scanId, "run.json");
            if (fs.existsSync(runFile)) {
               const run = JSON.parse(fs.readFileSync(runFile, "utf-8"));
               run.vulnCount = newVulns.length;
               fs.writeFileSync(runFile, JSON.stringify(run, null, 2));
            }
          }
        } catch (e) {
          log.error(`DELETE /api/vulnerabilities/bulk`, `Error updating JSON for scan ${scanId}`, e);
        }
      }

      // Delete from Prisma DB
      const dbDeleteResult = await prisma.vulnerability.deleteMany({
        where: {
          scanId,
          vulnId: { in: vulnIds }
        }
      });

      if (!deletedFromJson && dbDeleteResult.count > 0) {
        deletedCount += dbDeleteResult.count;
      }

      // Always recount and update the DB vulnCount
      const remainingCount = await prisma.vulnerability.count({ where: { scanId } });
      await prisma.scan.update({
        where: { id: scanId },
        data: { vulnCount: remainingCount }
      });
    }

    log.info(`DELETE /api/vulnerabilities/bulk`, `Successfully deleted ${deletedCount} vulnerabilities`);
    return NextResponse.json({ success: true, deletedCount });

  } catch (error) {
    log.error("DELETE /api/vulnerabilities/bulk", "Bulk delete error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

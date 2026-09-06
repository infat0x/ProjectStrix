import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.userId as string;
    const isAdmin = session.role === "ADMIN";

    // Get scans: ADMIN sees all platform scans, regular user sees their own
    const scans = await prisma.scan.findMany({
      where: isAdmin ? {} : { userId },
      select: { id: true, status: true, startedAt: true }
    });

    const scanIds = scans.map(s => s.id);

    // Get vulnerabilities for these scans
    const vulnerabilities = await prisma.vulnerability.findMany({
      where: { scanId: { in: scanIds } },
      select: {
        id: true,
        scanId: true,
        severity: true,
        title: true,
        createdAt: true,
        status: true,
        endpoint: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // 1. Calculate Summary Metrics
    const totalScans = scans.length;
    const activeScans = scans.filter(s => ["running", "scanning", "analyzing", "crawling"].includes(s.status)).length;
    const totalVulns = vulnerabilities.length;
    const criticalVulns = vulnerabilities.filter(v => v.severity.toLowerCase() === "critical").length;

    // 2. Vulnerability by Severity Breakdown
    const severityCount = { critical: 0, high: 0, medium: 0, low: 0, informative: 0 };
    vulnerabilities.forEach(v => {
      const s = v.severity.toLowerCase();
      if (s in severityCount) severityCount[s as keyof typeof severityCount]++;
      else severityCount.informative++;
    });

    // 3. Scan Trend over last 7 days
    const trend: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trend[dateStr] = 0;
    }

    scans.forEach(s => {
      const dateStr = new Date(s.startedAt).toISOString().split('T')[0];
      if (dateStr in trend) trend[dateStr]++;
    });

    const trendData = Object.keys(trend).map(date => ({
      date,
      scans: trend[date]
    }));

    return NextResponse.json({
      summary: { totalScans, activeScans, totalVulns, criticalVulns },
      severityBreakdown: [
        { name: "Critical", value: severityCount.critical, fill: "var(--sev-critical)" },
        { name: "High", value: severityCount.high, fill: "var(--sev-high)" },
        { name: "Medium", value: severityCount.medium, fill: "var(--sev-medium)" },
        { name: "Low", value: severityCount.low, fill: "var(--sev-low)" },
        { name: "Informative", value: severityCount.informative, fill: "var(--sev-informative)" }
      ].filter(s => s.value > 0),
      trendData,
      recentVulns: vulnerabilities.slice(0, 8)
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

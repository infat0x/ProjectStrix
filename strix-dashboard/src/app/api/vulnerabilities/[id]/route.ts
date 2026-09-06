import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { log } from "@/lib/logger";

const VALID_STATUSES = ["OPEN", "CONFIRMED", "RESOLVED", "FALSE_POSITIVE"] as const;

// GET /api/vulnerabilities/[id] — fetch single vulnerability details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vuln = await prisma.vulnerability.findUnique({
      where: { id },
      include: {
        scan: {
          select: { target: true, id: true, userId: true }
        }
      }
    });

    if (!vuln) return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
    if (session.role !== "ADMIN" && vuln.scan.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(vuln);
  } catch (error: any) {
    log.error(`GET /api/vulnerabilities/${id}`, "Failed to fetch vulnerability", error);
    return NextResponse.json({ error: "Failed to fetch vulnerability" }, { status: 500 });
  }
}

// PATCH /api/vulnerabilities/[id] — update vulnerability status (Triage Lifecycle)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vuln = await prisma.vulnerability.findUnique({
      where: { id },
      include: {
        scan: {
          select: { userId: true }
        }
      }
    });

    if (!vuln) return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
    if (session.role !== "ADMIN" && vuln.scan.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const status = String(body.status || "").toUpperCase();

    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.vulnerability.update({
      where: { id },
      data: { status }
    });

    log.info(`PATCH /api/vulnerabilities/${id}`, `Status updated to ${status} by user ${session.userId}`);
    return NextResponse.json({ success: true, vulnerability: updated });
  } catch (error: any) {
    log.error(`PATCH /api/vulnerabilities/${id}`, "Failed to update status", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

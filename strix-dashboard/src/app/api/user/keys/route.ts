import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readApiKeys, serializeApiKeys, KNOWN_PROVIDERS } from "@/lib/apiKeys";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // M-5: decrypt at rest. H-2: never expose raw keys — return masked indicators.
  const keys = readApiKeys(user.apiKeys);
  const masked: Record<string, boolean> = {};
  for (const [provider, key] of Object.entries(keys)) {
    masked[provider] = typeof key === "string" && key.length > 0;
  }

  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an object of provider -> key" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Read existing encrypted keys
  const existingKeys = readApiKeys(user.apiKeys);
  const mergedKeys: Record<string, string> = { ...existingKeys };

  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!(KNOWN_PROVIDERS as readonly string[]).includes(k)) continue;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length === 0) {
        // User explicitly cleared the key field
        delete mergedKeys[k];
      } else if (trimmed.length > 512) {
        return NextResponse.json({ error: `API key for '${k}' exceeds 512 characters` }, { status: 400 });
      } else {
        mergedKeys[k] = trimmed;
      }
    }
    // If v is boolean (true) or omitted, preserve the existing stored key
  }

  await prisma.user.update({
    where: { id: session.userId as string },
    data: { apiKeys: serializeApiKeys(mergedKeys) },
  });

  return NextResponse.json({ success: true });
}

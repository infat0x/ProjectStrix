import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

function getEncodedKey(): Uint8Array {
  const secretKey = process.env.SESSION_SECRET || (process.env.NEXT_PHASE === "phase-production-build" ? "build_fallback_secret_32bytes_hex" : undefined);
  if (!secretKey) throw new Error("[FATAL] SESSION_SECRET environment variable is not set. Run deploy.py to generate it.");
  return new TextEncoder().encode(secretKey);
}

export async function createSession(
  userId: string,
  username: string,
  role: string = "USER",
  status: string = "APPROVED",
  tokenVersion: number = 0,
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await new SignJWT({ userId, username, role, status, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());

  const cookieStore = await cookies();
  cookieStore.set("strix_session", session, {
    httpOnly: true,
    // M-3: Secure by default in production. Plain-HTTP deployments must opt out
    // explicitly (INSECURE_HTTP=true) — HTTPS is strongly recommended.
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_HTTP !== "true",
    expires: expiresAt,
    sameSite: "strict",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("strix_session");
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("strix_session")?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });

    // H-3: Revalidate against the DB so demotion/rejection/forced-logout take
    // effect immediately instead of waiting up to 7 days for the token to expire.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, username: true, role: true, status: true, tokenVersion: true },
    });
    if (!user) return null;
    if ((payload.tokenVersion as number | undefined) !== user.tokenVersion) return null; // revoked
    if (user.status === "REJECTED") return null;

    // Return authoritative, DB-fresh identity (role/status), not the stale claims.
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
    } as { userId: string; username: string; role: string; status: string };
  } catch (error) {
    return null; // Invalid or expired token
  }
}

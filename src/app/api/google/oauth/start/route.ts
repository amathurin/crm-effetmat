import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAuthUrl, googleEnabled } from "@/lib/google";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? new URL(req.url).origin;

  const session = await auth();
  if (!session?.user) return Response.redirect(`${base}/connexion`);
  if (!googleEnabled()) {
    return Response.redirect(`${base}/reglages?google=absent`);
  }

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return Response.redirect(getAuthUrl(state));
}

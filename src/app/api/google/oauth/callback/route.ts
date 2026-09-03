import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { exchangeCodeAndStore } from "@/lib/google";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? new URL(req.url).origin;

  const session = await auth();
  if (!session?.user) return Response.redirect(`${base}/connexion`);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (await cookies()).get("g_oauth_state")?.value;

  if (url.searchParams.get("error") || !code || !state || state !== cookieState) {
    return Response.redirect(`${base}/reglages?google=erreur`);
  }

  try {
    await exchangeCodeAndStore(code);
  } catch (err) {
    console.error("Google OAuth:", err);
    return Response.redirect(`${base}/reglages?google=erreur`);
  }

  return Response.redirect(`${base}/reglages?google=connecte`);
}

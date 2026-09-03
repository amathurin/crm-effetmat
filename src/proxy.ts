import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Auth.js applique la logique du callback `authorized` : les visiteurs non
// connectés sont redirigés vers /connexion avant d'atteindre ces routes.
export default auth((req) => {
  void req;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/forfaits/:path*",
    "/agenda/:path*",
    "/factures/:path*",
    "/reglages/:path*",
  ],
};

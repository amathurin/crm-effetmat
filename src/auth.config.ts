import type { NextAuthConfig } from "next-auth";

/**
 * Configuration Auth.js partagée, sûre pour l'environnement Edge (aucun accès
 * base de données ni bcrypt). Le middleware l'utilise seule ; `auth.ts` la
 * complète avec le provider Credentials.
 */
export const authConfig = {
  pages: { signIn: "/connexion" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;

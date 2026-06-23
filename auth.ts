import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isAllowedAuthEmail } from "@/lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [Google],
  callbacks: {
    signIn({ user, profile }) {
      return isAllowedAuthEmail(user.email ?? profile?.email);
    },
    session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & { id?: string };
        user.id = `google:${token.sub ?? token.email ?? session.user.email}`;
      }
      return session;
    },
  },
});

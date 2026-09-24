import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { emailSchema } from "@famvault/runtime/security";
import { rateLimit, clientIp } from "@famvault/runtime/rate-limit";
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          const parsed = emailSchema.safeParse(credentials?.email);
          if (
            !parsed.success ||
            typeof credentials?.password !== "string" ||
            Buffer.byteLength(credentials.password) > 72
          )
            return null;
          await rateLimit("login-account:" + parsed.data, 10, 15 * 60000);
          await rateLimit("login-ip:" + clientIp(request), 60, 15 * 60000);
          const user = await prisma.user.findUnique({
            where: { email: parsed.data },
            include: { family: true },
          });
          if (
            !user ||
            user.disabledAt ||
            !(await bcrypt.compare(credentials.password, user.password))
          )
            return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            familyId: user.familyId,
            familyName: user.family.name,
            sessionVersion: user.sessionVersion,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = user.id;
        token.sessionVersion = u.sessionVersion;
      }
      if (typeof token.id !== "string") return null;
      const current = await prisma.user.findUnique({
        where: { id: token.id },
        include: { family: true },
      });
      if (
        !current ||
        current.disabledAt ||
        token.sessionVersion !== current.sessionVersion
      )
        return null;
      token.role = current.role;
      token.familyId = current.familyId;
      token.familyName = current.family.name;
      token.name = current.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        Object.assign(session.user, {
          role: token.role,
          familyId: token.familyId,
          familyName: token.familyName,
        });
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});

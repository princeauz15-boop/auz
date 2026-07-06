import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const role = (credentials.role as string) || "employee";

        try {
          if (role === "admin") {
            const admin = await prisma.admin.findUnique({
              where: { email: credentials.email as string },
            });

            if (!admin) return null;

            const isValid = await bcrypt.compare(
              credentials.password as string,
              admin.password
            );
            if (!isValid) return null;

            return {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              role: "admin",
              avatar: admin.avatar || null,
            };
          } else {
            const employee = await prisma.employee.findUnique({
              where: { email: credentials.email as string },
            });

            if (!employee || employee.status !== "active") return null;

            const isValid = await bcrypt.compare(
              credentials.password as string,
              employee.password
            );
            if (!isValid) return null;

            return {
              id: employee.id,
              email: employee.email,
              name: employee.name,
              role: "employee",
              employeeId: employee.employeeId,
              department: employee.department,
              avatar: employee.avatar || null,
            };
          }
        } catch (error) {
          console.error("[AUTH ERROR]", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.employeeId = (user as any).employeeId;
        token.department = (user as any).department;
        token.avatar = (user as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.employeeId = token.employeeId as string;
        session.user.department = token.department as string;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Keep authOptions as alias for any leftover imports
export const authOptions = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import Email from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
    }),
    Email({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "azure-ad" && profile?.tid) {
        // Check if tenant is allowed
        const tenant = await prisma.allowedTenant.findFirst({
          where: {
            tenantId: profile.tid,
            active: true,
          },
        });

        if (!tenant) {
          return false;
        }

        // Create or update user
        await prisma.user.upsert({
          where: { email: user.email! },
          create: {
            email: user.email!,
            name: user.name || null,
            identityProvider: "MICROSOFT",
            msTenantId: profile.tid,
            msOid: profile.oid || null,
            status: "ACTIVE",
            role: "EXTERNAL", // Default, can be elevated
          },
          update: {
            name: user.name || null,
            msOid: profile.oid || null,
            status: "ACTIVE",
          },
        });
      } else if (account?.provider === "email") {
        // Manual user - will need 2FA
        const userRecord = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!userRecord) {
          return false; // Must be created by admin
        }

        if (userRecord.status !== "ACTIVE") {
          return false;
        }

        // Check if 2FA is required
        if (userRecord.identityProvider === "MANUAL" && !userRecord.twoFactorEnabled) {
          // Redirect to 2FA enrollment
          return `/enroll/2fa`;
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          session.user.role = user.role;
          session.user.id = user.id;
          session.user.identityProvider = user.identityProvider;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };


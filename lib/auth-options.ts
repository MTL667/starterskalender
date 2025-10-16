import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

const oidcEnabled = process.env.OIDC_ENABLED === 'true'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    ...(oidcEnabled
      ? [
          {
            id: 'oidc',
            name: 'OIDC',
            type: 'oauth' as const,
            wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
            clientId: process.env.OIDC_CLIENT_ID!,
            clientSecret: process.env.OIDC_CLIENT_SECRET!,
            authorization: { params: { scope: 'openid email profile' } },
            idToken: true,
            checks: ['pkce', 'state'] as const,
            profile(profile: any) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
              }
            },
          },
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dagen
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      // Maak user aan indien nog niet bestaat
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            role: 'ENTITY_VIEWER', // Default rol
          },
        })
      }

      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email! },
          select: {
            id: true,
            role: true,
            twoFAEnabled: true,
          },
        })

        if (user) {
          session.user.id = user.id
          session.user.role = user.role
          session.user.twoFAEnabled = user.twoFAEnabled
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  events: {
    async signIn({ user }) {
      // Log de login
      const { createAuditLog } = await import('./audit')
      await createAuditLog({
        actorId: user.id,
        action: 'LOGIN',
        meta: { email: user.email },
      })
    },
  },
}


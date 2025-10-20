import { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { prisma } from './prisma'

// Tenant Allowlist - lijst van toegestane Azure AD tenant IDs
// Kan via database (AllowedTenant model) OF via environment variable
const ENV_ALLOWED_TENANTS = (process.env.ALLOWED_TENANT_IDS || '')
  .split(',')
  .map(t => t.trim())
  .filter(Boolean)

/**
 * Check if a tenant is allowed to access the application
 * Priority: Database > Environment Variable > Development Mode
 */
async function isTenantAllowed(tenantId: string | undefined): Promise<boolean> {
  if (!tenantId) return false

  // Check database first
  try {
    const dbAllowedTenant = await prisma.allowedTenant.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    })
    
    if (dbAllowedTenant) {
      return true
    }
  } catch (error) {
    console.error('Error checking database for allowed tenant:', error)
    // Fall through to env var check
  }

  // Fallback to environment variable
  if (ENV_ALLOWED_TENANTS.length > 0) {
    return ENV_ALLOWED_TENANTS.includes(tenantId)
  }

  // In development without any allowlist, allow all tenants
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️  No allowlist configured - allowing tenant ${tenantId} in development mode`)
    return true
  }

  // In production without allowlist, deny by default
  return false
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: 'common', // Multi-tenant: accepteer alle Azure AD tenants
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
          // Request additional claims
          prompt: 'select_account',
        },
      },
      // Request tenant ID in ID token
      token: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
      // Explicitly request profile with tenant info
      profile(profile: any) {
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: profile.email || profile.upn || profile.preferred_username,
          image: null,
          // Preserve Azure AD specific claims
          tid: profile.tid,
          oid: profile.oid,
          tenantId: profile.tid,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dagen
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // HTTPS required
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    newUser: '/auth/welcome', // Redirect nieuwe users naar welcome pagina
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Debug: Log what we receive from Azure AD
        console.log('🔍 SignIn Debug:', {
          accountKeys: account ? Object.keys(account) : 'no account',
          profileKeys: profile ? Object.keys(profile) : 'no profile',
        })

        // Extract Azure AD claims - try multiple sources
        // Azure AD can send tenant ID in different places
        const tenantId = 
          (account as any)?.tenantId || // NextAuth normalized
          (account as any)?.tid ||       // Raw Azure AD claim
          (profile as any)?.tid ||       // Profile claim
          (profile as any)?.tenantId ||  // Profile normalized
          undefined
        
        const oid = 
          (account as any)?.oid || 
          (profile as any)?.oid ||
          undefined

        const email = user.email?.toLowerCase()

        console.log('🔍 Extracted claims:', { 
          tenantId, 
          oid, 
          email,
          hasAccount: !!account,
          hasProfile: !!profile
        })

        if (!email) {
          console.error('❌ SignIn denied: no email')
          return false
        }

        if (!tenantId) {
          console.error('❌ SignIn denied: tenant ID not found in token')
          console.error('Account object:', JSON.stringify(account, null, 2))
          console.error('Profile object:', JSON.stringify(profile, null, 2))
          // In development, allow for testing
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Allowing login in development despite missing tenant ID')
          } else {
            return false
          }
        }

        // Check tenant allowlist (database or env var)
        const tenantAllowed = await isTenantAllowed(tenantId)
        if (!tenantAllowed) {
          console.error(`❌ SignIn denied: tenant ${tenantId} not in allowlist`)
          return false // Deny access - tenant not allowed
        }

        // Find or create user
        let dbUser = await prisma.user.findUnique({
          where: { email },
        })

        if (!dbUser) {
          // First login - create guest user with NONE role
          console.log(`✅ Creating new guest user: ${email} (tenant: ${tenantId})`)
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split('@')[0],
              role: 'NONE', // Guest role - no permissions
              tenantId,
              oid,
            },
          })

          // Log audit trail
          const { createAuditLog } = await import('./audit')
          await createAuditLog({
            actorId: dbUser.id,
            action: 'LOGIN',
            meta: {
              email,
              tenantId,
              firstLogin: true,
              message: 'New user created as guest (role=NONE)',
            },
          })
        } else {
          // Existing user - update Azure AD fields if needed
          if (dbUser.tenantId !== tenantId || dbUser.oid !== oid) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                tenantId,
                oid,
                name: user.name || dbUser.name,
              },
            })
          }

          // Log audit trail
          const { createAuditLog } = await import('./audit')
          await createAuditLog({
            actorId: dbUser.id,
            action: 'LOGIN',
            meta: { email, tenantId },
          })
        }

        return true
      } catch (error) {
        console.error('❌ SignIn error:', error)
        return false
      }
    },

    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: {
            memberships: {
              include: {
                entity: true,
              },
            },
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.tenantId = dbUser.tenantId ?? undefined
          token.oid = dbUser.oid ?? undefined
          token.memberships = dbUser.memberships.map(m => ({
            entityId: m.entityId,
            entityName: m.entity.name,
            canEdit: m.canEdit,
          }))
        }
      }

      // Refresh user data on each token refresh (to get updated roles/memberships)
      if (token.email && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: {
            memberships: {
              include: {
                entity: true,
              },
            },
          },
        })

        if (dbUser) {
          token.role = dbUser.role
          token.memberships = dbUser.memberships.map(m => ({
            entityId: m.entityId,
            entityName: m.entity.name,
            canEdit: m.canEdit,
          }))
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.tenantId = token.tenantId as string | undefined
        session.user.oid = token.oid as string | undefined
        session.user.memberships = (token.memberships as any) || []
        session.user.twoFAEnabled = false
      }
      return session
    },
  },
  events: {
    async signOut({ token }) {
      // Log de logout
      if (token?.id) {
        const { createAuditLog } = await import('./audit')
        await createAuditLog({
          actorId: token.id as string,
          action: 'LOGOUT',
          meta: { email: token.email },
        })
      }
    },
  },
}

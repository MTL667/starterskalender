import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Building2, Users, Settings, Mail, FileText, Briefcase, Ban, Shield, Package, MailOpen, Palette, Clock, CheckSquare, Stethoscope, FileSignature } from 'lucide-react'

export default async function AdminPage() {
  const user = await requireAdmin().catch(() => null)
  
  if (!user) {
    redirect('/dashboard')
  }

  const t = await getTranslations('admin')

  const organisationSections = [
    {
      title: t('entities'),
      description: t('entitiesDescription'),
      icon: Building2,
      href: '/admin/entities',
    },
    {
      title: t('roles'),
      description: t('rolesDescription'),
      icon: Briefcase,
      href: '/admin/job-roles',
    },
    {
      title: t('users'),
      description: t('usersDescription'),
      icon: Users,
      href: '/admin/users',
    },
    {
      title: t('materials'),
      description: t('materialsDescription'),
      icon: Package,
      href: '/admin/materials',
    },
    {
      title: t('taskAssignments'),
      description: t('taskAssignmentsDescription'),
      icon: CheckSquare,
      href: '/admin/task-assignments',
    },
    {
      title: t('signatureTemplates'),
      description: t('signatureTemplatesDescription'),
      icon: FileSignature,
      href: '/admin/signature-templates',
    },
    {
      title: t('blockedPeriods'),
      description: t('blockedPeriodsDescription'),
      icon: Ban,
      href: '/admin/blocked-periods',
    },
  ]

  const systemSections = [
    {
      title: t('auditLog'),
      description: t('auditLogDescription'),
      icon: FileText,
      href: '/admin/audit-log',
    },
    {
      title: t('tenants'),
      description: t('tenantsDescription'),
      icon: Shield,
      href: '/admin/allowed-tenants',
    },
    {
      title: t('branding'),
      description: t('brandingDescription'),
      icon: Palette,
      href: '/admin/branding',
    },
    {
      title: t('cronJobs'),
      description: t('cronJobsDescription'),
      icon: Clock,
      href: '/admin/cron-jobs',
    },
    {
      title: t('taskDiagnostics'),
      description: t('taskDiagnosticsDescription'),
      icon: Stethoscope,
      href: '/admin/task-diagnostics',
    },
    {
      title: t('dropdowns'),
      description: t('dropdownsDescription'),
      icon: Settings,
      href: '/admin/dropdowns',
    },
    {
      title: t('emailTest'),
      description: t('emailTestDescription'),
      icon: Mail,
      href: '/admin/mail-test',
    },
    {
      title: t('emailTemplates'),
      description: t('emailTemplatesDescription'),
      icon: MailOpen,
      href: '/admin/email-templates',
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Organisatie Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">{t('organization')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organisationSections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.href} href={section.href}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* System Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">{t('systemManagement')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systemSections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.href} href={section.href}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}


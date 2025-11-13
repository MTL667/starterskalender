import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Building2, Users, Settings, Mail, FileText, Briefcase, Ban, Shield, Package, MailOpen, Palette, Clock, CheckSquare } from 'lucide-react'

export default async function AdminPage() {
  const user = await requireAdmin().catch(() => null)
  
  if (!user) {
    redirect('/dashboard')
  }

  const organisationSections = [
    {
      title: 'Entiteiten',
      description: 'Beheer entiteiten, kleuren en e-mailnotificaties',
      icon: Building2,
      href: '/admin/entities',
    },
    {
      title: 'Functies',
      description: 'Beheer functies per entiteit',
      icon: Briefcase,
      href: '/admin/job-roles',
    },
    {
      title: 'Gebruikers',
      description: 'Beheer gebruikers, rollen en toegangsrechten',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Materialen',
      description: 'Beheer benodigde materialen voor functies',
      icon: Package,
      href: '/admin/materials',
    },
    {
      title: 'Taak Verantwoordelijken',
      description: 'Configureer wie verantwoordelijk is voor welke taken',
      icon: CheckSquare,
      href: '/admin/task-assignments',
    },
    {
      title: 'Periode Blokkades',
      description: 'Blokkeer periodes voor entiteiten en functies',
      icon: Ban,
      href: '/admin/blocked-periods',
    },
  ]

  const systemSections = [
    {
      title: 'Audit Log',
      description: 'Bekijk de audit trail van alle acties',
      icon: FileText,
      href: '/admin/audit-log',
    },
    {
      title: 'Azure AD Tenants',
      description: 'Beheer welke organisaties toegang hebben',
      icon: Shield,
      href: '/admin/allowed-tenants',
    },
    {
      title: 'Branding',
      description: 'Pas het logo en de uitstraling aan',
      icon: Palette,
      href: '/admin/branding',
    },
    {
      title: 'Cron Jobs',
      description: 'Handmatig email notificaties versturen',
      icon: Clock,
      href: '/admin/cron-jobs',
    },
    {
      title: 'Dropdowns',
      description: 'Beheer dropdown opties voor regio, via, etc.',
      icon: Settings,
      href: '/admin/dropdowns',
    },
    {
      title: 'E-mail Test',
      description: 'Verstuur een test e-mail via SendGrid',
      icon: Mail,
      href: '/admin/mail-test',
    },
    {
      title: 'E-mailtemplates',
      description: 'Beheer email templates voor notificaties',
      icon: MailOpen,
      href: '/admin/email-templates',
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted-foreground">
          Beheer de applicatie instellingen en data
        </p>
      </div>

      {/* Organisatie Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Organisatie</h2>
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
          <h2 className="text-2xl font-semibold">Systeembeheer</h2>
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


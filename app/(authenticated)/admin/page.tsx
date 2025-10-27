import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Building2, Users, Settings, Mail, FileText, Briefcase, Ban, Shield, Package, MailOpen } from 'lucide-react'

export default async function AdminPage() {
  const user = await requireAdmin().catch(() => null)
  
  if (!user) {
    redirect('/dashboard')
  }

  const adminSections = [
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
      title: 'Periode Blokkades',
      description: 'Blokkeer periodes voor entiteiten en functies',
      icon: Ban,
      href: '/admin/blocked-periods',
    },
    {
      title: 'Materialen',
      description: 'Beheer benodigde materialen voor functies',
      icon: Package,
      href: '/admin/materials',
    },
    {
      title: 'Email Templates',
      description: 'Beheer email templates voor notificaties',
      icon: MailOpen,
      href: '/admin/email-templates',
    },
    {
      title: 'Azure AD Tenants',
      description: 'Beheer welke organisaties toegang hebben',
      icon: Shield,
      href: '/admin/allowed-tenants',
    },
    {
      title: 'Gebruikers',
      description: 'Beheer gebruikers, rollen en toegangsrechten',
      icon: Users,
      href: '/admin/users',
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
      title: 'Audit Log',
      description: 'Bekijk de audit trail van alle acties',
      icon: FileText,
      href: '/admin/audit-log',
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => {
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
  )
}


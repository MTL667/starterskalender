'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface AllowedTenant {
  id: string
  tenantId: string
  tenantName: string
  domain?: string | null
  isActive: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export default function AllowedTenantsPage() {
  const [tenants, setTenants] = useState<AllowedTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    tenantId: '',
    tenantName: '',
    domain: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/allowed-tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data)
      }
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setFormData({
      tenantId: '',
      tenantName: '',
      domain: '',
      notes: '',
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setError(null)

      const res = await fetch('/api/admin/allowed-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setDialogOpen(false)
      loadTenants()
    } catch (error) {
      console.error('Error saving:', error)
      setError(error instanceof Error ? error.message : 'Fout bij opslaan')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/allowed-tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!res.ok) throw new Error('Failed to update')
      loadTenants()
    } catch (error) {
      console.error('Error updating:', error)
      alert('Fout bij updaten')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze tenant wilt verwijderen uit de allowlist?')) return

    try {
      const res = await fetch(`/api/admin/allowed-tenants/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')
      loadTenants()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Fout bij verwijderen')
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Azure AD Tenant Allowlist</h1>
        <p className="text-muted-foreground">
          Beheer welke Azure AD tenants (organisaties) toegang hebben tot de applicatie
        </p>
      </div>

      <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Hoe werkt het?</strong><br />
          Alleen gebruikers van tenants in deze lijst kunnen inloggen. Nieuwe gebruikers krijgen automatisch role=NONE en moeten door een admin worden goedgekeurd.
          <br /><br />
          <strong>Tenant ID vinden:</strong> Azure Portal → Azure Active Directory → Overview → Tenant ID
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Toegestane Tenants ({tenants.length})</CardTitle>
              <CardDescription>
                Beheer de allowlist van Azure AD organisaties
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Tenant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Laden...</p>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nog geen tenants in de allowlist
              </p>
              <Button onClick={handleNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Voeg eerste tenant toe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-start justify-between p-4 border rounded-lg ${
                    tenant.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{tenant.tenantName}</h3>
                      {tenant.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Actief
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactief
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Tenant ID:</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">
                          {tenant.tenantId}
                        </code>
                      </div>
                      {tenant.domain && (
                        <div>
                          <span className="font-medium">Domain:</span> {tenant.domain}
                        </div>
                      )}
                      {tenant.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="font-medium">Notities:</span>
                          <p className="mt-1 whitespace-pre-wrap">{tenant.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                    >
                      {tenant.isActive ? 'Deactiveren' : 'Activeren'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tenant.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe Tenant Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een Azure AD tenant toe aan de allowlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="tenantId">Tenant ID *</Label>
              <Input
                id="tenantId"
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="12345678-1234-1234-1234-123456789abc"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Azure Portal → Azure AD → Overview → Tenant ID
              </p>
            </div>

            <div>
              <Label htmlFor="tenantName">Organisatie Naam *</Label>
              <Input
                id="tenantName"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <Label htmlFor="domain">Primary Domain (optioneel)</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="acme.com"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notities (optioneel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Interne notities over deze organisatie..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.tenantId || !formData.tenantName}
            >
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


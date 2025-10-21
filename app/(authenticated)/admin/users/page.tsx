'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserPlus, Trash2, Building2 } from 'lucide-react'
import Link from 'next/link'
import { UserMembershipsDialog } from '@/components/admin/user-memberships-dialog'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  lastLoginAt: string | null
  memberships: {
    id: string
    entityId: string
    canEdit: boolean
    entity: {
      name: string
    }
  }[]
}

interface Entity {
  id: string
  name: string
}

const ROLES = [
  { value: 'HR_ADMIN', label: 'HR Admin' },
  { value: 'ENTITY_EDITOR', label: 'Entity Editor' },
  { value: 'ENTITY_VIEWER', label: 'Entity Viewer' },
  { value: 'GLOBAL_VIEWER', label: 'Global Viewer' },
  { value: 'NONE', label: 'None (Guest - No Access)' },
]

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [membershipsDialogOpen, setMembershipsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ENTITY_VIEWER',
  })

  useEffect(() => {
    fetchUsers()
    fetchEntities()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/entities')
      if (res.ok) {
        const data = await res.json()
        setEntities(data)
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setDialogOpen(false)
      setFormData({ name: '', email: '', password: '', role: 'ENTITY_VIEWER' })
      fetchUsers()
      alert('Gebruiker succesvol aangemaakt!')
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error instanceof Error ? error.message : 'Fout bij aanmaken gebruiker')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) throw new Error('Failed to update role')

      fetchUsers()
      alert('Rol succesvol bijgewerkt!')
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Fout bij updaten rol')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete user')

      fetchUsers()
      alert('Gebruiker verwijderd')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Fout bij verwijderen gebruiker')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'HR_ADMIN':
        return 'bg-red-100 text-red-800'
      case 'ENTITY_EDITOR':
        return 'bg-blue-100 text-blue-800'
      case 'ENTITY_VIEWER':
        return 'bg-green-100 text-green-800'
      case 'GLOBAL_VIEWER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Admin
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gebruikers & Rechten</CardTitle>
              <CardDescription>
                Beheer gebruikers en hun rollen
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nieuwe Gebruiker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laden...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nog geen gebruikers
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{user.name || 'Geen naam'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.lastLoginAt && (
                          <p className="text-xs text-muted-foreground">
                            Laatste login: {new Date(user.lastLoginAt).toLocaleString('nl-BE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                      </Badge>
                    </div>
                    {user.memberships.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Entiteiten: {user.memberships.map(m => m.entity.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setMembershipsDialogOpen(true)
                      }}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Entiteiten
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Gebruiker</DialogTitle>
            <DialogDescription>
              Maak een nieuw gebruikersaccount aan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimaal 6 tekens"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Bezig...' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Memberships Dialog */}
      {selectedUser && (
        <UserMembershipsDialog
          open={membershipsDialogOpen}
          onClose={() => {
            setMembershipsDialogOpen(false)
            setSelectedUser(null)
            fetchUsers() // Refresh to show updated memberships
          }}
          userId={selectedUser.id}
          userName={selectedUser.name || selectedUser.email}
        />
      )}
    </div>
  )
}

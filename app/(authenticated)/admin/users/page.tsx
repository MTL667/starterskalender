'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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

function getRoleLabel(role: string): string {
  return ROLES.find(r => r.value === role)?.label || role
}

export default function UsersAdminPage() {
  const t = useTranslations('adminUsers')
  const tc = useTranslations('common')
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
      alert(t('userCreated'))
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error instanceof Error ? error.message : t('errorCreating'))
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
      alert(t('roleUpdated'))
    } catch (error) {
      console.error('Error updating role:', error)
      alert(t('errorUpdatingRole'))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('confirmDeleteUser'))) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete user')

      fetchUsers()
      alert(t('userDeleted'))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(t('errorDeletingUser'))
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

  // Sort users: first by role (in ROLES order), then alphabetically by name
  const sortedUsers = [...users].sort((a, b) => {
    // Get role order from ROLES array
    const roleOrderA = ROLES.findIndex(r => r.value === a.role)
    const roleOrderB = ROLES.findIndex(r => r.value === b.role)
    
    // If roles are different, sort by role order
    if (roleOrderA !== roleOrderB) {
      return roleOrderA - roleOrderB
    }
    
    // If roles are the same, sort alphabetically by name
    const nameA = (a.name || a.email).toLowerCase()
    const nameB = (b.name || b.email).toLowerCase()
    return nameA.localeCompare(nameB)
  })

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
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('subtitle')}
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('newUser')}
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
              {sortedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{user.name || t('noName')}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.lastLoginAt && (
                          <p className="text-xs text-muted-foreground">
                            {t('lastLogin')}: {new Date(user.lastLoginAt).toLocaleString('nl-BE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    {user.memberships.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {t('entities')}: {user.memberships.map(m => m.entity.name).join(', ')}
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
                      {t('entities')}
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
            <DialogTitle>{t('newUserTitle')}</DialogTitle>
            <DialogDescription>
              {t('newUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{tc('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">{t('emailAddress')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('passwordPlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">{t('role')}</Label>
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
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc('saving') : t('create')}
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

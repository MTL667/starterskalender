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
import { ArrowLeft, UserPlus, Trash2, Building2, Search, X, Bell, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { UserMembershipsDialog } from '@/components/admin/user-memberships-dialog'
import { UserNotificationPrefsDialog } from '@/components/admin/user-notification-prefs-dialog'
import { UserRolesDialog } from '@/components/admin/user-roles-dialog'

interface RoleInfo {
  id: string
  key: string
  name: string
  isSystem: boolean
  bypassEntityScope: boolean
}

interface RoleAssignment {
  id: string
  entityIds: string[]
  grantedAt: string
  expiresAt: string | null
  role: RoleInfo
}

interface User {
  id: string
  email: string
  name: string | null
  locale: string
  roleAssignments: RoleAssignment[]
  createdAt: string
  lastLoginAt: string | null
  memberships: {
    id: string
    entityId: string
    canEdit: boolean
    entity: { id: string; name: string }
  }[]
}

interface Entity {
  id: string
  name: string
}

interface AvailableRole {
  id: string
  key: string
  name: string
  isSystem: boolean
  bypassEntityScope: boolean
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  'hr-admin': 'bg-red-100 text-red-800',
  'entity-editor': 'bg-blue-100 text-blue-800',
  'entity-viewer': 'bg-green-100 text-green-800',
  'global-viewer': 'bg-purple-100 text-purple-800',
  'material-manager': 'bg-amber-100 text-amber-800',
}

const ROLE_PRIORITY: Record<string, number> = {
  'hr-admin': 0,
  'global-viewer': 1,
  'entity-editor': 2,
  'entity-viewer': 3,
  'material-manager': 4,
}

const NO_ROLE = '__none__'

function getPrimaryRolePriority(user: User): number {
  if (user.roleAssignments.length === 0) return 99
  return Math.min(
    ...user.roleAssignments.map((ra) => ROLE_PRIORITY[ra.role.key] ?? 50),
  )
}

export default function UsersAdminPage() {
  const t = useTranslations('adminUsers')
  const tc = useTranslations('common')
  const [users, setUsers] = useState<User[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [allRoles, setAllRoles] = useState<AvailableRole[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [membershipsDialogOpen, setMembershipsDialogOpen] = useState(false)
  const [notifPrefsDialogOpen, setNotifPrefsDialogOpen] = useState(false)
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleKey: '',
  })

  useEffect(() => {
    fetchUsers()
    fetchEntities()
    fetchRoles()
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

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.roles)) setAllRoles(data.roles)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleKey: formData.roleKey || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setDialogOpen(false)
      setFormData({ name: '', email: '', password: '', roleKey: '' })
      fetchUsers()
      alert(t('userCreated'))
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error instanceof Error ? error.message : t('errorCreating'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLocale = async (userId: string, newLocale: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })
      if (!res.ok) throw new Error('Failed to update locale')
      fetchUsers()
    } catch (error) {
      console.error('Error updating locale:', error)
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

  function getUserEntityNames(user: User): string[] {
    const hasGlobal = user.roleAssignments.some(
      (ra) => ra.role.bypassEntityScope || ra.entityIds.length === 0,
    )
    if (hasGlobal) return []

    const entityIds = new Set(user.roleAssignments.flatMap((ra) => ra.entityIds))
    return [...entityIds]
      .map((id) => entities.find((e) => e.id === id)?.name)
      .filter((n): n is string => !!n)
      .sort()
  }

  const filteredAndSortedUsers = [...users]
    .filter((user) => {
      if (roleFilter === NO_ROLE) {
        if (user.roleAssignments.length > 0) return false
      } else if (roleFilter !== 'ALL') {
        if (!user.roleAssignments.some((ra) => ra.role.key === roleFilter)) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = user.name?.toLowerCase().includes(q)
        const matchesEmail = user.email.toLowerCase().includes(q)
        const matchesRole = user.roleAssignments.some((ra) =>
          ra.role.name.toLowerCase().includes(q),
        )
        const entityNames = getUserEntityNames(user)
        const matchesEntity = entityNames.some((name) =>
          name.toLowerCase().includes(q),
        )
        if (!matchesName && !matchesEmail && !matchesRole && !matchesEntity) return false
      }
      return true
    })
    .sort((a, b) => {
      const priorityA = getPrimaryRolePriority(a)
      const priorityB = getPrimaryRolePriority(b)
      if (priorityA !== priorityB) return priorityA - priorityB
      const nameA = (a.name || a.email).toLowerCase()
      const nameB = (b.name || b.email).toLowerCase()
      return nameA.localeCompare(nameB)
    })

  const filterRoles =
    allRoles.length > 0
      ? allRoles
      : [
          ...new Map(
            users
              .flatMap((u) => u.roleAssignments.map((ra) => [ra.role.key, ra.role]))
              .map(([key, role]) => [key, role] as [string, RoleInfo]),
          ).values(),
        ]

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
              <CardDescription>{t('subtitle')}</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('newUser')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allRoles')}</SelectItem>
                <SelectItem value={NO_ROLE}>Geen rollen</SelectItem>
                {filterRoles.map((role) => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laden...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nog geen gebruikers
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noResults')}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('showingCount', { count: filteredAndSortedUsers.length, total: users.length })}
              </p>
              {filteredAndSortedUsers.map((user) => {
                const entityNames = getUserEntityNames(user)
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {user.roleAssignments.length > 0 ? (
                          user.roleAssignments.map((ra) => (
                            <Badge
                              key={ra.id}
                              className={
                                ROLE_BADGE_COLORS[ra.role.key] ?? 'bg-gray-100 text-gray-800'
                              }
                            >
                              {ra.role.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Geen rollen
                          </Badge>
                        )}
                      </div>
                      {entityNames.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {t('entities')}: {entityNames.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-[52px] font-medium text-xs"
                        onClick={() =>
                          handleUpdateLocale(user.id, user.locale === 'fr' ? 'nl' : 'fr')
                        }
                        title={
                          user.locale === 'fr'
                            ? 'Taal: Frans → Nederlands'
                            : 'Langue: Néerlandais → Français'
                        }
                      >
                        {user.locale === 'fr' ? '🇫🇷 FR' : '🇳🇱 NL'}
                      </Button>
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
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setRolesDialogOpen(true)
                        }}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Rollen
                      </Button>
                      {user.roleAssignments.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setNotifPrefsDialogOpen(true)
                          }}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          {t('notifications')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newUserTitle')}</DialogTitle>
            <DialogDescription>{t('newUserDescription')}</DialogDescription>
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
                  value={formData.roleKey || NO_ROLE}
                  onValueChange={(value) =>
                    setFormData({ ...formData, roleKey: value === NO_ROLE ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROLE}>Geen (gast)</SelectItem>
                    {allRoles.map((role) => (
                      <SelectItem key={role.key} value={role.key}>
                        {role.name}
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

      {selectedUser && (
        <UserMembershipsDialog
          open={membershipsDialogOpen}
          onClose={() => {
            setMembershipsDialogOpen(false)
            setSelectedUser(null)
            fetchUsers()
          }}
          userId={selectedUser.id}
          userName={selectedUser.name || selectedUser.email}
        />
      )}

      {selectedUser && (
        <UserNotificationPrefsDialog
          open={notifPrefsDialogOpen}
          onClose={() => {
            setNotifPrefsDialogOpen(false)
            setSelectedUser(null)
          }}
          userId={selectedUser.id}
          userName={selectedUser.name || selectedUser.email}
        />
      )}

      {selectedUser && (
        <UserRolesDialog
          open={rolesDialogOpen}
          onClose={() => {
            setRolesDialogOpen(false)
            setSelectedUser(null)
            fetchUsers()
          }}
          userId={selectedUser.id}
          userName={selectedUser.name || selectedUser.email}
        />
      )}
    </div>
  )
}

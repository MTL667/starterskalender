export type StarterType = 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
export type StarterFilter = 'ALL' | 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'

export interface EntityRef {
  id: string
  name: string
  colorHex: string
}

export interface Starter {
  id: string
  type?: StarterType
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string | null
  weekNumber: number | null
  isPendingBoarding?: boolean
  isCancelled?: boolean
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
  phoneNumber?: string | null
  desiredEmail?: string | null
  entity?: EntityRef | null
}

export interface TaskStarter {
  id: string
  name: string
  startDate: string
  notes?: string | null
  entity?: EntityRef
}

export interface TaskAssignee {
  id: string
  name: string
  email: string
}

export interface Task {
  id: string
  type: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  completedAt?: string
  assignedAt?: string
  starter?: TaskStarter
  entity?: EntityRef
  assignedTo?: TaskAssignee
  completedBy?: TaskAssignee
  blockedReason?: string
  completionNotes?: string
}

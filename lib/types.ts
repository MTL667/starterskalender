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
  firstName: string
  lastName: string
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
  firstName: string
  lastName: string
  startDate: string
  notes?: string | null
  entity?: EntityRef
}

export interface TaskAssignee {
  id: string
  name: string
  email: string
}

export interface TaskDependency {
  id: string
  title: string
  type: string
  status: string
  assignedTo?: TaskAssignee | null
  completedAt?: string | null
}

export interface StarterTaskUpload {
  id: string
  taskId: string
  fileName: string
  sharePointPath: string
  mimeType?: string | null
  sizeBytes?: number | null
  variant?: string | null
  uploadedAt: string
  uploadedById?: string | null
}

export interface TaskReassignmentEntry {
  id: string
  taskId: string
  fromUserId?: string | null
  toUserId?: string | null
  reassignedById?: string | null
  reason?: string | null
  reassignedAt: string
}

export interface TaskTemplateMeta {
  id: string
  dependsOnTemplateIds: string[]
  scheduleType: string
  addToCalendar: boolean
  uploadFolder?: string | null
  expectedOutputs?: string[] | null
}

export interface Task {
  id: string
  type: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  scheduledFor?: string | null
  completedAt?: string
  assignedAt?: string
  starter?: TaskStarter
  entity?: EntityRef
  assignedTo?: TaskAssignee
  completedBy?: TaskAssignee
  blockedReason?: string
  completionNotes?: string
  dependsOnTaskIds?: string[]
  dependencies?: TaskDependency[]
  template?: TaskTemplateMeta | null
  uploads?: StarterTaskUpload[]
  reassignHistory?: TaskReassignmentEntry[]
}

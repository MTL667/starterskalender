export const taskTypeKeys: Record<string, string> = {
  IT_SETUP: 'itSetup',
  HR_ADMIN: 'hrAdmin',
  FACILITIES: 'facilities',
  MANAGER_ACTION: 'managerAction',
  CUSTOM: 'custom',
  MARKETING_PHOTO: 'marketingPhoto',
  MARKETING_EDIT: 'marketingEdit',
  MARKETING_UTM: 'marketingUtm',
  MARKETING_VCARD: 'marketingVcard',
  MARKETING_VISITEKAARTJE: 'marketingVisitekaartje',
  MARKETING_BADGE: 'marketingBadge',
  MARKETING_NFC: 'marketingNfc',
  MARKETING_SIGNATURE: 'marketingSignature',
}

export const priorityKeys: Record<string, string> = {
  LOW: 'priorityLow',
  MEDIUM: 'priorityNormal',
  HIGH: 'priorityHigh',
  URGENT: 'priorityUrgent',
}

export const statusKeys: Record<string, string> = {
  PENDING: 'queued',
  IN_PROGRESS: 'inProgress',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'LOW':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

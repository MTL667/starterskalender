export const RECRUITMENT_PERMISSIONS = {
  READ: 'recruitment:read',
  WRITE: 'recruitment:write',
  ADMIN: 'recruitment:admin',
  VACANCY_CREATE: 'vacancy:create',
  VACANCY_EDIT: 'vacancy:edit',
  VACANCY_PUBLISH: 'vacancy:publish',
  VACANCY_DELETE: 'vacancy:delete',
  CANDIDATE_READ: 'candidate:read',
  CANDIDATE_WRITE: 'candidate:write',
  CANDIDATE_SHARE: 'candidate:share',
} as const

export type RecruitmentPermission = (typeof RECRUITMENT_PERMISSIONS)[keyof typeof RECRUITMENT_PERMISSIONS]

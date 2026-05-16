export interface ShareTemplate {
  id: string
  name: string
  description: string
  visibleFields: string[]
}

export const DEFAULT_SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'technical-review',
    name: 'Technical Review',
    description: 'CV, motivation, scores, and source information',
    visibleFields: ['cv', 'motivation', 'niceToHaveScore', 'dealbreakersResult', 'source', 'stage'],
  },
  {
    id: 'hr-review',
    name: 'HR Review',
    description: 'Full personal and professional information',
    visibleFields: [
      'firstName', 'lastName', 'email', 'phone',
      'cv', 'motivation',
      'niceToHaveScore', 'dealbreakersResult', 'source',
      'stage', 'appliedAt',
    ],
  },
]

import { z } from 'zod'

export const requirementItemSchema = z.object({
  text: z.string().max(500),
  tag: z.enum(['dealbreaker', 'nice-to-have']),
})

export const benefitItemSchema = z.object({
  icon: z.string().max(50),
  text: z.string().max(500),
})

export const mediaContentSchema = z.object({
  driveId: z.string().min(1),
  itemId: z.string().min(1),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const contentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'list', 'requirements', 'benefits', 'media']),
  content: z.union([
    z.string(),
    z.array(z.string()),
    z.object({ items: z.array(requirementItemSchema) }),
    z.object({ items: z.array(benefitItemSchema) }),
    mediaContentSchema,
    z.null(),
  ]),
  order: z.number().int().min(0),
})

export const vacancyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  entityId: z.string().cuid(),
  functionId: z.string().cuid().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  templateId: z.string().cuid().optional().nullable(),
  content: z.array(contentBlockSchema).max(50).optional(),
})

const vacancyDealbreakerBooleanSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  type: z.literal('boolean'),
  requiredValue: z.boolean(),
  label: z.string().max(500),
})

const vacancyDealbreakerMinimumSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  type: z.literal('minimum'),
  requiredValue: z.number(),
  label: z.string().max(500),
})

const vacancyDealbreakerSelectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  type: z.literal('selection'),
  requiredValue: z.array(z.string().min(1)),
  label: z.string().max(500),
})

export const vacancyDealbreakerSchema = z.discriminatedUnion('type', [
  vacancyDealbreakerBooleanSchema,
  vacancyDealbreakerMinimumSchema,
  vacancyDealbreakerSelectionSchema,
])

export const vacancyNiceToHaveSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  type: z.enum(['scale', 'boolean', 'selection']),
  weight: z.number().int().min(1).max(10),
})

export const vacancyScorecardCriterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  description: z.string().max(1000).default(''),
  weight: z.number().int().min(1).max(5),
  order: z.number().int().min(0),
})

export const vacancyUpdateSchema = vacancyCreateSchema.partial().extend({
  content: z.array(contentBlockSchema).max(50).optional(),
  dealbreakers: z.array(vacancyDealbreakerSchema).max(20).optional(),
  niceToHaves: z.array(vacancyNiceToHaveSchema).max(20).optional(),
  scorecardCriteria: z.array(vacancyScorecardCriterionSchema).max(20).optional(),
})

const templateStageSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
})

const dealbreakerItemSchema = z.object({
  text: z.string().min(1).max(500),
})

const niceToHaveItemSchema = z.object({
  text: z.string().min(1).max(500),
  weight: z.number().int().min(1).max(10),
})

export const vacancyTemplateCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  entityId: z.string().cuid(),
  functionId: z.string().cuid().optional().nullable(),
  content: z.array(contentBlockSchema).max(50).optional(),
  stages: z.array(templateStageSchema).max(20).optional(),
  dealbreakers: z.array(dealbreakerItemSchema).max(30).optional(),
  niceToHaves: z.array(niceToHaveItemSchema).max(30).optional(),
  scorecardCriteria: z.array(vacancyScorecardCriterionSchema).max(20).optional(),
})

export const vacancyTemplateUpdateSchema = vacancyTemplateCreateSchema.partial()

export const stageCreateSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  triggersEmail: z.boolean(),
})

export const stageUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  triggersEmail: z.boolean().optional(),
})

export const stageReorderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })
).min(1)

export const vacancyPublishActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'close']),
})

export const candidateCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').max(254),
  phone: z.string().max(50).optional().nullable(),
  source: z.enum(['DIRECT', 'REFERRAL', 'LINKEDIN', 'OTHER']).default('DIRECT'),
  notes: z.string().max(2000).optional().nullable(),
})

export const evaluationScoreSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().int().min(1).max(5),
})

export const evaluateSubmitSchema = z.object({
  scores: z.array(evaluationScoreSchema).min(1).max(20),
  comment: z.string().max(5000).optional().nullable(),
})

export const recruitmentEmailTemplateCreateSchema = z.object({
  entityId: z.string().min(1),
  type: z.enum(['STAGE_TRANSITION', 'APPLICATION_CONFIRMATION', 'REJECTION']),
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  isActive: z.boolean().default(false),
})

export const recruitmentEmailTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  isActive: z.boolean().optional(),
})

export const recruitmentEmailPreviewSchema = z.object({
  body: z.string().min(1).max(50000),
  subject: z.string().max(500).optional(),
})

export type VacancyCreateInput = z.infer<typeof vacancyCreateSchema>
export type VacancyUpdateInput = z.infer<typeof vacancyUpdateSchema>
export type ContentBlockInput = z.infer<typeof contentBlockSchema>
export type VacancyTemplateCreateInput = z.infer<typeof vacancyTemplateCreateSchema>
export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>
export type RecruitmentEmailTemplateCreateInput = z.infer<typeof recruitmentEmailTemplateCreateSchema>
export type RecruitmentEmailTemplateUpdateInput = z.infer<typeof recruitmentEmailTemplateUpdateSchema>

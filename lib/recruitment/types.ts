import type { Vacancy, VacancyStage, VacancyTemplate, Entity, JobRole, User, Candidate, CandidateApplication, CandidateSource, DealbreakersResult } from '@prisma/client'

export type VacancyWithRelations = Vacancy & {
  entity: Entity
  stages: VacancyStage[]
  function?: JobRole | null
  createdBy?: Pick<User, 'id' | 'name' | 'email'>
}

export type VacancyStageWithCounts = VacancyStage & {
  _count?: { candidates: number }
}

export interface RequirementItem {
  text: string
  tag: 'dealbreaker' | 'nice-to-have'
}

export interface BenefitItem {
  icon: string
  text: string
}

export type VacancyTemplateWithRelations = VacancyTemplate & {
  entity: Entity
  function?: JobRole | null
  createdBy?: Pick<User, 'id' | 'name' | 'email'>
}

export interface TemplateStage {
  name: string
  order: number
}

export interface DealbreakerItem {
  text: string
}

export interface NiceToHaveItem {
  text: string
  weight: number
}

export interface VacancyDealbreaker {
  id: string
  name: string
  type: 'boolean' | 'minimum' | 'selection'
  requiredValue: boolean | number | string[]
  label: string
}

export interface VacancyNiceToHave {
  id: string
  name: string
  type: 'scale' | 'boolean' | 'selection'
  weight: number
}

export interface VacancyScorecardCriterion {
  id: string
  name: string
  description: string
  weight: number // 1–5 importance
  order: number
}

export interface EvaluationScore {
  criterionId: string
  score: 1 | 2 | 3 | 4 | 5
}

export interface CriterionResponse {
  criterionId: string
  value: boolean | number | string | string[]
}

export interface VacancyPublishValidationError {
  field: 'title' | 'content' | 'stages'
  message: string
}

export interface MediaContent {
  driveId: string
  itemId: string
  fileName: string
  mimeType: string
  width?: number
  height?: number
}

export interface ContentBlock {
  id: string
  type: 'text' | 'list' | 'requirements' | 'benefits' | 'media'
  content: string | string[] | { items: RequirementItem[] } | { items: BenefitItem[] } | MediaContent | null
  order: number
}

export type CandidateWithStage = Candidate & {
  stage: Pick<VacancyStage, 'id' | 'name' | 'order'>
  createdBy?: Pick<User, 'id' | 'name'>
}

export type { Candidate, CandidateApplication, CandidateSource, DealbreakersResult }

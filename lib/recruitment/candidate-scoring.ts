import { prisma } from '@/lib/prisma'
import type { VacancyDealbreaker, VacancyNiceToHave, CriterionResponse } from './types'
import type { DealbreakersResult } from '@prisma/client'

export function evaluateDealbreakers(
  dealbreakers: VacancyDealbreaker[],
  responses: CriterionResponse[]
): DealbreakersResult {
  if (dealbreakers.length === 0) return 'PASS'

  const responseMap = new Map(responses.map((r) => [r.criterionId, r.value]))

  for (const db of dealbreakers) {
    const answer = responseMap.get(db.id)

    if (answer === undefined || answer === null) return 'FAIL'

    switch (db.type) {
      case 'boolean': {
        const boolVal = answer === true || answer === 'true'
        if (boolVal !== db.requiredValue) return 'FAIL'
        break
      }
      case 'minimum': {
        const numVal = typeof answer === 'number' ? answer : Number(answer)
        if (!Number.isFinite(numVal) || numVal < (db.requiredValue as number)) return 'FAIL'
        break
      }
      case 'selection': {
        const required = db.requiredValue as string[]
        if (required.length === 0) break
        const given = Array.isArray(answer) ? answer : [String(answer)]
        const hasMatch = required.some((r) => given.includes(r))
        if (!hasMatch) return 'FAIL'
        break
      }
    }
  }

  return 'PASS'
}

export function calculateNiceToHaveScore(
  niceToHaves: VacancyNiceToHave[],
  responses: CriterionResponse[]
): number | null {
  if (niceToHaves.length === 0) return null

  const responseMap = new Map(responses.map((r) => [r.criterionId, r.value]))

  let totalWeight = 0
  let weightedScore = 0

  for (const nth of niceToHaves) {
    const answer = responseMap.get(nth.id)
    if (answer === undefined || answer === null) continue

    switch (nth.type) {
      case 'scale': {
        const val = typeof answer === 'number' ? answer : Number(answer)
        if (!Number.isFinite(val)) continue
        totalWeight += nth.weight
        weightedScore += nth.weight * (Math.min(Math.max(val, 0), 5) / 5)
        break
      }
      case 'boolean': {
        const boolVal = answer === true || answer === 'true'
        totalWeight += nth.weight
        weightedScore += nth.weight * (boolVal ? 1 : 0)
        break
      }
      case 'selection': {
        const given = Array.isArray(answer) ? answer : [String(answer)]
        const meaningful = given.filter((v) => v !== '')
        if (meaningful.length === 0) continue
        totalWeight += nth.weight
        weightedScore += nth.weight * 1
        break
      }
    }
  }

  if (totalWeight === 0) return null
  return Math.round(((weightedScore / totalWeight) * 5) * 10) / 10
}

export async function scoreCandidate(
  vacancyId: string,
  candidateId: string
): Promise<{ dealbreakersResult: DealbreakersResult; niceToHaveScore: number | null }> {
  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    select: { dealbreakers: true, niceToHaves: true },
  })

  if (!vacancy) {
    return { dealbreakersResult: 'PENDING', niceToHaveScore: null }
  }

  const application = await prisma.candidateApplication.findFirst({
    where: { candidate: { id: candidateId } },
    select: { responses: true },
  })

  const dealbreakers = Array.isArray(vacancy.dealbreakers)
    ? (vacancy.dealbreakers as unknown as VacancyDealbreaker[])
    : []
  const niceToHaves = Array.isArray(vacancy.niceToHaves)
    ? (vacancy.niceToHaves as unknown as VacancyNiceToHave[])
    : []
  const responses = application?.responses
    ? Array.isArray(application.responses)
      ? (application.responses as unknown as CriterionResponse[])
      : []
    : []

  const dealbreakersResult = evaluateDealbreakers(dealbreakers, responses)
  const niceToHaveScore = calculateNiceToHaveScore(niceToHaves, responses)

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { dealbreakersResult, niceToHaveScore },
  })

  return { dealbreakersResult, niceToHaveScore }
}

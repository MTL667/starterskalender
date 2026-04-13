interface MockStarter {
  id: string
  firstName: string
  lastName: string
  email: string
  startDate: Date
  entityId: string
  weekNumber: number
  year: number
  contractSignedOn: Date
  entity?: { id: string; name: string; colorHex: string }
}

let counter = 0

export function createMockStarter(overrides: Partial<MockStarter> = {}): MockStarter {
  counter++
  const now = new Date()
  const startDate = overrides.startDate || new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    id: `starter-${counter}`,
    firstName: `Starter`,
    lastName: `Test-${counter}`,
    email: `starter${counter}@test.local`,
    startDate,
    entityId: 'entity-1',
    weekNumber: Math.ceil((startDate.getTime() - new Date(startDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    year: startDate.getFullYear(),
    contractSignedOn: new Date(),
    ...overrides,
  }
}

export function createMockStarterWithEntity(overrides: Partial<MockStarter> = {}): MockStarter {
  return createMockStarter({
    entity: { id: 'entity-1', name: 'Aceg', colorHex: '#3B82F6' },
    ...overrides,
  })
}

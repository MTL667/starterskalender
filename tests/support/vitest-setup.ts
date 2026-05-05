import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const starter = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  }
  const entity = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  }
  const jobRole = {
    findUnique: vi.fn(),
  }

  return {
    prisma: {
      starter,
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      entity,
      jobRole,
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      starterDocument: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      notification: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn((fn: (tx: { starter: typeof starter; entity: typeof entity }) => unknown) =>
        fn({ starter, entity }),
      ),
    },
  }
})

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth-options', () => ({
  authOptions: {},
}))

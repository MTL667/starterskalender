import { test as base } from '@playwright/test'
import { ApiClient } from '../helpers/api-client'

type Fixtures = {
  api: ApiClient
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    const client = new ApiClient(request)
    await use(client)
  },
})

export { expect } from '@playwright/test'

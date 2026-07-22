import { test as base } from '@playwright/test'
import { ApiClient } from '../helpers/api-client'

type Fixtures = {
  api: ApiClient
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    const client = new ApiClient(request)
    // Playwright fixture callback named `use` — not a React Hook
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(client)
  },
})

export { expect } from '@playwright/test'

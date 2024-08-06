import type { Routes } from '../commonTypes'

import { publishContent } from './publishController'
import { publishRequestBody, publishResponseBody } from './publishSchemas'
import { apiError } from '../commonSchemas'

export const publishRouteDefinition: Routes = [
  {
    method: 'POST',
    url: '/publish',
    handler: publishContent,
    schema: {
      body: publishRequestBody,
      response: {
        200: publishResponseBody,
        207: publishResponseBody,
        403: apiError,
      },
    },
  },
]

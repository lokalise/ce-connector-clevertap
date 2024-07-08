import z from 'zod'

import { contentItem, itemIdentifiers } from '../commonSchemas'

export const publishRequestBody = z.object({
  items: z.array(contentItem),
  defaultLocale: z.string(),
})

export const publishResponseBody = z.object({
  statusCode: z.number(),
  message: z.string().optional(),
  payload: z
    .object({
      message: z.string(),
      errorCode: z.string(),
      details: z.object({
        errors: z.array(z.object({}).passthrough()),
      }),
    })
    .optional(),
})

export type PublishRequestBodyType = z.infer<typeof publishRequestBody>

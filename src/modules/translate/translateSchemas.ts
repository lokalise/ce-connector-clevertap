import z from 'zod'

import { contentItem, itemIdentifiers } from '../commonSchemas'

export const translateRequestBody = z.object({
  locales: z.array(z.string()),
  items: z.array(itemIdentifiers),
  defaultLocale: z.string(),
})

export const translateResponseBody = z.object({
  statusCode: z.number().optional(),
  items: z.array(contentItem),
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

export type TranslateRequestBodyType = z.infer<typeof translateRequestBody>

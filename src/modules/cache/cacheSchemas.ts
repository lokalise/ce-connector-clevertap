import z from 'zod'

import { itemIdentifiers } from '../commonSchemas'

export const cacheItem = itemIdentifiers.extend({
  fields: z.object({}).passthrough(),
  title: z.string().max(255),
  groupTitle: z.string().max(255),
})

export const listCacheResponseBody = z.object({
  items: z.array(itemIdentifiers),
})

export const cacheResponseBody = z.object({
  statusCode: z.number().optional(),
  items: z.array(cacheItem),
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

export const cacheRequestBody = z.object({
  items: z.array(itemIdentifiers),
})

export const cmsCacheResponseBody = z.object({
  statusCode: z.number().optional(),
  items: z.array(cacheItem),
  payload: z
    .object({
      html: z.string(),
      replacemrnts: z.string(),
      text: z.object({
        errors: z.array(z.object({}).passthrough()),
      }),
    })
    .optional(),
})

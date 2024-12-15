import type z from 'zod'

import type { ApiReply } from '../commonTypes'

import type {
  translateRequestBody,
  translateResponseBody,
  cmsTranslateResponseBody,
} from './translateSchemas'

export type TranslateRequestBody = z.infer<typeof translateRequestBody>
export type TranslateResponseBody = z.infer<typeof translateResponseBody>
export type TranslateContentBlockResponseBody = z.infer<typeof cmsTranslateResponseBody>
export type TranslateResponse = ApiReply<TranslateResponseBody>
export type ContentBlockRequestBody = ApiReply<TranslateContentBlockResponseBody>

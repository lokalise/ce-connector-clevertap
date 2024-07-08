import type z from 'zod'

import type { ApiReply } from '../commonTypes'

import type { getAuthResponseBody } from './authSchemas'

export type GetAuthResponseBody = z.infer<typeof getAuthResponseBody>
export type GetAuthResponse = ApiReply<GetAuthResponseBody>

export type PostAuthResponseBody = Record<string, unknown>
export type PostAuthResponse = ApiReply<PostAuthResponseBody>

export type PostAuthRefreshResponse = ApiReply<PostAuthResponseBody>

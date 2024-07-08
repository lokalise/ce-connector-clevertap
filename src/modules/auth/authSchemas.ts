import z from 'zod'
import { integrationConfig } from '../commonSchemas'

const AUTH_TYPES_AVAILABLE = ['OAuth', 'apiToken'] as const

export const getAuthResponseBody = z.object({
  type: z.enum(AUTH_TYPES_AVAILABLE),
})

export const authRequestBody = integrationConfig

export const postAuthRefreshRequestBody = z.object({}).passthrough()

export const postAuthResponseBody = z.object({}).passthrough()

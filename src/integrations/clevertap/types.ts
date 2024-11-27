import type { IncomingHttpHeaders } from 'http'
import { ClevertapEmailTemplate } from './client/clevertapApiTypes'
import { ItemIdentifiers } from '../../types'

type ExtendedIncomingHttpHeaders = IncomingHttpHeaders & {
  'X-CleverTap-Account-Id': string
  'X-CleverTap-Passcode': string
}

export type UpdateEmailTemplateRequestBody = Partial<ClevertapEmailTemplate> & {
  baseTemplateId: number
  locale: string
}

export type UpdateTemplateParams = {
  accountId: string
  passcode: string
  updateTemplatePayload: UpdateEmailTemplateRequestBody
  templateType: string
}

export type ApiRequest = {
  body?: Record<string, unknown>
  headers: ExtendedIncomingHttpHeaders
  query?: Partial<Record<string, unknown>>
  throwOnError?: boolean
  requestLabel: string
}

export type SuccessMessageResponse = {
  msg: string
  baseTemplateId: number
  locale: string
  status: string
}

export interface CacheItemStructure extends Record<string, string> {
  templateId: string
  updated: string
  creator: string
  templateType: string
}

export interface LocalesAvailable {
  defaultLocale: LocaleDefinition['code']
  locales: LocaleDefinition[]
}

export interface LocaleDefinition {
  name: string
  code: string
}

export type TemplateItemsByTemplateTypeParams = {
  templateType: string
  templates: ClevertapEmailTemplate[]
  items: ItemIdentifiers[]
}

export type ContentBlockItemsByTemplateTypeParams = {
  templateType: string
  templates: ClevertapEmailTemplate[]
  items: ItemIdentifiers[]
}

export type TranslatableTemplatesParams = {
  templateIds: string[]
  locales: string[]
  accountId: string
  passcode: string
  templateType: string
}

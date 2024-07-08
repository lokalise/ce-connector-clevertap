// TODO: fakeIntegration connector 3-rd party mapper types

import { ClevertapEmailTemplate, ClevertapTemplatesListItem } from '../client/clevertapApiTypes'
import { CacheResponseBody } from '../../../modules/cache/cacheTypes'
import { ContentItem, ItemIdentifiers } from '../../../types'

export type CacheResponseBodyItems = CacheResponseBody['items']
export type CacheResponseBodyItem = CacheResponseBodyItems[0]
export type CacheResponseBodyItemField = {
  templateId: number
  updated?: string
  creator?: string
  templateType: string
}

export enum EmailContentTypes {
  Subject = 'subject',
  PreheaderText = 'preheaderText',
  Html = 'html',
}

export enum EmailContentTitles {
  subject = 'Subject',
  preheaderText = 'Preheader text',
  html = 'Html',
}

export type ItemIdentifiersFromTemplates = {
  templates: ClevertapTemplatesListItem[]
  objectType: string
}

export type EmailTemplateRequestBodiesForUpdatingParams = {
  baseTemplateId: string
  templateTranslatableItems: ContentItem[]
  availableLanguages: string[]
}

export type TemplateRequestBodiesForUpdatingParams = {
  baseTemplateId: string
  templateTranslatableItems: ContentItem[]
  availableLanguages: string[]
  templateType: string
}

export type ItemWithTranslations = {
  items: ItemIdentifiers[]
  locales: string[]
  translatableTemplates: (ClevertapEmailTemplate | undefined)[]
  templateType: string
}

export type TemplateFieldValueParams = {
  template: ClevertapEmailTemplate
  contentType: string
  templateType: string
}

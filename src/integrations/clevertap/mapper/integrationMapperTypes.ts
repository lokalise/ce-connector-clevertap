import type { CacheResponseBody } from '../../../modules/cache/cacheTypes'
import { ContentItem, ItemIdentifiers } from '../../../types'
import type {
  ClevertapContentBlockListItem,
  ClevertapEmailTemplate,
  ClevertapTemplatesListItem,
} from '../client/clevertapApiTypes'

export type CacheResponseBodyItems = CacheResponseBody['items']
export type CacheResponseBodyItem = CacheResponseBodyItems[0]
export type CacheResponseBodyItemField = {
  templateId?: number
  updated?: string
  creator?: string
  templateType?: string
  id?: number
  type?: string
}

export enum EmailContentTypes {
  Subject = 'subject',
  PreheaderText = 'preheader',
  Html = 'html',
  AmpHtml = 'ampHtml',
  PlainText = 'plainText',
  AnnotationMeta = 'annotationMeta',
}

export enum ContentBlockContentTypes {
  Content = 'content',
}

export enum EmailContentTitles {
  subject = 'Subject',
  preheader = 'Preheader text',
  html = 'Html',
  ampHtml = 'Amp Html',
  plainText = 'Plain Text',
  annotationMeta = 'Annotation Data',
}

export enum ContentBlockTitles {
  content = 'Content',
}

export type ItemIdentifiersFromTemplates = {
  templates: ClevertapTemplatesListItem[]
  objectType: string
}

export type ItemIdentifiersFromContentBlocks = {
  templates: ClevertapContentBlockListItem[]
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
  translatableTemplates: (ClevertapEmailTemplate | void)[]
  templateType: string
}

export type TemplateFieldValueParams = {
  template: ClevertapEmailTemplate
  contentType: string
  templateType: string
}

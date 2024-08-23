// TODO: fakeIntegration connector 3-rd party mapper implementation

import {
  CacheResponseBodyItem,
  CacheResponseBodyItemField,
  EmailContentTitles,
  EmailContentTypes,
  EmailTemplateRequestBodiesForUpdatingParams,
  ItemIdentifiersFromTemplates,
  ItemWithTranslations,
  TemplateFieldValueParams,
  TemplateRequestBodiesForUpdatingParams,
} from './integrationMapperTypes'
import {
  CacheItemsFromTemplateParams,
  ClevertapEmailTemplate,
  isErrorResponse,
  MessageMediumTypes,
} from '../client/clevertapApiTypes'
import { ContentItem, isObject, ItemIdentifiers } from '../../../types'
import { UpdateEmailTemplateRequestBody } from '../types'
import {
  ErrorInfo,
  ErrorInfoWithPerLocaleErrors,
  PerLocaleError,
  PerLocaleErrorCode,
  SingleItemErrorCode,
} from '../../../infrastructure/errors/MultiStatusErrorResponse'
import { AuthFailedError } from '../../../infrastructure/errors/publicErrors'
import type { errors } from 'undici'

const IDENTIFIER_SEPARATOR = '||'

const buildUniqueId = (templateId: string, contentType: string) =>
  `${templateId}${IDENTIFIER_SEPARATOR}${contentType}`

const buildItemIdentifiersFromTemplates = ({
  templates,
  objectType,
}: ItemIdentifiersFromTemplates): ItemIdentifiers[] => {
  return templates.flatMap((template) => {
    const templateId = template.templateId.toString()
    switch (objectType as MessageMediumTypes) {
      case MessageMediumTypes.Email:
        return buildItemIdentifierForEmail(templateId)
      default:
        return []
    }
  })
}

const buildItemIdentifierWithContentType = (
  templateId: string,
  contentType: string,
  templateType: string,
) => ({
  metadata: { contentType, templateType },
  uniqueId: buildUniqueId(templateId, contentType),
  groupId: templateId,
})

const buildItemIdentifierWithTemplate = (
  template: ClevertapEmailTemplate,
  templateId: string,
  contentType: string,
  templateType: string,
) => ({
  metadata: {
    contentType,
    templateType,
    templateName: template.templateName,
    subType: template.templateData.subType,
    fromName: template.templateData?.senderDetail?.fromName,
    fromEmail: template.templateData?.senderDetail?.fromEmail,
    replyToName: template.templateData?.senderDetail?.replyToName,
    replyToEmail: template.templateData?.senderDetail?.replyToEmail,
    ccEmails: template.templateData?.senderDetail?.ccEmails,
    bccEmails: template.templateData?.senderDetail?.bccEmails,
    annotationMeta: template.templateData?.senderDetail?.annotationMeta,
    labels: template.labels,
    createdAt: template.createdAt,
    createdBy: template.createdBy,
    updatedAt: template.updatedAt,
    updatedBy: template.updatedBy,
  },
  uniqueId: buildUniqueId(templateId, contentType),
  groupId: templateId,
})

const getSortOrder = (type: string): string[] => {
  switch (type as MessageMediumTypes) {
    case MessageMediumTypes.Email:
      return Object.values(EmailContentTypes).map((value) => value.toString())
    default:
      return []
  }
}

const buildItemIdentifierForEmail = (id: string) => [
  buildItemIdentifierWithContentType(id, EmailContentTypes.Subject, MessageMediumTypes.Email),
  buildItemIdentifierWithContentType(id, EmailContentTypes.PreheaderText, MessageMediumTypes.Email),
  buildItemIdentifierWithContentType(id, EmailContentTypes.Html, MessageMediumTypes.Email),
]

const buildCacheItemsFromTemplate = ({
  template,
  templateType,
  contentTypes,
}: CacheItemsFromTemplateParams): CacheResponseBodyItem[] => {
  const sortOrder = getSortOrder(templateType)
  switch (templateType as MessageMediumTypes) {
    case MessageMediumTypes.Email:
      return buildCacheItemsFromEmailTemplate(contentTypes, template, sortOrder)
    default:
      throw new Error('Unsupported template type')
  }
}

const buildCacheItemsFromEmailTemplate = (
  contentTypes: string[],
  template: ClevertapEmailTemplate,
  order: string[],
): CacheResponseBodyItem[] =>
  contentTypes
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((contentType) => ({
      fields: buildCacheItemFieldWithMetadata(template, MessageMediumTypes.Email),
      groupTitle: template.templateName ?? '',
      title: EmailContentTitles[contentType as keyof typeof EmailContentTitles],
      ...buildItemIdentifierWithTemplate(
        template,
        template.templateId.toString(),
        contentType,
        MessageMediumTypes.Email,
      ),
    }))

const buildCacheItemFieldWithMetadata = (
  template: ClevertapEmailTemplate,
  templateType: MessageMediumTypes,
): CacheResponseBodyItemField => {
  const { templateId, updatedAt, createdBy } = template
  return {
    templateId,
    updated: formatDate(updatedAt),
    creator: createdBy,
    templateType: templateType,
  }
}

const buildUpdateTemplateRequestBodies = ({
  baseTemplateId,
  templateTranslatableItems,
  availableLanguages,
  templateType,
}: TemplateRequestBodiesForUpdatingParams): UpdateEmailTemplateRequestBody[] => {
  switch (templateType as MessageMediumTypes) {
    case MessageMediumTypes.Email:
      return buildUpdateTemplateBodiesForEmail({
        baseTemplateId,
        templateTranslatableItems,
        availableLanguages,
      })
    default:
      throw new Error('Unsupported template type')
  }
}

const buildUpdateTemplateBodiesForEmail = ({
  baseTemplateId,
  templateTranslatableItems,
  availableLanguages,
}: EmailTemplateRequestBodiesForUpdatingParams): UpdateEmailTemplateRequestBody[] => {
  const subjectTranslates = getTranslations(templateTranslatableItems, EmailContentTypes.Subject)
  const preheaderTextTranslates = getTranslations(
    templateTranslatableItems,
    EmailContentTypes.PreheaderText,
  )
  const htmlTranslates = getTranslations(templateTranslatableItems, EmailContentTypes.Html)
  const metadata = templateTranslatableItems[0].metadata
  const templateName = generateChildTemplateName(
    metadata.templateName as string,
    availableLanguages,
  )
  return availableLanguages.map((language) => ({
    baseTemplateId: Number(baseTemplateId),
    locale: language,
    templateName: templateName[language],
    description: (metadata.description as string) ?? null,
    path: (metadata.path as string) ?? null,
    templateData: {
      subType: (metadata.subType as string) ?? null,
      body: htmlTranslates?.[language] ?? '',
      senderDetail: {
        fromName: (metadata.fromName as string) ?? null,
        fromEmail: (metadata.fromEmail as string) ?? null,
        replyToName: (metadata.replyToName as string) ?? null,
        replyToEmail: (metadata.replyToName as string) ?? null,
        subject: subjectTranslates?.[language] ?? '',
        preheader: preheaderTextTranslates?.[language] ?? '',
        ccEmails: (metadata.ccEmails as string[]) ?? null,
        bccEmails: (metadata.bccEmail as string[]) ?? null,
        annotationMeta: (metadata.annotationMeta as string) ?? null,
      },
    },
    labels: (metadata.labels as string) ?? null,
    partner: 'Lokalise',
    createdBy: 'Lokalise',
    updatedBy: 'Lokalise',
  }))
}

const getTranslations = (
  templateTranslatableItems: ContentItem[],
  contentType: EmailContentTypes,
): Record<string, string> | undefined => {
  return templateTranslatableItems.find((item) => item.metadata.contentType === contentType)
    ?.translations
}

const generateChildTemplateName = (
  baseTemplateName: string,
  availableLanguages: string[],
): Record<string, string> => {
  const record: Record<string, string> = {}
  availableLanguages.forEach((language) => (record[language] = baseTemplateName + '_' + language))
  return record
}

const formatDate = (dateMilliseconds: string | undefined): string => {
  if (!dateMilliseconds) {
    return ''
  }
  const date = new Date(dateMilliseconds)

  const year = date.getFullYear()
  const month = (1 + date.getMonth()).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${day}-${month}-${year}`
}

const buildItemWithTranslations = ({
  items,
  locales,
  translatableTemplates,
  templateType,
}: ItemWithTranslations) => {
  return items
    .sort((a: ItemIdentifiers, b: ItemIdentifiers): number => {
      if (a.groupId.localeCompare(b.groupId) !== 0) {
        return a.groupId.localeCompare(b.groupId)
      }

      const order = getSortOrder(a.metadata?.contentType as string)
      return (
        order.indexOf(a.metadata?.contentType as string) -
        order.indexOf(b.metadata?.contentType as string)
      )
    })
    .map((item) => {
      const translations = locales.reduce((acc, locale) => {
        const template = translatableTemplates.find(
          (translatableTemplate) =>
            translatableTemplate?.templateId === Number(item.groupId) &&
            (translatableTemplate?.locale === undefined || translatableTemplate.locale === locale),
        )
        return {
          ...acc,
          [locale]: template
            ? getTemplateFieldValue({
                template,
                templateType,
                contentType: item.metadata.contentType as string,
              })
            : '',
        }
      }, {})
      return { ...item, translations }
    })
}

const getTemplateFieldValue = ({
  template,
  contentType,
  templateType,
}: TemplateFieldValueParams) => {
  if ((templateType as MessageMediumTypes) === MessageMediumTypes.Email) {
    if (contentType === 'html') {
      contentType = 'body'
    }
    const value =
      template.templateData[contentType as keyof typeof template.templateData] ??
      template.templateData.senderDetail?.[
        contentType as keyof typeof template.templateData.senderDetail
      ] ??
      ''
    return isObject(value) ? JSON.stringify(value) : String(value)
  }
  throw new Error('Unsupported template type')
}

export const buildPerLocaleErrors = (
  error: unknown,
  rejectedLocale: string,
): Record<string, PerLocaleError> => {
  const { statusCode } = error as errors.ResponseStatusCodeError
  if (statusCode === 401) {
    throw new AuthFailedError()
  }
  return {
    [rejectedLocale]:
      isErrorResponse(error) && (statusCode === 404 || statusCode === 400)
        ? { userErrors: [error.body.msg] }
        : { errorCode: PerLocaleErrorCode.UnrecognizedErrorCode },
  }
}

export const buildTranslatePublishError = (
  error: unknown,
  rejectedUniqueId: string,
  rejectedLocale: string,
): ErrorInfoWithPerLocaleErrors => {
  return {
    uniqueId: rejectedUniqueId,
    perLocaleErrors: buildPerLocaleErrors(error, rejectedLocale),
  }
}

export const buildGetCacheErrors = (
  rejectedUniqueIds: string[],
  statusCode: number,
): ErrorInfo[] => {
  if (statusCode === 401) {
    throw new AuthFailedError()
  }
  return rejectedUniqueIds.map((uniqueId) => ({
    uniqueId,
    errorCode:
      statusCode === 400 || statusCode === 404
        ? SingleItemErrorCode.ItemNotFoundErrorCode
        : SingleItemErrorCode.UnrecognizedErrorCode,
  }))
}

const clevertapMapper = {
  buildItemIdentifiersFromTemplates,
  buildCacheItemsFromTemplate,
  buildUpdateTemplateRequestBodies,
  buildItemWithTranslations,
}

export default clevertapMapper

import {
  AuthFailedError,
  CouldNotRetrieveTemplates,
} from '../../infrastructure/errors/publicErrors'
import { AuthConfig, ContentItem, isFulfilled, isRejected, ItemIdentifiers } from '../../types'
import { ClevertapApiClient } from './client/ClevertapApiClient'
import {
  type ClevertapTemplatesList,
  ClevertapTemplatesListItem,
  MessageMediumTypes,
} from './client/clevertapApiTypes'
import { CacheResponseBodyItem, CacheResponseBodyItems } from './mapper/integrationMapperTypes'
import clevertapMapper, {
  buildGetCacheErrors,
  buildPerLocaleErrors,
  buildTranslatePublishError,
} from './mapper/integrationMapper'
import {
  CacheItemStructure,
  LocalesAvailable,
  TemplateItemsByTemplateTypeParams,
  TranslatableTemplatesParams,
} from './types'
import {
  ErrorInfo,
  ErrorInfoWithPerLocaleErrors,
} from '../../infrastructure/errors/MultiStatusErrorResponse'
import type { errors } from 'undici'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

const IDENTIFIER_SEPARATOR = '||'

const buildUniqueId = (templateId: string, contentType: string) =>
  `${templateId}${IDENTIFIER_SEPARATOR}${contentType}`

export const publishContent = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  items: ContentItem[],
): Promise<{
  errors: ErrorInfoWithPerLocaleErrors[]
}> => {
  const publishErrors: ErrorInfoWithPerLocaleErrors[] = []
  const baseTemplateIds = [...new Set(items.map((item) => item.groupId))]
  const updateTemplatesRequests = baseTemplateIds.map(async (baseTemplateId) => {
    const templateTranslatableItems = items.filter((item) => item.groupId === baseTemplateId)
    const templateType = templateTranslatableItems[0].metadata.templateType as string
    const availableLanguages = getTemplateAvailableLanguages(templateTranslatableItems)
    const updateTemplatePayloads = clevertapMapper.buildUpdateTemplateRequestBodies({
      baseTemplateId,
      templateTranslatableItems,
      availableLanguages,
      templateType,
    })
    const updateSettledResult = await Promise.allSettled(
      updateTemplatePayloads.map((updateTemplatePayload) =>
        clevertapApiClient.updateTemplate({
          accountId,
          passcode,
          updateTemplatePayload,
          templateType,
        }),
      ),
    )

    updateSettledResult.forEach((result, index) => {
      const updatingLocale = updateTemplatePayloads[index]?.locale
      if (isRejected(result) && updatingLocale) {
        const uniqueIdsWithError = items
          .filter((item) => item.groupId === baseTemplateId)
          .map((item) => item.uniqueId)

        uniqueIdsWithError.forEach((uniqueId) => {
          const existingError = publishErrors.find((error) => error.uniqueId === uniqueId)
          if (existingError) {
            existingError.perLocaleErrors = {
              ...existingError.perLocaleErrors,
              ...buildPerLocaleErrors(result.reason, updatingLocale),
            }
          } else {
            publishErrors.push(buildTranslatePublishError(result.reason, uniqueId, updatingLocale))
          }
        })
      }
    })

    return updateSettledResult
  })

  await Promise.all(updateTemplatesRequests)
  return { errors: publishErrors }
}

const getTemplateAvailableLanguages = (templateTranslatableItems: ContentItem[]): string[] => {
  return [...new Set(templateTranslatableItems.flatMap((item) => Object.keys(item.translations)))]
}

export const validate = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  region: string,
): Promise<AuthConfig> => {
  globalLogger.info('accountId: %s, passcode: %s, region: %s ', accountId, passcode, region)
  const response = await clevertapApiClient.authorizeCredentials(accountId, passcode)
  globalLogger.info(response, 'Got a response from auth api')
  if (response.status == 'fail') {
    globalLogger.error(response, 'Auth failed due to invalid credentials')
    throw new AuthFailedError()
  }
  globalLogger.info('Successful Authentication')
  return { accountId: accountId, passcode: passcode, region: region }
}

export const refresh = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  region: string,
): Promise<AuthConfig> => {
  return validate(clevertapApiClient, accountId, passcode, region) // Configuration is constant in CleverTap, no need to refresh
}

export const listItems = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
): Promise<ItemIdentifiers[]> => {
  // Map over each message medium type and fetch templates
  const listItemsPromises = Object.values(MessageMediumTypes).map(async (messageMedium) => {
    // Fetch the total number of templates for the current message medium type
    const { total } = await clevertapApiClient.getTemplates(
      accountId,
      passcode,
      MessageMediumTypes[messageMedium],
      1,
      1,
    )

    // Fetch all the templates for the current message medium type in batch of 25 templates per request
    const pageSize: number = 25
    const numOfPages: number = Math.ceil(total / pageSize)
    const getTemplatePromises: Promise<ClevertapTemplatesList>[] = []
    for (let i = 1; i <= numOfPages; i++) {
      const promise: Promise<ClevertapTemplatesList> = clevertapApiClient.getTemplates(
        accountId,
        passcode,
        MessageMediumTypes[messageMedium],
        i,
        pageSize,
      )
      getTemplatePromises.push(promise)
    }

    const templates: ClevertapTemplatesListItem[] = []
    await Promise.allSettled(getTemplatePromises).then((promiseOutcome) => {
      promiseOutcome.forEach((promiseOutcome) => {
        if (isFulfilled(promiseOutcome)) {
          const templatesPerPage: ClevertapTemplatesListItem[] = promiseOutcome.value.templates
          templates.push(...templatesPerPage)
        } else {
          throw new CouldNotRetrieveTemplates({ messageMedium })
        }
      })
    })

    // Build item identifiers from the fetched templates
    return clevertapMapper.buildItemIdentifiersFromTemplates({
      templates,
      objectType: MessageMediumTypes[messageMedium],
    })
  })

  // Wait for all promises to resolve and flatten the results
  const listItems = await Promise.all(listItemsPromises)
  return listItems.flat()
}

export const getItems = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  items: ItemIdentifiers[],
): Promise<{
  items: CacheResponseBodyItems
  errors: ErrorInfo[]
}> => {
  let getItemsErrors: ErrorInfo[] = []
  let result: CacheResponseBodyItems = []
  const templateGroupsByTemplateType = groupItemsByTemplateType(items)
  for (const templateType in templateGroupsByTemplateType) {
    const templateIds = [
      ...new Set(templateGroupsByTemplateType[templateType].map((item) => item.groupId)),
    ]
    const templateRequests = templateIds.map((templateId) =>
      clevertapApiClient.getTemplateById({ accountId, passcode, templateId, templateType }),
    )
    const templatesSettledResult = await Promise.allSettled(templateRequests)
    const fulfilledTemplatesValue = templatesSettledResult
      .filter(isFulfilled)
      .map((fulfilledResult) => fulfilledResult.value)

    const templateTypeErrors = templatesSettledResult.reduce<ErrorInfo[]>((acc, result, index) => {
      if (isRejected(result)) {
        const rejectedGroupId = templateIds[index]
        const rejectedUniqueIds = items
          .filter((item) => item.groupId === rejectedGroupId)
          .map((rejectedItem) => rejectedItem.uniqueId)
        return [
          ...acc,
          ...buildGetCacheErrors(
            rejectedUniqueIds,
            (result.reason as errors.ResponseStatusCodeError)?.statusCode,
          ),
        ]
      }
      return acc
    }, [] as ErrorInfo[])

    getItemsErrors = [...getItemsErrors, ...templateTypeErrors]

    const itemResponses = getTemplateItemsByTemplateType({
      templateType,
      templates: fulfilledTemplatesValue,
      items: templateGroupsByTemplateType[templateType],
    })

    result = result.concat(itemResponses.filter((i): i is CacheResponseBodyItem => i !== undefined))
  }

  return { items: result, errors: getItemsErrors }
}

export const getTemplateItemsByTemplateType = ({
  templateType,
  templates,
  items,
}: TemplateItemsByTemplateTypeParams): CacheResponseBodyItem[] => {
  return templates.flatMap((template) => {
    const contentTypes = getContentTypesByGroupId(items, template.templateId.toString())
    return clevertapMapper.buildCacheItemsFromTemplate({ template, templateType, contentTypes })
  })
}

export const getContentTypesByGroupId = (items: ItemIdentifiers[], groupId: string) =>
  [
    ...new Set(
      items.map((item) => {
        if (item.groupId == groupId) {
          return item.metadata.contentType as string
        }
        return
      }),
    ),
  ].filter((i): i is string => i !== undefined)

export const groupItemsByTemplateType = (items: ItemIdentifiers[]) => {
  return items.reduce((group: Record<string, ItemIdentifiers[]>, item) => {
    const {
      metadata: { templateType },
    } = item
    group[templateType as MessageMediumTypes] = group[templateType as MessageMediumTypes] ?? []
    group[templateType as MessageMediumTypes].push(item)
    return group
  }, {})
}

export const getLocales = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
): Promise<LocalesAvailable> => {
  return {
    defaultLocale: 'en',
    locales: await clevertapApiClient.getLocales(accountId, passcode),
  }
}

export const getCacheItemStructure = (): CacheItemStructure => {
  return {
    templateId: 'Template id',
    updated: 'Updated at',
    creator: 'Created by',
    templateType: 'Template type',
  }
}

export const getContent = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  locales: string[],
  items: ItemIdentifiers[],
): Promise<{
  items: ContentItem[]
  errors: ErrorInfoWithPerLocaleErrors[]
}> => {
  let result: ContentItem[] = []
  const templateGroups = groupItemsByTemplateType(items)
  let translateErrors: ErrorInfoWithPerLocaleErrors[] = []
  for (const templateType in templateGroups) {
    const templateIds = [...new Set(templateGroups[templateType].map((item) => item.groupId))]

    const translatableTemplatesRequestPayloads = getTranslatableTemplatesRequestPayloads({
      templateType,
      templateIds,
      locales,
      accountId: accountId,
      passcode: passcode,
    })
    const templatesSettledResult = await Promise.allSettled(
      translatableTemplatesRequestPayloads.map((payload) =>
        clevertapApiClient.getTemplateById(payload),
      ),
    )

    const fulfilledTemplatesValue = templatesSettledResult
      .filter(isFulfilled)
      .map((fulfilledResult) => fulfilledResult.value)

    const templateTypeErrors = templatesSettledResult.reduce<ErrorInfoWithPerLocaleErrors[]>(
      (acc, result, index) => {
        if (isRejected(result)) {
          const rejectedGroupId = translatableTemplatesRequestPayloads[index].templateId
          const rejectedLocale = translatableTemplatesRequestPayloads[index].locale
          const rejectedUniqueIds = items
            .filter((item) => item.groupId === rejectedGroupId)
            .map((rejectedItem) => rejectedItem.uniqueId)

          rejectedUniqueIds.forEach((rejectedId) => {
            const errorItemWithRejectedId = acc.find(
              (errorItem) => errorItem.uniqueId === rejectedId,
            )
            if (errorItemWithRejectedId) {
              errorItemWithRejectedId.perLocaleErrors = {
                ...errorItemWithRejectedId.perLocaleErrors,
                ...buildPerLocaleErrors(result.reason, rejectedLocale),
              }
            } else {
              acc.push(buildTranslatePublishError(result.reason, rejectedId, rejectedLocale))
            }
          })
          return acc
        }
        return acc
      },
      [] as ErrorInfoWithPerLocaleErrors[],
    )

    translateErrors = [...translateErrors, ...templateTypeErrors]

    const itemsWithTranslations = clevertapMapper.buildItemWithTranslations({
      locales,
      templateType,
      items: templateGroups[templateType],
      translatableTemplates: fulfilledTemplatesValue,
    })

    result = result.concat(itemsWithTranslations)
  }

  return {
    items: result,
    errors: translateErrors,
  }
}

const getTranslatableTemplatesRequestPayloads = ({
  templateIds,
  locales,
  accountId,
  passcode,
  templateType,
}: TranslatableTemplatesParams): {
  templateType: string
  accountId: string
  passcode: string
  templateId: string
  locale: string
}[] =>
  templateIds
    .map((templateId) => {
      return locales.map((locale) => ({
        templateType,
        accountId,
        passcode,
        templateId,
        locale,
      }))
    })
    .flat()

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  AuthFailedError,
  CouldNotRetrieveTemplates,
} from '../../infrastructure/errors/publicErrors'
import { AuthConfig, ContentItem, isFulfilled, isRejected, ItemIdentifiers } from '../../types'
import { ClevertapApiClient } from './client/ClevertapApiClient'
import {
  ClevertapContentBlockListItem,
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
  ContentBlockItemsByTemplateTypeParams,
  LocalesAvailable,
  TemplateItemsByTemplateTypeParams,
  TranslatableTemplatesParams, UpdateTemplateParams,
} from './types'
import {
  ErrorInfo,
  ErrorInfoWithPerLocaleErrors,
} from '../../infrastructure/errors/MultiStatusErrorResponse'
import type { errors } from 'undici'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export const publishContent = async (
  clevertapApiClient: ClevertapApiClient,
  accountId: string,
  passcode: string,
  items: ContentItem[],
): Promise<{
  errors: ErrorInfoWithPerLocaleErrors[]
}> => {
  globalLogger.info('accountId: %s, passcode: %s ', accountId, passcode)
  globalLogger.info({ items }, 'Content items in publish request: ')
  const publishErrors: ErrorInfoWithPerLocaleErrors[] = []
  const baseTemplateIds = [...new Set(items.map((item) => item.groupId))]
  const updateTemplatesRequests = baseTemplateIds.map(async (baseTemplateId) => {
    globalLogger.info(
      'Publishing translated templated for baseTemplateId: %s started',
      baseTemplateId,
    )
    const templateTranslatableItems = items.filter((item) => item.groupId === baseTemplateId)
    globalLogger.info(templateTranslatableItems, 'templateTranslatableItems object is')
    const templateType = templateTranslatableItems[0].metadata.templateType as string
    const availableLanguages = getTemplateAvailableLanguages(templateTranslatableItems)
    globalLogger.info(
      availableLanguages,
      'Creating child templates for for baseTemplateId: %s, template type: %s, available languages: ',
      baseTemplateId,
      templateType,
    )
    const updateTemplatePayloads = clevertapMapper.buildUpdateTemplateRequestBodies({
      baseTemplateId,
      templateTranslatableItems,
      availableLanguages,
      templateType,
    })
    globalLogger.info('Translated templates are ready to be exported')
    const updateSettledResult = await Promise.allSettled(
      updateTemplatePayloads.map((updateTemplatePayload) =>
        clevertapApiClient.updateTemplate(<UpdateTemplateParams>{
          accountId,
          passcode,
          updateTemplatePayload,
          templateType,
        }),
      ),
    )
    globalLogger.info('List of promise created for all the translations to be exported')
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
  globalLogger.info('Process for exporting translated templates completed')
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
  globalLogger.info('accountId: %s, passcode: %s ', accountId, passcode)
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
    globalLogger.info(
      'Got the total number of templates from get api which is: %d for the template type: %s',
      total,
      messageMedium,
    )
    // Fetch all the templates for the current message medium type in batch of 25 templates per request
    const pageSize: number = 25
    const numOfPages: number = Math.ceil(total / pageSize)
    globalLogger.info(
      'Got the total number of get calls from get api which is: %d for the template type: %s',
      numOfPages,
      messageMedium,
    )
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
    globalLogger.info(
      'List of promise returned for all the templates for getTemplates api for template type: %s',
      messageMedium,
    )
    const templates: ClevertapTemplatesListItem[] | ClevertapContentBlockListItem[] = []
    await Promise.allSettled(getTemplatePromises).then((promiseOutcome) => {
      promiseOutcome.forEach((promiseOutcome) => {
        if (isFulfilled(promiseOutcome)) {
          globalLogger.info('Promise fulfilled for template type: %s', messageMedium)
          const templatesPerPage: ClevertapTemplatesListItem[] | ClevertapContentBlockListItem[] =
            promiseOutcome.value?.templates || promiseOutcome.value?.contentBlocks || []
          templates.push(...templatesPerPage)
        } else {
          globalLogger.info(
            'Failed to fetch all the templates for template type: %s',
            messageMedium,
          )
          throw new CouldNotRetrieveTemplates({ messageMedium })
        }
      })
    })
    globalLogger.info(
      'Successfully fetched all the templates for template type from the getTemplates api: %s',
      messageMedium,
    )
    // Build item identifiers from the fetched templates
    if (messageMedium === MessageMediumTypes.Email) {
      return clevertapMapper.buildItemIdentifiersFromTemplates({
        templates,
        objectType: MessageMediumTypes[messageMedium],
      })
    } else {
      return clevertapMapper.buildItemIdentifiersFromContentBlocks({
        templates,
        objectType: MessageMediumTypes[messageMedium],
      })
    }
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
  globalLogger.info('accountId: %s, passcode: %s ', accountId, passcode)
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
    globalLogger.info(
      'List of promise returned for all the templates for getTemplateById api for template type: %s',
      templateType,
    )
    const templatesSettledResult = await Promise.allSettled(templateRequests)
    const fulfilledTemplatesValue = templatesSettledResult
      .filter(isFulfilled)
      .map((fulfilledResult) => fulfilledResult.value)
    globalLogger.info(
      'Successfully fetched all the templates from the getTemplateById api for template type: %s',
      templateType,
    )

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
    globalLogger.info(
      'Errors object created if any errors occurred for template type: %s',
      templateType,
    )
    getItemsErrors = [...getItemsErrors, ...templateTypeErrors]

    const itemResponses = getTemplateItemsByTemplateType({
      templateType,
      templates: fulfilledTemplatesValue,
      items: templateGroupsByTemplateType[templateType],
    })
    result = result.concat(itemResponses.filter((i): i is CacheResponseBodyItem => i !== undefined))
    globalLogger.info('Created response object for the template type: %s', templateType)
  }
  globalLogger.info(
    'Successfully fetched all the templates from the getTemplateById api for all template types',
  )
  return { items: result, errors: getItemsErrors }
}

export const getTemplateItemsByTemplateType = ({
  templateType,
  templates,
  items,
}:
  | TemplateItemsByTemplateTypeParams
  | ContentBlockItemsByTemplateTypeParams): CacheResponseBodyItem[] => {
  return templates.flatMap((template) => {
    const contentTypes = getContentTypesByGroupId(items, template.templateId?.toString() || template.id?.toString())
    if (templateType === 'Email') {
      return clevertapMapper.buildCacheItemsFromTemplate({ template, templateType, contentTypes })
    }
    return clevertapMapper.buildCacheItemsFromContentBlock({ template, templateType, contentTypes })
  })
}

export const getContentTypesByGroupId = (items: ItemIdentifiers[], groupId: string | undefined) =>
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
  globalLogger.info('accountId: %s, passcode: %s ', accountId, passcode)
  return {
    defaultLocale: 'base',
    locales: await clevertapApiClient.getLocales(accountId, passcode),
  }
}

export const getCacheItemStructure = (): CacheItemStructure => {
  globalLogger.info('Successful getCacheItemStructure call in env api')
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
  globalLogger.info('accountId: %s, passcode: %s', accountId, passcode)
  globalLogger.info({ locales }, 'locales in translate request: ')
  globalLogger.info({ items }, 'item identifiers in translate request: ')
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
    globalLogger.info(
      'List of promise created to get actual translatable content from the templates using the getTemplateById api for template type: %s in getContent',
      templateType,
    )
    const fulfilledTemplatesValue = templatesSettledResult
      .filter(isFulfilled)
      .map((fulfilledResult) => fulfilledResult.value)
    globalLogger.info(
      'Successfully fetched all the templates from the getTemplateById api for template type: %s',
      templateType,
    )

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
    globalLogger.info(
      'Errors object created if any errors occurred for template type: %s',
      templateType,
    )

    translateErrors = [...translateErrors, ...templateTypeErrors]

    const itemsWithTranslations = clevertapMapper.buildItemWithTranslations({
      locales,
      templateType,
      items: templateGroups[templateType],
      translatableTemplates: fulfilledTemplatesValue,
    })

    result = result.concat(itemsWithTranslations)
    globalLogger.info('Created response object for the template type: %s', templateType)
  }
  globalLogger.info(
    'Successfully fetched all the translatable content from the templates using the getTemplateById api for all template types',
  )
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

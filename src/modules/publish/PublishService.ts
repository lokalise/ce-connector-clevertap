import { publishContent } from '../../integrations/clevertap'
import type { AuthConfig, ContentItem, IntegrationConfig, ItemIdentifiers } from '../../types'
import { DynamicHostService } from '../dynamicHostService'
import { ErrorInfoWithPerLocaleErrors } from '../../infrastructure/errors/MultiStatusErrorResponse'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export class PublishService extends DynamicHostService {
  async publishContent(
    config: IntegrationConfig,
    auth: AuthConfig,
    items: ContentItem[],
    // Default locale might not be needed for integration logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defaultLocale: string,
  ): Promise<{
    errors: ErrorInfoWithPerLocaleErrors[]
  }> {
    globalLogger.info('Setting region for region %s', auth.region as string)
    this.setApiHost(config)
    globalLogger.info('Region is set successfully')
    return await publishContent(
      this.clevertapApiClient,
      auth.accountId as string,
      auth.passcode as string,
      items,
    )
  }
}

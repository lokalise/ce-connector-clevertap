import { publishContent } from '../../integrations/clevertap'
import type { AuthConfig, ContentItem, IntegrationConfig, ItemIdentifiers } from '../../types'
import { DynamicHostService } from '../dynamicHostService'
import { ErrorInfoWithPerLocaleErrors } from '../../infrastructure/errors/MultiStatusErrorResponse'

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
    this.setApiHost(config)
    return await publishContent(
      this.clevertapApiClient,
      auth.accountId as string,
      auth.passcode as string,
      items,
    )
  }
}

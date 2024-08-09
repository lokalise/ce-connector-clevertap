import type { AuthConfig, IntegrationConfig, ItemIdentifiers } from '../../types'
import { DynamicHostService } from '../dynamicHostService'
import { getContent } from '../../integrations/clevertap'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export class TranslateService extends DynamicHostService {
  async getContent(
    config: IntegrationConfig,
    auth: AuthConfig,
    locales: string[],
    ids: ItemIdentifiers[],
    // Default locale might not be needed for integration logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defaultLocale: string,
  ) {
    globalLogger.info('Setting region for region %s', auth.region as string)
    this.setApiHost(config)
    globalLogger.info('Region is set successfully')
    return await getContent(
      this.clevertapApiClient,
      auth.accountId as string,
      auth.passcode as string,
      locales,
      ids,
    )
  }
}

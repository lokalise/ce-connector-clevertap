import type { AuthConfig, IntegrationConfig, ItemIdentifiers } from '../../types'
import { DynamicHostService } from '../dynamicHostService'
import { listItems, getItems } from '../../integrations/clevertap'
import { CacheResponseBodyItems } from '../../integrations/clevertap/mapper/integrationMapperTypes'
import { ErrorInfo } from '../../infrastructure/errors/MultiStatusErrorResponse'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export class CacheService extends DynamicHostService {
  async listItems(config: IntegrationConfig, auth: AuthConfig): Promise<ItemIdentifiers[]> {
    globalLogger.info('Setting region for region %s', auth.region as string)
    this.setApiHost(config)
    globalLogger.info('Region is set successfully')
    return await listItems(
      this.clevertapApiClient,
      auth.accountId as string,
      auth.passcode as string,
    )
  }

  async getItems(
    config: IntegrationConfig,
    auth: AuthConfig,
    ids: ItemIdentifiers[],
  ): Promise<{
    items: CacheResponseBodyItems
    errors: ErrorInfo[]
  }> {
    this.setApiHost(config)
    return await getItems(
      this.clevertapApiClient,
      auth.accountId as string,
      auth.passcode as string,
      ids,
    )
  }
}

import type { AuthConfig, IntegrationConfig } from 'src/types'
import { getCacheItemStructure, getLocales } from '../../integrations/clevertap'
import { DynamicHostService } from '../dynamicHostService'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export class EnvService extends DynamicHostService {
  async getLocales(config: IntegrationConfig, auth: AuthConfig) {
    const { accountId } = config
    const { passcode } = config
    const { region } = config
    globalLogger.info('Setting region for region %s', region)
    this.setApiHost(config)
    globalLogger.info('Region is set successfully')
    return Promise.resolve(
      getLocales(this.clevertapApiClient, accountId as string, passcode as string),
    )
  }

  async getCacheItemStructure(config: IntegrationConfig, auth: AuthConfig) {
    return Promise.resolve(getCacheItemStructure())
  }
}

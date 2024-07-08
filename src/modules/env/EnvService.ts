import type { AuthConfig, IntegrationConfig } from 'src/types'
import { getCacheItemStructure, getLocales } from '../../integrations/clevertap'
import { DynamicHostService } from '../dynamicHostService'

export class EnvService extends DynamicHostService{
  async getLocales(config: IntegrationConfig, auth: AuthConfig) {
    const { accountId } = config
    const { passcode } = config
    this.setApiHost(config)
    return Promise.resolve(
      getLocales(this.clevertapApiClient, accountId as string, passcode as string),
    )
  }

  async getCacheItemStructure(config: IntegrationConfig, auth: AuthConfig) {
    return Promise.resolve(getCacheItemStructure())
  }
}

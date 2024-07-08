import type { ClevertapApiClient } from '../integrations/clevertap/client/ClevertapApiClient'
import type { Dependencies } from '../infrastructure/diConfig'
import type { IntegrationConfig } from '../types'

export class DynamicHostService {
  protected clevertapApiClient: ClevertapApiClient
  constructor({ clevertapApiClient }: Dependencies) {
    this.clevertapApiClient = clevertapApiClient
  }
  setApiHost(config: IntegrationConfig) {
    this.clevertapApiClient.setAPIHost(config)
  }
}

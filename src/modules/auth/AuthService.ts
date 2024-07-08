import type { AuthConfig, IntegrationConfig } from 'src/types'

import { AuthInvalidDataError } from '../../infrastructure/errors/publicErrors'
import { validate } from '../../integrations/clevertap'
import { DynamicHostService } from '../dynamicHostService'

export class AuthService extends DynamicHostService {
  // API key flow
  async validate(config: IntegrationConfig) {
    const { accountId } = config
    const { passcode } = config
    const { region } = config
    if (!accountId || !passcode || !region) {
      throw new AuthInvalidDataError()
    }
    this.setApiHost(config)
    return await validate(
      this.clevertapApiClient,
      accountId as string,
      passcode as string,
      region as string,
    )
  }

  async refresh(config: IntegrationConfig, auth: AuthConfig) {
    const { accountId } = auth
    const { passcode } = auth
    const { region } = auth
    if (!accountId || !passcode || !region) {
      throw new AuthInvalidDataError()
    }
    this.setApiHost(config)
    return await validate(
      this.clevertapApiClient,
      accountId as string,
      passcode as string,
      region as string,
    )
  }
}

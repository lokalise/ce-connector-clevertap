import type { AuthConfig, IntegrationConfig } from 'src/types'

import { AuthInvalidDataError } from '../../infrastructure/errors/publicErrors'
import { validate } from '../../integrations/clevertap'
import { DynamicHostService } from '../dynamicHostService'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export class AuthService extends DynamicHostService {
  // API key flow
  async validate(config: IntegrationConfig) {
    const { accountId } = config
    const { passcode } = config
    const { region } = config
    if (!accountId || !passcode || !region) {
      globalLogger.error(
        'Incorrect data provided for authentication for accountId: %s, passcode: %s, region: %s',
        accountId,
        passcode,
        region,
      )
      throw new AuthInvalidDataError()
    }
    globalLogger.info('Setting region for region %s', region)
    this.setApiHost(config)
    globalLogger.info('Region is set successfully')
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

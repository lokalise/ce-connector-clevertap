// TODO: fakeIntegration connector 3-rd party client implementation

import { sendGet } from '@lokalise/node-core'

import type { Dependencies } from '../../../infrastructure/diConfig'
import type { IntegrationConfig } from '../../../types'

import { APIAbstract } from './APIAbstract'
import {
  ClevertapAuthorizationApiResponse,
  ClevertapEmailTemplate,
  ClevertapTemplatesList,
  ExternalItem,
  getTemplateByIdParams,
  MessageMediumTypes,
  TemplateByIdParams,
} from './clevertapApiTypes'
import {
  LocaleDefinition,
  SuccessMessageResponse,
  UpdateEmailTemplateRequestBody,
  UpdateTemplateParams,
} from '../types'
import { globalLogger } from '../../../infrastructure/errors/globalErrorHandler'

const RETRY_CONFIG = {
  retryOnTimeout: false,
  statusCodesToRetry: [500, 502, 503],
  maxAttempts: 5,
  delayBetweenAttemptsInMsecs: 250,
}

export class ClevertapApiClient extends APIAbstract {
  private hosts: {
    region: string
    host: string
  }[]

  constructor({ config }: Dependencies) {
    const baseUrl = config.integrations.clevertap.baseUrl
    if (!baseUrl) {
      throw new Error('CleverTap API base url is not provided')
    }
    super(baseUrl)
    this.hosts = [
      {
        region: 'us1',
        host: this.getHost(baseUrl, 'us1'),
      },
      {
        region: 'eu1',
        host: this.getHost(baseUrl, 'eu1'),
      },
      {
        region: 'in1',
        host: this.getHost(baseUrl, 'in1'),
      },
      {
        region: 'sg1',
        host: this.getHost(baseUrl, 'sg1'),
      },
      {
        region: 'aps3',
        host: this.getHost(baseUrl, 'aps3'),
      },
      {
        region: 'sk1',
        host: this.getHost(baseUrl, 'sk1'),
      },
    ]
  }

  private getHost(baseUrl: string, region: string): string {
    if (region === 'sk1') {
      return 'https://sk1-staging-6.wzrkt.com/'
    }
    return baseUrl.replace('eu1', 'us1');
  }

  public setAPIHost(config: IntegrationConfig): void {
    const region = config?.region ?? 'eu1'
    const dynamicHost = this.hosts.find((host) => host.region == region)
    if (!dynamicHost) {
      globalLogger.error(region, 'Error while setting region for region: ')
      throw new Error('Invalid data center host provided')
    }
    this.setApiEndpoint(dynamicHost.host)
    globalLogger.info('Region is set successfully with api url as: %s', dynamicHost.host)
  }

  async authorizeCredentials(accountId: string, passcode: string) {
    return this.get<ClevertapAuthorizationApiResponse>('/v1/connect', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      query: {
        partner: 'lokalise',
      },
      requestLabel: 'authorizeCredentials',
    })
  }

  public async getTemplates(
    accountId: string,
    passcode: string,
    messageMedium: string,
    pageNumber: number,
    pageSize: number,
  ) {
    switch (messageMedium as MessageMediumTypes) {
      case MessageMediumTypes.Email:
        return this.getEmailTemplates(accountId, passcode, pageNumber, pageSize)
      default:
        throw new Error('Wrong content type')
    }
  }

  public async getEmailTemplates(
    accountId: string,
    passcode: string,
    pageNumber: number,
    pageSize: number,
  ) {
    return this.get<ClevertapTemplatesList>('/v1/email/templates/localise/', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      query: {
        pageNumber,
        pageSize,
      },
      requestLabel: 'getEmailTemplate',
    })
  }

  public async getTemplateById({
    accountId,
    passcode,
    templateId,
    templateType,
  }: TemplateByIdParams) {
    switch (templateType as MessageMediumTypes) {
      case MessageMediumTypes.Email:
        return this.getEmailTemplateById({ accountId, passcode, templateId })
      default:
        throw new Error('Unsupported template type')
    }
  }

  public async getEmailTemplateById({ accountId, passcode, templateId }: getTemplateByIdParams) {
    return this.get<ClevertapEmailTemplate>('/v1/email/templates/localise', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      query: {
        templateId,
      },
      requestLabel: 'getEmailTemplateById',
    })
  }

  public async updateTemplate({
    accountId,
    passcode,
    updateTemplatePayload,
    templateType,
  }: UpdateTemplateParams) {
    switch (templateType as MessageMediumTypes) {
      case MessageMediumTypes.Email:
        return this.updateEmailTemplate(accountId, passcode, updateTemplatePayload)
      default:
        throw new Error('Unsupported template type')
    }
  }

  public async updateEmailTemplate(
    accountId: string,
    passcode: string,
    updateTemplatePayload: UpdateEmailTemplateRequestBody,
  ) {
    return this.post<SuccessMessageResponse>('/v1/email/templates/localise/upsert', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      body: updateTemplatePayload,
      requestLabel: 'updateEmailTemplate',
    })
  }

  public getLocales(accountId: string, passcode: string): Promise<Awaited<LocaleDefinition[]>> {
    const locales: LocaleDefinition[] = [
      {
        code: 'en',
        name: 'English',
      },
    ]
    return Promise.resolve(locales)
  }
}

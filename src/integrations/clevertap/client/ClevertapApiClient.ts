// TODO: fakeIntegration connector 3-rd party client implementation

import { sendGet } from '@lokalise/node-core'

import type { Dependencies } from '../../../infrastructure/diConfig'
import type { IntegrationConfig } from '../../../types'

import { APIAbstract } from './APIAbstract'
import {
  AuthorizationApiResponseForSuccess,
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
    console.log({ baseUrl })
    this.hosts = [
      {
        region: 'us1',
        host: baseUrl.replace('eu1', 'us1'),
      },
      {
        region: 'eu1',
        host: baseUrl,
      },
      {
        region: 'in1',
        host: baseUrl.replace('eu1', 'in1'),
      },
      {
        region: 'sg1',
        host: baseUrl.replace('eu1', 'sg1'),
      },
      {
        region: 'aps3',
        host: baseUrl.replace('eu1', 'aps3'),
      },
      {
        region: 'sk1',
        host: 'https://sk1.wzrkt.com/'//baseUrl.replace('eu1', 'sk1'),
      },
    ]
  }

  public setAPIHost(config: IntegrationConfig): void {
    const region = config?.region ?? 'eu1'
    const dynamicHost = this.hosts.find((host) => host.region == region)
    if (!dynamicHost) {
      throw new Error('Invalid data center host provided')
    }
    this.setApiEndpoint(dynamicHost.host)
  }

  async listItems() {
    const response = await sendGet<ExternalItem[]>(this.httpClient, `/items`, {
      retryConfig: RETRY_CONFIG,
    })

    return response.result.body
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
    return this.get<ClevertapTemplatesList>('/v1/email/templates/', {
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

  async authorizeCredentials(accountId: string, passcode: string) {
    return this.get<AuthorizationApiResponseForSuccess>('/v1/connect', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      query: {
        partner: 'zapier',
      },
      requestLabel: 'authorizeCredentials',
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
    return this.get<ClevertapEmailTemplate>('/v1/templates/email', {
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
    return this.post<SuccessMessageResponse>('/v1/templates/email/update', {
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

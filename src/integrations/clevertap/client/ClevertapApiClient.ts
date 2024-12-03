// TODO: fakeIntegration connector 3-rd party client implementation

import type { Dependencies } from '../../../infrastructure/diConfig'
import type { IntegrationConfig } from '../../../types'

import { APIAbstract } from './APIAbstract'
import {
  ClevertapAuthorizationApiResponse,
  ClevertapEmailTemplate,
  ClevertapTemplatesList,
  getTemplateByIdParams,
  MessageMediumTypes,
  TemplateByIdParams,
} from './clevertapApiTypes'
import {
  LocaleDefinition,
  SuccessMessageResponse,
  UpdateEmailTemplateRequestBody,
  UpdateContentBlockRequestBody,
  UpdateTemplateParams,
} from '../types'
import { globalLogger } from '../../../infrastructure/errors/globalErrorHandler'

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
        host: 'https://us1.api.clevertap.com/',
      },
      {
        region: 'eu1',
        host: 'https://eu1.api.clevertap.com/',
      },
      {
        region: 'in1',
        host: 'https://in1.api.clevertap.com/',
      },
      {
        region: 'sg1',
        host: 'https://sg1.api.clevertap.com/',
      },
      {
        region: 'aps3',
        host: 'https://aps3.api.clevertap.com/',
      },
      {
        region: 'sk1',
        host: 'https://sk1-staging-6.wzrkt.com/',
      },
    ]
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
      case MessageMediumTypes.ContentBlock:
        return this.getContentBlocks(accountId, passcode, pageNumber, pageSize)
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

  public async getContentBlocks(
    accountId: string,
    passcode: string,
    pageNumber: number,
    pageSize: number,
  ) {
    return this.get<ClevertapTemplatesList>('/v1/contentBlock/localise/list', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      query: {
        pageNumber,
        pageSize,
      },
      requestLabel: 'getContentBlock',
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
      case MessageMediumTypes.ContentBlock:
        return this.getContentBlockById({ accountId, passcode, templateId })
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

  public getContentBlockById({ accountId, passcode, templateId }: getTemplateByIdParams) {
    return this.get<ClevertapEmailTemplate>('/v1/contentBlock/localise/list', {
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
    // const aj: ClevertapEmailTemplate = {
    //   id: 172226174968871,
    //   name: '#@$@432234567890',
    //   type: 'Text',
    //   content: '{% for %} Hello how are you {% endfor %}',
    //   createdAt: '20245555555',
    //   createdBy: 'priti.mandal@clevertap.com',
    //   updatedAt: '2024-08-08T16:23:44.000Z',
    //   updatedBy: 'priti.mandal@clevertap.com',
    // }
    // return aj
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
      case MessageMediumTypes.ContentBlock:
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

  public async updateContentBlocks(
    accountId: string,
    passcode: string,
    updateContentBlockPayload: UpdateContentBlockRequestBody,
  ) {
    return this.post<SuccessMessageResponse>('/v1/contentBlock/localise/upsert', {
      headers: {
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
        'content-type': 'application/json',
      },
      body: updateContentBlockPayload,
      requestLabel: 'updateEmailTemplate',
    })
  }

  public getLocales(accountId: string, passcode: string): Promise<Awaited<LocaleDefinition[]>> {
    const locales: LocaleDefinition[] = []
    return Promise.resolve(locales)
  }
}

// TODO: fakeIntegration connector 3-rd party client types

import { isObject, isString } from '../../../types'

export type ExternalItem = {
  id: string
  name: string
}

export type ClevertapAuthorizationApiResponse = {
  status: string
  message?: string
  error?: string
  code?: string
}

export enum MessageMediumTypes {
  Email = 'Email',
  ContentBlock = 'ContentBlock',
}

export type ClevertapTemplatesList = {
  templates?: ClevertapTemplatesListItem[]
  contentBlocks?: ClevertapContentBlockListItem[]
  total: number
  pageNumber: number
  pageSize: number
}

export type ClevertapTemplatesListItem = {
  templateId?: number
  templateName?: string
  subType?: string
  path?: string
  createdBy: string
  createdAt: number
  updatedBy?: string
  updatedAt?: string
  labels?: string[]
}

export type ClevertapContentBlockListItem = {
  id?: number
  name?: string
  type?: string
  createdBy: string
  createdAt: number
  updatedBy?: string
  updatedAt?: string
  content?: string
}

export type ClevertapEmailTemplate = {
  templateId?: number
  templateName?: string
  description?: string
  path?: string
  templateData?: {
    subType?: string
    body: string
    ampBody?: string
    senderDetail?: {
      fromName?: string
      fromEmail?: string
      replyToName?: string
      replyToEmail?: string
      subject?: string
      plainText?: string
      preheader?: string
      ccEmails?: string[]
      bccEmails?: string[]
      annotationMeta?: string
    }
  }
  labels?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  partner?: string
  locale?: string
  id?: number
  name?: string
  content?: string
  type?: string
}

// export type ClevertapContentBlock = {
//   templateId?: number
//   templateName?: string
//   id?: number
//   name?: string
//   type?: string
//   createdBy: string
//   createdAt: number
//   updatedBy?: string
//   updatedAt?: string
//   content?: string
//   locale?: string
// }

export type CacheItemsFromTemplateParams = {
  template: ClevertapEmailTemplate
  templateType: string
  contentTypes: string[]
}

export type CacheItemsFromContentBlockParams = {
  template: ClevertapEmailTemplate
  templateType: string
  contentTypes: string[]
}

export type TemplateByIdParams = {
  accountId: string
  passcode: string
  templateId: string
  templateType: string
  locale?: string
}

export type ClevertapRequestHeader = {
  accountId: string
  passcode: string
}

export type getTemplateByIdParams = {
  accountId: string
  passcode: string
  templateId: string
  locale?: string
}

export type ErrorResponse = {
  body: {
    code: string
    msg: string
  }
}

export const isErrorResponse = (data: unknown): data is ErrorResponse =>
  isObject(data) &&
  'body' in data &&
  isObject(data.body) &&
  'code' in data.body &&
  'msg' in data.body &&
  isString(data.body.msg)

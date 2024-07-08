import { AuthFailedError, buildClient, InternalError, sendGet, sendPost } from '@lokalise/node-core'
import { Client } from 'undici'
import { ApiRequest } from '../types'
import type { RequestResult } from 'undici-retry'
import { AuthInvalidDataError } from '../../../infrastructure/errors/publicErrors'

const RETRY_CONFIG = {
  retryOnTimeout: false,
  statusCodesToRetry: [500, 502, 503, 504],
  maxAttempts: 2,
  delayBetweenAttemptsInMsecs: 250,
}

export class APIAbstract {
  protected httpClient: Client
  private apiEndpoint: string

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint
    this.httpClient = buildClient(apiEndpoint)
  }

  public getApiEndpoint() {
    return this.apiEndpoint
  }

  public setApiEndpoint(apiEndpoint: string) {
    if (this.getApiEndpoint() === apiEndpoint) {
      return
    }
    this.apiEndpoint = apiEndpoint
    this.httpClient = buildClient(apiEndpoint)
  }

  public async get<R>(url: string, req: ApiRequest): Promise<R> {
    const result = await sendGet<R>(this.httpClient, url, {
      ...req,
      throwOnError: false,
      retryConfig: RETRY_CONFIG,
    })
    if (result.error) {
      return this.handleError(result.error)
    }
    return result.result.body
  }

  public async post<R>(url: string, req: ApiRequest): Promise<R> {
    const result = await sendPost<R>(this.httpClient, url, req.body, {
      ...req,
      throwOnError: false,
    })
    if (result.error) {
      return this.handleError(result.error)
    }
    return result.result.body
  }

  private handleError(error: RequestResult<unknown>): never {
    if (error.statusCode === 401) {
      throw new AuthInvalidDataError({
        details: {
          requestLabel: error.requestLabel,
        },
      })
    } else if (error.statusCode === 403) {
      throw new AuthFailedError({
        details: {
          requestLabel: error.requestLabel,
        },
      })
    } else if (error.statusCode === 503) {
      throw new AuthFailedError({
        details: {
          message: 'The account id should not be empty',
          requestLabel: error.requestLabel,
        },
      })
    }

    const errorBody = typeof error.body === 'string' ? error.body : JSON.stringify(error.body)
    const errorMessage = errorBody?.length > 0 ? errorBody : 'Internal Error'
    throw new InternalError({
      message: `CleverTap (${error.requestLabel}): ${errorMessage}`,
      errorCode: 'CLEVERTAP_ERROR',
      details: {
        requestLabel: error.requestLabel,
      },
    })
  }
}

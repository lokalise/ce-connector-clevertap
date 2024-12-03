import { globalLogger } from '@lokalise/node-core'
import type { FastifyRequest } from 'fastify'

import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'

import type { CacheRequestBody, CacheResponse, ListCacheResponse } from './cacheTypes'

export async function getCache(req: FastifyRequest, reply: ListCacheResponse) {
  const { cacheService } = req.diScope.cradle

  try {
    globalLogger.info('Getting cache list process started')
    const items = await cacheService.listItems(req.integrationConfig, req.authConfig)
    globalLogger.info(items, '/cache endpoint cache items result is: ')
    await reply.send({
      items,
    })
  } catch (err) {
    globalLogger.error(err, 'Exception occurred in getting cache items')
    await reply.status(403).send({
      message: 'Error while fetching all the templates from CleverTap',
      errorCode: '403',
      details: { err },
    })
  }
}

export async function getCacheItems(
  req: FastifyRequest<{ Body: CacheRequestBody }>,
  reply: CacheResponse,
) {
  const { cacheService } = req.diScope.cradle
  try {
    globalLogger.info('Getting cache list item process started')
    const { items, errors } = await cacheService.getItems(
      req.integrationConfig,
      req.authConfig,
      req.body.items,
    )
    if (errors.length) {
      globalLogger.info(errors, 'Errors while fetching some of the items')
      await reply.code(207).send({
        statusCode: 207,
        items,
        payload: {
          message: 'Some items were not fetched',
          errorCode: MultiStatusErrorCode,
          details: {
            errors,
          },
        },
      })
    }
    globalLogger.info('Get api call for /cache/items endpoint is successful')
    await reply.send({
      items,
    })
  } catch (err) {
    globalLogger.info(err, 'Exception occurred in getting cache-items structure')
    await reply.status(403).send({
      message: 'Error while fetching cache items from CleverTap',
      errorCode: 'ERROR_IN_FETCHING_CACHE_ITEMS',
      details: { err },
    })
  }
}
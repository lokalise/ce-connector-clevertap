import type { FastifyRequest } from 'fastify'

import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'

import type { CacheRequestBody, CacheResponse, ListCacheResponse } from './cacheTypes'

export async function getCache(req: FastifyRequest, reply: ListCacheResponse) {
  const { cacheService } = req.diScope.cradle

  try {
    const items = await cacheService.listItems(req.integrationConfig, req.authConfig)
    await reply.send({
      items,
    })
  } catch (err) {
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
    const { items, errors } = await cacheService.getItems(
      req.integrationConfig,
      req.authConfig,
      req.body.items,
    )
    if (errors.length) {
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
    await reply.send({
      items,
    })
  } catch (error) {
    await reply.status(403).send({
      message: 'Error while fetching cache items from CleverTap',
      errorCode: 'ERROR_IN_FETCHING_CACHE_ITEMS',
      details: { error },
    })
  }
}

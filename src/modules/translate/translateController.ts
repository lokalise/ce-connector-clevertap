import type { FastifyRequest } from 'fastify'

import type { TranslateRequestBody, TranslateResponse } from './translateTypes'
import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'

export const getContent = async (
  req: FastifyRequest<{ Body: TranslateRequestBody }>,
  reply: TranslateResponse,
) => {
  const { translateService } = req.diScope.cradle

  try {
    const { items, errors } = await translateService.getContent(
      req.integrationConfig,
      req.authConfig,
      req.body.locales,
      req.body.items,
      req.body.defaultLocale,
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
  } catch (err) {
    await reply.status(403).send({
      message: 'Error while fetching cache items from CleverTap',
      errorCode: 'ERROR_IN_FETCHING_CACHE_ITEMS',
      details: { err },
    })
  }
}

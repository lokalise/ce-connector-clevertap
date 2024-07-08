import type { FastifyRequest } from 'fastify'

import type { TranslateRequestBody, TranslateResponse } from './translateTypes'
import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'

export const getContent = async (
  req: FastifyRequest<{ Body: TranslateRequestBody }>,
  reply: TranslateResponse,
) => {
  const { translateService } = req.diScope.cradle

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
  } else {
    await reply.send({
      items,
    })
  }
}

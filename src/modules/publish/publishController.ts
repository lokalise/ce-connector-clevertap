import type { FastifyRequest } from 'fastify'

import type { PublishRequestBody, PublishResponse } from './publishTypes'
import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'

export const publishContent = async (
  req: FastifyRequest<{ Body: PublishRequestBody }>,
  reply: PublishResponse,
) => {
  const { publishService } = req.diScope.cradle

  const { errors } = await publishService.publishContent(
    req.integrationConfig,
    req.authConfig,
    req.body.items,
    req.body.defaultLocale,
  )
  if (errors.length) {
    await reply.code(207).send({
      statusCode: 207,
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
      statusCode: 200,
      message: 'Content successfully updated',
    })
  }
}

import type { FastifyRequest } from 'fastify'

import type { PublishRequestBody, PublishResponse } from './publishTypes'
import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'
import { globalLogger } from '@lokalise/node-core'

export const publishContent = async (
  req: FastifyRequest<{ Body: PublishRequestBody }>,
  reply: PublishResponse,
) => {
  const { publishService } = req.diScope.cradle

  try {
    globalLogger.info(req, 'Publishing translated templates process started for req: ')
    const { errors } = await publishService.publishContent(
      req.integrationConfig,
      req.authConfig,
      req.body.items,
      req.body.defaultLocale,
    )
    if (errors.length) {
      globalLogger.info(errors, 'Errors occurred while publishing some of the items')
      await reply.code(207).send({
        statusCode: 207,
        payload: {
          message: 'Some items were not updated',
          errorCode: MultiStatusErrorCode,
          details: {
            errors,
          },
        },
      })
    }
    globalLogger.info('No error occurred while publishing translated content to CleverTap')
    await reply.send({
      statusCode: 200,
      message: 'Content successfully updated',
    })
  } catch (err) {
    globalLogger.error(err, 'Exception occurred in publishing translated templates')
    await reply.status(403).send({
      message: 'Error while publishing templates to CleverTap',
      errorCode: 'ERROR_WHILE_PUBLISHING_TEMPLATES',
      details: { err },
    })
  }
}

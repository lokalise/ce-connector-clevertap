import type { FastifyRequest } from 'fastify'

import type { TranslateRequestBody, TranslateResponse } from './translateTypes'
import { MultiStatusErrorCode } from '../../infrastructure/errors/MultiStatusErrorResponse'
import { globalLogger } from '@lokalise/node-core'

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
      globalLogger.info(
        errors,
        'Errors occurred while fetching translatable content for some of the items',
      )
      await reply.code(207).send({
        statusCode: 207,
        items,
        payload: {
          message: 'Some translatable items were not fetched',
          errorCode: MultiStatusErrorCode,
          details: {
            errors,
          },
        },
      })
    }
    globalLogger.info('No error occurred while fetching translated templates')
    await reply.send({
      items,
    })
  } catch (err) {
    globalLogger.error(err, 'Exception occurred in fetching translated templates')
    await reply.status(403).send({
      message: 'Error while fetching translatable content from CleverTap',
      errorCode: 'ERROR_IN_FETCHING_TRANSLATABLE_CONTENT',
      details: { err },
    })
  }
}

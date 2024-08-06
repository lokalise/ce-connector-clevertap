import type { FastifyRequest } from 'fastify'

import type { EnvResponse } from './envTypes'
import { globalLogger } from '../../infrastructure/errors/globalErrorHandler'

export const getEnv = async (req: FastifyRequest, reply: EnvResponse) => {
  const { envService } = req.diScope.cradle

  const localeData = await envService.getLocales(req.integrationConfig, req.authConfig)
  if (!localeData) {
    globalLogger.error('Error in retrieving locales from CleverTap')
    await reply.status(403).send({
      message: 'Could not retrieve locales from CleverTap.',
      errorCode: 'ERROR_IN_RETRIEVING_LOCALES',
      details: {},
    })
  }

  const cacheItemStructure = await envService.getCacheItemStructure(
    req.integrationConfig,
    req.authConfig,
  )

  await reply.send({
    ...localeData,
    cacheItemStructure,
  })
}

import type { FastifyRequest } from 'fastify'

import type { PostAuthResponse, GetAuthResponse, PostAuthRefreshResponse } from './authTypes'
import { globalLogger } from '@lokalise/node-core'

export const getAuth = async (req: FastifyRequest, reply: GetAuthResponse) => {
  await reply.send({
    type: 'apiToken',
  })
}

export const postAuth = async (req: FastifyRequest, reply: PostAuthResponse) => {
  const { authService } = req.diScope.cradle
  try {
    globalLogger.info('Authentication process started')
    const authConfig = await authService.validate(req.integrationConfig)
    globalLogger.info(
      authConfig,
      'Auth api call for /auth endpoint is successful with authConfig: ',
    )
    await reply.send(authConfig)
  } catch (err) {
    globalLogger.error(err, 'Exception occurred in validating auth credentials')
    await reply.status(403).send({
      message: 'Could not authenticate to CleverTap using the credentials provided.',
      errorCode: 'ERROR_OCCURRED_DURING_AUTHENTICATION',
      details: { err },
    })
  }
}

export const postAuthRefresh = async (req: FastifyRequest, reply: PostAuthRefreshResponse) => {
  const { authService } = req.diScope.cradle

  try {
    const authConfig = await authService.refresh(req.integrationConfig, req.authConfig)
    await reply.send(authConfig)
  } catch (err) {
    await reply.status(403).send({
      message: 'Could not authenticate to 3rd party using the provided key.',
      errorCode: '403',
      details: { err },
    })
  }
}

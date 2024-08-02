import type { FastifyRequest } from 'fastify'

import type { PostAuthResponse, GetAuthResponse, PostAuthRefreshResponse } from './authTypes'

export const getAuth = async (req: FastifyRequest, reply: GetAuthResponse) => {
  await reply.send({
    type: 'apiToken',
  })
}

export const postAuth = async (req: FastifyRequest, reply: PostAuthResponse) => {
  const { authService } = req.diScope.cradle
  try {
    const authConfig = await authService.validate(req.integrationConfig)
    await reply.send(authConfig)
  } catch (err) {
    await reply.status(403).send({
      message: 'Could not authenticate to CleverTap using the credentials provided.',
      errorCode: '403',
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

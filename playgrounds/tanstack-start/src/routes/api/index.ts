import { createAPIFileRoute } from '@tanstack/react-start/api'
import { APIRoute as BaseAPIRoute } from './$'

export const APIRoute = createAPIFileRoute('/api')(BaseAPIRoute.methods)

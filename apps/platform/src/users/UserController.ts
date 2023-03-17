import Router from '@koa/router'
import App from '../app'
import { ProjectState } from '../auth/AuthMiddleware'
import UserDeleteJob from './UserDeleteJob'
import UserPatchJob from './UserPatchJob'
import { JSONSchemaType, validate } from '../core/validate'
import { User, UserParams } from './User'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { getUser, pagedUsers } from './UserRepository'
import { getUserLists } from '../lists/ListService'
import { getUserSubscriptions, toggleSubscription } from '../subscriptions/SubscriptionService'
import { SubscriptionState } from '../subscriptions/Subscription'
import { getUserEvents } from './UserEventRepository'

const router = new Router<
    ProjectState & { user?: User }
>({
    prefix: '/users',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedUsers(params, ctx.state.project.id)
})

const patchUsersRequest: JSONSchemaType<UserParams[]> = {
    $id: 'patchUsers',
    type: 'array',
    items: {
        anyOf: [{
            type: 'object',
            required: ['anonymous_id'],
            properties: {
                anonymous_id: {
                    type: 'string',
                },
                external_id: {
                    type: 'string',
                    nullable: true,
                },
                email: {
                    type: 'string',
                    nullable: true,
                },
                phone: {
                    type: 'string',
                    nullable: true,
                },
                data: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                },
            },
        },
        {
            type: 'object',
            required: ['external_id'],
            properties: {
                anonymous_id: {
                    type: 'string',
                    nullable: true,
                },
                external_id: {
                    type: 'string',
                },
                email: {
                    type: 'string',
                    nullable: true,
                },
                phone: {
                    type: 'string',
                    nullable: true,
                },
                data: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                },
            },
        }],
    },
    minItems: 1,
}
router.patch('/', async ctx => {
    const users = validate(patchUsersRequest, ctx.request.body)

    for (const user of users) {
        await App.main.queue.enqueue(UserPatchJob.from({
            project_id: ctx.state.project.id,
            user,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

const deleteUsersRequest: JSONSchemaType<string[]> = {
    type: 'array',
    items: {
        type: 'string',
    },
    minItems: 1,
}
router.delete('/', async ctx => {

    let userIds = ctx.request.query.user_id || []
    if (!Array.isArray(userIds)) userIds = userIds.length ? [userIds] : []

    userIds = validate(deleteUsersRequest, userIds)

    for (const externalId of userIds) {
        await App.main.queue.enqueue(UserDeleteJob.from({
            project_id: ctx.state.project.id,
            external_id: externalId,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

router.param('userId', async (value, ctx, next) => {
    ctx.state.user = await getUser(parseInt(value), ctx.state.project.id)
    if (!ctx.state.user) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:userId', async ctx => {
    ctx.body = ctx.state.user
})

router.get('/:userId/lists', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await getUserLists(ctx.state.user!.id, params, ctx.state.project.id)
})

router.get('/:userId/events', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await getUserEvents(ctx.state.user!.id, params, ctx.state.project.id)
})

router.get('/:userId/subscriptions', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await getUserSubscriptions(ctx.state.user!.id, params, ctx.state.project.id)
})

router.patch('/:userId/subscriptions', async ctx => {
    const subscriptions = ctx.request.body as Array<{ subscription_id: number, state: SubscriptionState }>
    for (const subscription of subscriptions) {
        await toggleSubscription(
            ctx.state.user!.id,
            subscription.subscription_id,
            subscription.state,
        )
    }
    ctx.body = await getUser(ctx.state.user!.id)
})

export default router
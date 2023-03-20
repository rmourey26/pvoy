import Router from '@koa/router'
import { JSONSchemaType } from 'ajv'
import { searchParamsSchema } from '../core/searchParams'
import { validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { ProjectState } from '../auth/AuthMiddleware'
import { Tag, TagParams } from './Tag'
import { getUsedTags } from './TagService'
import { requireProjectRole } from '../projects/ProjectService'

const router = new Router<
    ProjectState & {
        tag?: Tag
    }
>({
    prefix: '/tags',
})

router.get('/', async ctx => {
    ctx.body = await Tag.searchParams(
        extractQueryParams(ctx.request.query, searchParamsSchema),
        ['name'],
    )
})

router.get('/all', async ctx => {
    ctx.body = await Tag.all(q => q
        .where('project_id', ctx.state.project!.id)
        .orderBy('name', 'asc'),
    )
})

router.get('/used/:entity', async ctx => {
    ctx.body = await getUsedTags(ctx.state.project!.id, ctx.params.entity)
})

const tagParams: JSONSchemaType<TagParams> = {
    $id: 'tagParams',
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string',
        },
    },
}

router.post('/', async ctx => {
    requireProjectRole(ctx, 'editor')
    ctx.body = await Tag.insertAndFetch({
        project_id: ctx.state.project!.id,
        ...validate(tagParams, ctx.request.body),
    })
})

router.param('tagId', async (value, ctx, next) => {
    ctx.state.tag = await Tag.first(b => b.where({
        project_id: ctx.state.project.id,
        id: value,
    }))
    if (!ctx.state.tag) {
        return ctx.throw(404)
    }
    return await next()
})

router.get('/:tagId', async ctx => {
    ctx.body = ctx.state.tag!
})

router.patch('/:tagId', async ctx => {
    requireProjectRole(ctx, 'editor')
    ctx.body = await Tag.updateAndFetch(ctx.state.tag!.id, validate(tagParams, ctx.request.body))
})

router.delete('/:tagId', async ctx => {
    requireProjectRole(ctx, 'editor')
    await Tag.delete(b => b.where('id', ctx.state.tag!.id))
    ctx.body = true
})

export default router

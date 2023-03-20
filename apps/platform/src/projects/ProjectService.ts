import { ProjectState } from 'auth/AuthMiddleware'
import { Next, ParameterizedContext } from 'koa'
import { RequestError } from '../core/errors'
import { SearchParams } from '../core/searchParams'
import { createSubscription } from '../subscriptions/SubscriptionService'
import { uuid } from '../utilities'
import Project, { ProjectParams, ProjectRole, projectRoles } from './Project'
import { ProjectAdmin } from './ProjectAdmins'
import { ProjectApiKey, ProjectApiKeyParams } from './ProjectApiKey'

export const adminProjectIds = async (adminId: number) => {
    const records = await ProjectAdmin.all(qb => qb.where('admin_id', adminId))
    return records.map(item => item.project_id)
}

export const getProject = async (id: number, adminId?: number) => {
    return Project.first(
        qb => {
            qb.where('projects.id', id)
            if (adminId != null) {
                qb.leftJoin('project_admins', 'project_admins.project_id', 'projects.id')
                    .where('admin_id', adminId)
            }
            return qb
        })
}

export const createProject = async (adminId: number, params: ProjectParams) => {
    const project = await Project.insertAndFetch(params)

    // Add the user creating the project to it
    await ProjectAdmin.insert({
        project_id: project.id,
        admin_id: adminId,
        role: 'admin',
    })

    // Create a single subscription for each type
    await createSubscription(project.id, { name: 'Default Email', channel: 'email' })
    await createSubscription(project.id, { name: 'Default SMS', channel: 'text' })
    await createSubscription(project.id, { name: 'Default Push', channel: 'push' })

    return project
}

export const pagedApiKeys = async (params: SearchParams, projectId: number) => {
    return await ProjectApiKey.searchParams(
        params,
        ['name', 'description'],
        qb => qb.where('project_id', projectId),
    )
}

export const getProjectApiKey = async (key: string) => {
    return ProjectApiKey.first(qb => qb.where('value', key).whereNull('deleted_at'))
}

export const createProjectApiKey = async (projectId: number, params: ProjectApiKeyParams) => {
    return await ProjectApiKey.insertAndFetch({
        ...params,
        value: generateApiKey(params.scope),
        project_id: projectId,
    })
}

export const updateProjectApiKey = async (id: number, params: ProjectApiKeyParams) => {
    return await ProjectApiKey.updateAndFetch(id, params)
}

export const revokeProjectApiKey = async (id: number) => {
    return await ProjectApiKey.updateAndFetch(id, { deleted_at: new Date() })
}

export const generateApiKey = (scope: 'public' | 'secret') => {
    const key = uuid().replace('-', '')
    const prefix = scope === 'public' ? 'pk' : 'sk'
    return `${prefix}_${key}`
}

export const requireProjectRole = (ctx: ParameterizedContext<ProjectState>, minRole: ProjectRole) => {
    if (projectRoles.indexOf(minRole) > projectRoles.indexOf(ctx.state.projectRole)) {
        throw new RequestError(`minimum project role ${minRole} is required`, 403)
    }
}

export const projectRoleMiddleware = (minRole: ProjectRole) => async (ctx: ParameterizedContext<ProjectState>, next: Next) => {
    requireProjectRole(ctx, minRole)
    return next()
}

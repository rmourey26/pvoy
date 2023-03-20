import { Database } from 'config/database'
import { SearchParams } from '../core/searchParams'
import { ProjectRole } from './Project'
import { ProjectAdmin } from './ProjectAdmins'

const adminSelectFields = ['admins.first_name', 'admins.last_name', 'admins.email']
const projectAdminFields = [`${ProjectAdmin.tableName}.*`, ...adminSelectFields]

const baseProjectAdminQuery = (builder: Database.QueryBuilder<any>, projectId: number) => {
    return builder
        .select(projectAdminFields)
        .join('admins', 'admin_id', '=', 'admins.id')
        .where('project_id', projectId)
        .whereNull(`${ProjectAdmin.tableName}.deleted_at`)
}

export const pagedProjectAdmins = async (params: SearchParams, projectId: number) => {
    return await ProjectAdmin.searchParams(
        params,
        adminSelectFields,
        q => baseProjectAdminQuery(q, projectId),
    )
}

export const getProjectAdmin = async (projectId: number, adminId: number) => {
    return await ProjectAdmin.first(q => baseProjectAdminQuery(q.where('admin_id', adminId), projectId))
}

export const addAdminToProject = async (projectId: number, adminId: number, role: ProjectRole) => {
    const admin = await getProjectAdmin(adminId, projectId)
    if (admin) {
        return await ProjectAdmin.update(q => q.where('id', admin.id), { role })
    }
    return await ProjectAdmin.insert({
        admin_id: adminId,
        project_id: projectId,
        role,
    })
}

export const removeAdminFromProject = async (projectId: number, adminId: number) => {
    return await ProjectAdmin.update(
        qb => qb.where('admin_id', adminId).where('project_id', projectId),
        { deleted_at: new Date() },
    )
}

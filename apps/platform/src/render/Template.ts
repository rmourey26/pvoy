import Render, { Variables } from '.'
import { Webhook } from '../providers/webhook/Webhook'
import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import { isValid, IsValidSchema } from '../core/validate'

export default class Template extends Model {
    project_id!: number
    campaign_id!: number
    type!: ChannelType
    data!: Record<string, any>
    locale!: string

    static tableName = 'templates'

    static jsonAttributes = ['data']

    map(): TemplateType {
        const json = this as any
        if (this.type === 'email') {
            return EmailTemplate.fromJson(json)
        } else if (this.type === 'text') {
            return TextTemplate.fromJson(json)
        } else if (this.type === 'push') {
            return PushTemplate.fromJson(json)
        }
        return WebhookTemplate.fromJson(json)
    }

    validate(): IsValidSchema {
        return [true, undefined]
    }

    requiredErrors(...fields: string[]) {
        const errors: Record<string, string> = {}
        for (const field of fields) {
            errors[field] = `The \`${field}\` field on the \`${this.locale}\` template is missing and is required.`
        }
        return errors
    }
}

export type TemplateParams = Omit<Template, ModelParams | 'map' | 'screenshotUrl' | 'validate' | 'requiredErrors'>
export type TemplateUpdateParams = Pick<Template, 'type' | 'data'>
export type TemplateType = EmailTemplate | TextTemplate | PushTemplate | WebhookTemplate

export interface CompiledEmail {
    from: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject: string
    text: string
    html: string
}

export class EmailTemplate extends Template {
    declare type: 'email'
    from!: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject!: string
    text!: string
    html!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.from = json?.data.from
        this.cc = json?.data.cc
        this.bcc = json?.data.bcc
        this.reply_to = json?.data.reply_to
        this.subject = json?.data.subject ?? ''
        this.text = json?.data.text ?? ''
        this.html = json?.data.html ?? ''
    }

    compile(variables: Variables): CompiledEmail {
        const email: CompiledEmail = {
            subject: Render(this.subject, variables),
            from: Render(this.from, variables),
            html: Render(this.html, variables),
            text: Render(this.text, variables),
        }
        if (this.reply_to) email.reply_to = Render(this.reply_to, variables)
        if (this.cc) email.cc = Render(this.cc, variables)
        if (this.bcc) email.bcc = Render(this.bcc, variables)
        return email
    }

    validate() {
        return isValid({
            type: 'object',
            required: ['from', 'subject', 'text', 'html'],
            properties: {
                from: { type: 'string' },
                subject: { type: 'string' },
                text: { type: 'string' },
                html: { type: 'string' },
            },
            additionalProperties: true,
            errorMessage: {
                required: this.requiredErrors('from', 'subject', 'text', 'html'),
            },
        }, this.data)
    }
}

export interface CompiledText {
    text: string
}

export class TextTemplate extends Template {
    declare type: 'text'
    text!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.text = json?.data.text
    }

    compile(variables: Variables): CompiledText {
        return { text: Render(this.text, variables) }
    }

    validate() {
        return isValid({
            type: 'object',
            required: ['text'],
            properties: {
                text: { type: 'string' },
            },
            errorMessage: {
                required: this.requiredErrors('text'),
            },
        }, this.data)
    }
}

export interface CompiledPush {
    title: string
    topic: string
    body: string
    custom: Record<string, any>
}

export class PushTemplate extends Template {
    declare type: 'push'
    title!: string
    topic!: string
    body!: string
    custom!: Record<string, any>

    parseJson(json: any) {
        super.parseJson(json)

        this.title = json?.data.title
        this.topic = json?.data.topic
        this.body = json?.data.body
        this.custom = json?.data.custom
    }

    compile(variables: Variables): CompiledPush {
        const custom = Object.keys(this.custom).reduce((body, key) => {
            body[key] = Render(this.custom[key], variables)
            return body
        }, {} as Record<string, any>)

        return {
            topic: this.topic,
            title: Render(this.title, variables),
            body: Render(this.body, variables),
            custom,
        }
    }

    validate() {
        return isValid({
            type: 'object',
            required: ['title', 'topic', 'body'],
            properties: {
                title: { type: 'string' },
                topic: { type: 'string' },
                body: { type: 'string' },
            },
            additionalProperties: true,
            errorMessage: {
                required: this.requiredErrors('title', 'topic', 'body'),
            },
        }, this.data)
    }
}

export class WebhookTemplate extends Template {
    declare type: 'webhook'
    method!: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
    endpoint!: string
    body!: Record<string, any>
    headers: Record<string, string> = {}

    parseJson(json: any) {
        super.parseJson(json)

        this.method = json?.data.method
        this.endpoint = json?.data.endpoint
        this.body = json?.data.body
        this.headers = json?.data.headers || {}
    }

    compile(variables: Variables): Webhook {
        const headers = Object.keys(this.headers).reduce((headers, key) => {
            headers[key] = Render(this.headers[key], variables)
            return headers
        }, {} as Record<string, string>)

        const body = Object.keys(this.body).reduce((body, key) => {
            body[key] = Render(this.body[key], variables)
            return body
        }, {} as Record<string, any>)

        const endpoint = Render(this.endpoint, variables)
        const method = this.method
        return {
            endpoint,
            method,
            headers,
            body,
        }
    }
}
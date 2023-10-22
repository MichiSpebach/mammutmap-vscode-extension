export class RequestMessage {
    public readonly id: string|undefined
    public readonly target: 'fileSystem'|'environment'|'map'
    public readonly command: string
    public readonly parameters: Object[]

    public static isRequest(object: Object): boolean {
        return !!(object as RequestMessage).command
    }

    public static ofRawObject(object: Object): RequestMessage {
        const request: RequestMessage = Object.setPrototypeOf(object, RequestMessage.prototype)
        request.validate()
        return request
    }

    public constructor(options: {id?: string, target: 'fileSystem'|'environment'|'map', command: string, parameters: string[]}) {
        this.id = options.id
        this.target = options.target
        this.command = options.command
        this.parameters = options.parameters
    }

    private validate(): void {
        if (!this.target) {
            console.warn('RequestMessage::validate() target is not set.')
        } else if (!['fileSystem', 'environment', 'map'].includes(this.target)) {
            console.warn(`RequestMessage::validate() expected target to be in ['fileSystem', 'environment', 'map'] but is '${this.target}.`)
        }
        if (!this.command) {
            console.warn('RequestMessage::validate() command is not set.')
        }
        if (!this.parameters) {
            console.warn('RequestMessage::validate() parameters is not set.')
        }
    }
}
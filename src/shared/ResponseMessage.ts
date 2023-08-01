export class ResponseMessage {
    public readonly id: string
    public readonly result: Object|undefined
    public readonly error: string|undefined

    public static isResponse(object: Object): boolean {
        const objectAsResponse = object as ResponseMessage
        // '!objectAsResponse.result' would be false for false
        return objectAsResponse.result !== undefined || !!objectAsResponse.error
    }

    public static ofRawObject(object: Object): ResponseMessage {
        const response: ResponseMessage = Object.setPrototypeOf(object, ResponseMessage.prototype)
        response.validate()
        return response
    }

    public static newSuccess(options: {id: string, result: Object, error?: string}): ResponseMessage {
        return new ResponseMessage(options)
    }

    public static newFailure(options: {id: string, error: string}): ResponseMessage {
        return new ResponseMessage(options)
    }

    private constructor(options: {id: string, result?: Object, error?: string}) {
        this.id = options.id
        this.result = options.result
        this.error = options.error
        this.validate()
    }

    private validate(): void {
        if (!this.id) {
            console.warn('ResponseMessage::validate() id is not set.')
        }
        // '!this.result' would be false for false
        if (this.result === undefined && !this.error) {
            console.warn('ResponseMessage::validate() neither result nor error is set.')
        }
    }
}
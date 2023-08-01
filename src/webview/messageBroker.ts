import { log } from '../../out/dist/core/logService.js'
import { util } from '../../out/dist/core/util/util.js'
import { map } from '../../out/dist/core/Map.js'
import { RequestMessage } from '../shared/RequestMessage.js'
import { ResponseMessage } from '../shared/ResponseMessage.js'

/* eslint-disable @typescript-eslint/naming-convention */
interface vscode {
    postMessage(message: any): void
}
declare function acquireVsCodeApi(): vscode
const vscode: vscode = acquireVsCodeApi()

const ongoingPromises: Map<string, {resolve: (value: any) => void, reject: (reason?: any) => void}> = new Map()

let nextId: number = 0;

window.addEventListener('message', event => {
    const isRequest: boolean = RequestMessage.isRequest(event.data)
    const isResponse: boolean = ResponseMessage.isResponse(event.data)
    if (isRequest) {
        handleRequest(RequestMessage.ofRawObject(event.data))
    }
    if (isResponse) {
        handleResponse(ResponseMessage.ofRawObject(event.data))
    }
    if (!isRequest && !isResponse) {
        log.warning(`(webview)messageBroker: received message is neither RequestMessage nor ResponseMessage and is ignored, message is ${util.stringify(event.data)}.`)
    }
    if (isRequest && isResponse) {
        log.warning(`(webview)messageBroker: received message is RequestMessage and ResponseMessage (°o°), message is ${util.stringify(event.data)}.`)
    }
})

export function postMessage(command: string, ...parameters: any[]): Promise<any> {
    const id: string = (nextId++).toString()
    let resolve: (value: any) => void = () => {}
    let reject: (value: any) => void = () => {}
    const promise: Promise<any> = new Promise((res: (value: any) => void, rej: (reason?: any) => void) => {
        resolve = res
        reject = rej
    })
    vscode.postMessage({id, command, parameters})
    ongoingPromises.set(id, {resolve, reject})
    return promise
}

function handleRequest(request: RequestMessage): void {
    if (request.target === 'map') {
        if (!map) {
            logWarning(`received command '${request.target}'::'${request.command}' but map is not initialized.`)
            return
        }
        if (!request.parameters) {
            logWarning(`expected at least one parameter for command '${request.target}'::'${request.command}' but parameters are '${request.parameters}'.`)
            return
        }
        if (typeof request.parameters[0] !== 'string') {
            logWarning(`expected parameters[0] to be typeof string for command '${request.target}'::'${request.command}' but parameters[0] is '${request.parameters[0]}'.`)
            return
        }
        map.flyTo(request.parameters[0])
        return
    }
    logWarning(`target '${request.target}' not implemented.`)
    
    function logWarning(message: string): void {
        log.warning(`(webview)messageBroker::handleRequest(..) ${message}`)
    }
}

function handleResponse(response: ResponseMessage): void {
    const promise = ongoingPromises.get(response.id)
    if (!promise) {
        logWarning(`ongoingPromises does not contain entry with id '${response.id}', response is ${util.stringify(response)}.`)
        return
    }
    if (response.result !== undefined) { // '!response.result' would be false for false
        promise.resolve(response.result)
        if (response.error) {
            logWarning(`id '${response.id}' succeeded with error "${response.error}" (ChuckNorrisResponse).`)
            return
        }
    } else if (response.error) {
        promise.reject(response.error)
    } else if (response.result === undefined && !response.error) { // '!response.result' would be false for false
        logWarning(`response with id '${response.id}' has neither result nor error, rejecting promise.`)
        promise.reject('response has neither result nor error')
    }

    function logWarning(message: string): void {
        log.warning(`(webview)messageBroker::handleResponse(..) ${message}`)
    }
}
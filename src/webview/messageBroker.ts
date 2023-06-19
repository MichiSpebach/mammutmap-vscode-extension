import { log } from '../../out/dist/core/logService.js'
import { util } from '../../out/dist/core/util/util.js'

interface vscode {
    postMessage(message: any): void
}
declare function acquireVsCodeApi(): vscode
const vscode: vscode = acquireVsCodeApi()

const ongoingPromises: Map<number, {resolve: (value: any) => void, reject: (reason?: any) => void}> = new Map()

let nextId: number = 0;

window.addEventListener('message', event => {
    const data: {id: number, result?: any, error?: any} = event.data
    const promise = ongoingPromises.get(data.id)
    if (!promise) {
        log.warning(`messageManager: ongoingPromises does not contain entry with id '${data.id}'.`)
        return
    }
    if (data.result !== undefined) {
        promise.resolve(data.result)
    }
    if (data.error !== undefined) {
        promise.reject(data.error)
    }
    if (data.result === undefined && data.error === undefined) {
        log.warning(`messageManager: event.data with id '${data.id}' has neither result nor error, promise will neither resolve nor reject.`)
    }
})

export function postMessage(command: string, ...parameters: any[]): Promise<any> {
    const id: number = nextId++
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

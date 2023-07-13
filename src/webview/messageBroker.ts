import { log } from '../../out/dist/core/logService.js'
import { map } from '../../out/dist/core/Map.js'

interface vscode {
    postMessage(message: any): void
}
declare function acquireVsCodeApi(): vscode
const vscode: vscode = acquireVsCodeApi()

const ongoingPromises: Map<number, {resolve: (value: any) => void, reject: (reason?: any) => void}> = new Map()

let nextId: number = 0;

window.addEventListener('message', event => {
    const data: {id: number, target?: string, command?: string, parameters?: any[], result?: any, error?: any} = event.data
    if (data.target) {
        if (data.target === 'map') {
            if (!map) {
                log.warning(`messageBroker: received RequestMessage with target '${data.target}', but map is not initialized.`)
                return
            }
            if (!data.parameters) {
                log.warning(`messageBroker: expected at least one parameter for command '${data.target}'::'${data.command}' but parameters are '${data.parameters}'.`)
                return
            }
            map.flyTo(data.parameters[0])
            return
        }
        log.warning(`messageBroker: received RequestMessage with unknown target '${data.target}'.`)
        return
    }

    const promise = ongoingPromises.get(data.id)
    if (!promise) {
        log.warning(`messageBroker: ongoingPromises does not contain entry with id '${data.id}'.`)
        return
    }
    if (data.result !== undefined) {
        promise.resolve(data.result)
    }
    if (data.error !== undefined) {
        promise.reject(data.error)
    }
    if (data.result === undefined && data.error === undefined) {
        log.warning(`messageBroker: event.data with id '${data.id}' has neither result nor error, promise will neither resolve nor reject.`)
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

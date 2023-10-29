import * as vscode from 'vscode'
import { SchedulablePromise } from '../out/distCommonJs/core/RenderManager'
import { RequestMessage } from './sharedCommonJs/RequestMessage'
import { ResponseMessage } from './sharedCommonJs/ResponseMessage'
import { environment, fileSystem } from './setup'

export class MessageBroker {
	private readonly panel: vscode.WebviewPanel
	public readonly greetingFromWebview = new SchedulablePromise<void>(() => {})

	public constructor(panel: vscode.WebviewPanel) {
		this.panel = panel
	}
	
	public async processMessage(message: RequestMessage): Promise<void> {
		if (message.command === 'greet') {
			this.greetingFromWebview.run()
			return
		}
	
		const errors: string[] = []
		const id: string|undefined = message.id ?? (() => {
			errors.push(`message has no id`)
			return 'noIdProvided'
		})()
		switch (message.target) {
			case 'fileSystem':
				try {
					const result: unknown = await (fileSystem as any)[message.command](...message.parameters)
					this.postMessage(ResponseMessage.newSuccess({id, result: result ?? {}, error: buildErrorMessageIfExistent(errors)}))
				} catch(error: unknown) {
					errors.push(error?.toString() ?? 'unknown fileSystem error')
					this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)})) // TODO: also send stacktrace?
				}
				return
			case 'environment':
				if (message.command === 'openFile') { // TODO: introduce MapTabEnvironmentAdapter instead
					if (message.parameters.length !== 1) {
						errors.push(`expected exactly one parameter, but are ${message.parameters.length}`)
						this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)}))
						return
					}
					if (typeof message.parameters[0] !== 'string') {
						errors.push(`expected a string as parameter, but is ${typeof message.parameters}`)
						this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)}))
						return
					}
					try {
						environment.openFile(message.parameters[0], {nearButAvoidColumn: this.panel.viewColumn})
						this.postMessage(ResponseMessage.newSuccess({id, result: {}, error: buildErrorMessageIfExistent(errors)}))
					} catch(error: unknown) {
						errors.push(error?.toString() ?? 'unknown environment error')
						this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)})) // TODO: also send stacktrace?
					}
					return
				}
				try {
					const result: unknown = await (environment as any)[message.command](...message.parameters)
					this.postMessage(ResponseMessage.newSuccess({id, result: result ?? {}, error: buildErrorMessageIfExistent(errors)}))
				} catch(error: unknown) {
					errors.push(error?.toString() ?? 'unknown environment error')
					this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)})) // TODO: also send stacktrace?
				}
				return
			default:
				errors.push(`unsupported message.target '${message.target}'`)
				this.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)}))
				return
		}
		
		function buildErrorMessageIfExistent(errors: string[]): string|undefined {
			if (errors.length === 0) {
				return undefined
			}
			return buildErrorMessage(errors)
		}
		
		function buildErrorMessage(errors: string[]): string {
			return `mapPanel.webview.onDidReceiveMessage failed: ${errors.join(', ')}; received message is '${JSON.stringify(message)}'.`
		}
	}

	public async postMessage(message: RequestMessage|ResponseMessage): Promise<void> {
		await this.panel.webview.postMessage(message)
	}
}

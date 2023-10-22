// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VsCodeNodeJsFileSystemAdapter } from './VsCodeNodeJsFileSystemAdapter';
import { SchedulablePromise } from '../out/distCommonJs/core/RenderManager';
import { FileSystemAdapter, Stats } from '../out/distCommonJs/core/fileSystemAdapter';
import * as util from './util'
import { RequestMessage } from './sharedCommonJs/RequestMessage';
import { ResponseMessage } from './sharedCommonJs/ResponseMessage';
import { VsCodeEnvironmentAdapter } from './VsCodeEnvironmentAdapter';
import { EnvironmentAdapter } from '../out/distCommonJs/core/environmentAdapter';

let environment: EnvironmentAdapter
let fileSystem: FileSystemAdapter
let mapPanel: vscode.WebviewPanel|undefined = undefined
let fileExplorerInterval: NodeJS.Timer|undefined = undefined // TODO: this is a hack, find better solution
let latestFileExplorerSelection: string|undefined = undefined

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	environment = new VsCodeEnvironmentAdapter()
	fileSystem = new VsCodeNodeJsFileSystemAdapter(context.extensionUri)
	const openMapDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.mammutmap', () => {
		createOrRevealMapPanel(context)
	})
	context.subscriptions.push(openMapDisposable)

	const flyToPathDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.flyToPath', async (data) => {
		if (!data || !data.path || typeof data.path !== 'string') {
			vscode.window.showErrorMessage(`mammutmap.flyToPath called without data.path, data is ${data}`)
		}
		const mapPanel: vscode.WebviewPanel = await createOrRevealMapPanel(context)
		mapPanel.webview.postMessage(new RequestMessage({target: 'map', command: 'flyTo', parameters: [util.normalizePath(data.path)]}))
	})
	context.subscriptions.push(flyToPathDisposable)
}

async function createOrRevealMapPanel(context: vscode.ExtensionContext): Promise<vscode.WebviewPanel> {
	if (mapPanel) {
		mapPanel.reveal()
		return mapPanel
	}
	
	mapPanel = vscode.window.createWebviewPanel('mammutmap', 'Mammutmap', vscode.ViewColumn.One, {
		enableScripts: true,
		localResourceRoots: [vscode.Uri.file(context.extensionPath)],
		retainContextWhenHidden: true
	})
	mapPanel.webview.html = getWebviewContent(mapPanel.webview, context.extensionUri)
	const promise = new SchedulablePromise<vscode.WebviewPanel>(() => mapPanel!)
	const timeout = setTimeout(() => {
		vscode.window.showWarningMessage(`createOrRevealMapPanel Mammutmap did not greet within 5 seconds.`)
		promise.run()
	}, 5000)
	mapPanel.webview.onDidReceiveMessage(async (rawMessage: Object) => {
		if (!mapPanel) {
			vscode.window.showWarningMessage(`mapPanel.webview.onDidReceiveMessage called while mapPanel is '${mapPanel}', received message is '${rawMessage}'.`)
			return
		}
		if ((rawMessage as RequestMessage).command === 'greet') {
			clearTimeout(timeout)
			promise.run()
			return
		}

		const message = RequestMessage.ofRawObject(rawMessage)
		const errors: string[] = []
		const id: string|undefined = message.id ?? (() => {
			errors.push(`message has no id`)
			return 'noIdProvided'
		})()
		switch (message.target) {
			case 'fileSystem':
				try {
					const result: unknown = await (fileSystem as any)[message.command](...message.parameters)
					mapPanel.webview.postMessage(ResponseMessage.newSuccess({id, result: result ?? {}, error: buildErrorMessageIfExistent(errors)}))
				} catch(error: unknown) {
					errors.push(error?.toString() ?? 'unknown fileSystem error')
					mapPanel.webview.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)})) // TODO: also send stacktrace?
				}
				return
			case 'environment':
				try {
					const result: unknown = await (environment as any)[message.command](...message.parameters)
					mapPanel.webview.postMessage(ResponseMessage.newSuccess({id, result: result ?? {}, error: buildErrorMessageIfExistent(errors)}))
				} catch(error: unknown) {
					errors.push(error?.toString() ?? 'unknown environment error')
					mapPanel.webview.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)})) // TODO: also send stacktrace?
				}
				return
			default:
				errors.push(`unsupported message.target '${message.target}'`)
				mapPanel.webview.postMessage(ResponseMessage.newFailure({id, error: buildErrorMessage(errors)}))
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
	})
	updateFileExplorerInterval()
	const onChangeViewState: vscode.Disposable = mapPanel.onDidChangeViewState(() => updateFileExplorerInterval())
	const onChangeWindowState: vscode.Disposable = vscode.window.onDidChangeWindowState(() => updateFileExplorerInterval())
	mapPanel.onDidDispose(() => {
		onChangeViewState.dispose()
		onChangeWindowState.dispose()
		mapPanel = undefined
		updateFileExplorerInterval()
	})
	return promise.get()
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const indexJsPath: vscode.Uri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'index.js'))
	const indexCssPath: vscode.Uri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'dist', 'core', 'index.css'))
	// TODO: further restrict Content-Security-Policy, use hashes and nonces to avoid 'unsafe-inline'
	return `<!DOCTYPE html>
	<html id="html">
	  <head id="head">
		<meta charset="UTF-8">
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'unsafe-inline'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:;"/>
		<title>MammutMap</title>
		<link rel="stylesheet" href="${indexCssPath}">
		<script type="module" src="${indexJsPath}"></script>
	  </head>
	  <body id="body" style="position:absolute;width:100%;height:100%;max-width:100%;padding:0px;">
		<div id="content"></div>
		<div id="unplacedElements" style="display:none;"></div>
	  </body>
	</html>`
}

function updateFileExplorerInterval(): void {
	if (mapPanel && mapPanel.visible && vscode.window.state.focused) {
		setFileExplorerInterval()
	} else {
		clearFileExplorerInterval()
	}
}

function setFileExplorerInterval(): void {
	if (fileExplorerInterval) {
		// this happens sometimes onDidChangeViewState or onDidChangeWindowState seem to fire spontaneously sometimes
		//vscode.window.showWarningMessage('trying to set fileExplorerInterval but is already active.')
		return
	}
	fileExplorerInterval = setInterval(async () => {
		if (!vscode.window.state.focused) {
			vscode.window.showWarningMessage('fileExplorerInterval is active although window is not focused, clearing fileExplorerInterval.')
			clearFileExplorerInterval();
			return
		}
		if (!mapPanel || !mapPanel.visible) {
			vscode.window.showWarningMessage('fileExplorerInterval is active although mapPanel is not, clearing fileExplorerInterval.')
			clearFileExplorerInterval()
			return
		}
		updateLatestFileExplorerSelection(mapPanel)
	}, 100)
}

function clearFileExplorerInterval(): void {
	if (!fileExplorerInterval) {
		return
	}
	clearInterval(fileExplorerInterval)
	fileExplorerInterval = undefined
}

async function updateLatestFileExplorerSelection(mapPanel: vscode.WebviewPanel): Promise<void> {
	const path: string|undefined = await getFileExplorerSelection()
	if (path === latestFileExplorerSelection) {
		return
	}
	latestFileExplorerSelection = path
	if (!path) {
		return
	}
	const normalizePath = util.normalizePath(path)
	const stats: Stats|null = await fileSystem.getDirentStatsIfExists(normalizePath)
	if (stats && !stats.isFile()) {
		mapPanel.webview.postMessage(new RequestMessage({target: 'map', command: 'flyTo', parameters: [normalizePath]}))
	}
}

async function getFileExplorerSelection(): Promise<string|undefined> {
	// TODO: this is a hack, find better solution
	const clipboardContentToRestore: string = await vscode.env.clipboard.readText()
	await vscode.commands.executeCommand('copyFilePath')
	const path: string = await vscode.env.clipboard.readText()
	vscode.env.clipboard.writeText(clipboardContentToRestore)
	if (path === '' || path.startsWith('webview-panel')) {
		return undefined
	}
	return path
}

// This method is called when your extension is deactivated
export function deactivate(): void {}

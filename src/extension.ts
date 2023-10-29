// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VsCodeNodeJsFileSystemAdapter } from './VsCodeNodeJsFileSystemAdapter';
import { Stats } from '../out/distCommonJs/core/fileSystemAdapter';
import * as util from './util'
import { RequestMessage } from './sharedCommonJs/RequestMessage';
import { VsCodeEnvironmentAdapter } from './VsCodeEnvironmentAdapter';
import { MessageBroker } from './MessageBroker'
import * as setup from './setup'
import { fileSystem } from './setup';

type MapTab = {
	panel: vscode.WebviewPanel
	messageBroker: MessageBroker
}

let mapTab: MapTab|undefined = undefined
let fileExplorerInterval: NodeJS.Timer|undefined = undefined // TODO: this is a hack, find better solution
let latestFileExplorerSelection: string|undefined = undefined

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	setup.initEnvironment(new VsCodeEnvironmentAdapter())
	setup.initFileSystem(new VsCodeNodeJsFileSystemAdapter(context.extensionUri))
	const openMapDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.mammutmap', () => {
		createOrRevealMapTab(context)
	})
	context.subscriptions.push(openMapDisposable)

	const flyToPathDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.flyToPath', async (data) => {
		if (!data || !data.path || typeof data.path !== 'string') {
			vscode.window.showErrorMessage(`mammutmap.flyToPath called without data.path, data is ${data}`)
		}
		const mapTab: MapTab = await createOrRevealMapTab(context)
		mapTab.messageBroker.postMessage(new RequestMessage({target: 'map', command: 'flyTo', parameters: [util.normalizePath(data.path)]}))
	})
	context.subscriptions.push(flyToPathDisposable)
}

async function createOrRevealMapTab(context: vscode.ExtensionContext): Promise<MapTab> {
	if (mapTab) {
		mapTab.panel.reveal()
		return mapTab
	}
	
	const panel = vscode.window.createWebviewPanel('mammutmap', 'Mammutmap', vscode.ViewColumn.Active, {
		enableScripts: true,
		localResourceRoots: [vscode.Uri.file(context.extensionPath)],
		retainContextWhenHidden: true
	})
	panel.webview.html = getWebviewContent(panel.webview, context.extensionUri)
	const messageBroker = new MessageBroker(panel)
	mapTab = {panel, messageBroker}

	mapTab.panel.webview.onDidReceiveMessage((message: Object) => messageBroker.processMessage(RequestMessage.ofRawObject(message)))
	updateFileExplorerInterval()
	const onChangeViewState: vscode.Disposable = mapTab.panel.onDidChangeViewState(() => updateFileExplorerInterval())
	const onChangeWindowState: vscode.Disposable = vscode.window.onDidChangeWindowState(() => updateFileExplorerInterval())
	mapTab.panel.onDidDispose(() => {
		onChangeViewState.dispose()
		onChangeWindowState.dispose()
		mapTab = undefined
		updateFileExplorerInterval()
	})

	await util.timelimitPromise({
		promise: messageBroker.greetingFromWebview.get(), 
		resolveOnTimeout: () => vscode.window.showWarningMessage(`createOrRevealMapTab: Mammutmap tab did not greet within 5 seconds.`),
		timelimitInMS: 5000
	})
	return mapTab
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
	if (mapTab && mapTab.panel.visible && vscode.window.state.focused) {
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
	fileExplorerInterval = setInterval(updateLatestFileExplorerSelection, 100)
}

function clearFileExplorerInterval(): void {
	if (!fileExplorerInterval) {
		return
	}
	clearInterval(fileExplorerInterval)
	fileExplorerInterval = undefined
}

async function updateLatestFileExplorerSelection(): Promise<void> {
	if (!vscode.window.state.focused) {
		vscode.window.showWarningMessage('fileExplorerInterval is active although window is not focused, clearing fileExplorerInterval.')
		clearFileExplorerInterval();
		return
	}
	if (!mapTab || !mapTab.panel.visible) {
		vscode.window.showWarningMessage('fileExplorerInterval is active although mapPanel is not, clearing fileExplorerInterval.')
		clearFileExplorerInterval()
		return
	}

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
		mapTab.messageBroker.postMessage(new RequestMessage({target: 'map', command: 'flyTo', parameters: [normalizePath]}))
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

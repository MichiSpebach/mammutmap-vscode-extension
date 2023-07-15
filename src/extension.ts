// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VsCodeNodeJsFileSystemAdapter } from './VsCodeNodeJsFileSystemAdapter';
import { SchedulablePromise } from '../out/distCommonJs/core/RenderManager';

let mapPanel: vscode.WebviewPanel|undefined = undefined

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const openMapDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.mammutmap', () => {
		createOrRevealMapPanel(context)
	})
	context.subscriptions.push(openMapDisposable)

	const flyToPathDisposable: vscode.Disposable = vscode.commands.registerCommand('mammutmap.flyToPath', async (data) => {
		console.log(data.path)
		if (!data || !data.path || typeof data.path !== 'string') {
			vscode.window.showErrorMessage(`mammutmap.flyToPath called without data.path, data is ${data}`)
		}
		const mapPanel: vscode.WebviewPanel = await createOrRevealMapPanel(context)
		let path: string = data.path
		if (path.startsWith('/c:/')) {
			path = path.replace('/c:/', 'c:/')
		} else {
			vscode.window.showWarningMessage(`mammutmap.flyToPath expected data.path '${data}' to start with '/c:/'.`)
		}
		mapPanel.webview.postMessage({target: 'map', command: 'flyTo', parameters: [path]})
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
	mapPanel.webview.onDidReceiveMessage(async message => {
		if (!mapPanel) {
			vscode.window.showWarningMessage(`mapPanel.webview.onDidReceiveMessage called while mapPanel is '${mapPanel}', received message is '${message}'.`)
			return
		}
		if (message.command === 'greet') {
			clearTimeout(timeout)
			promise.run()
			return
		}
		try {
			const fileSystem = new VsCodeNodeJsFileSystemAdapter(context.extensionUri)
			const result = await (fileSystem as any)[message.command](...message.parameters)
			mapPanel.webview.postMessage({id: message.id, result})
		} catch(error: any) {
			mapPanel.webview.postMessage({id: message.id, error: error.toString()}) // TODO: also send stacktrace?
		}
	})
	mapPanel.onDidDispose(() => mapPanel = undefined)
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
		<div id="terminal" class="terminal">
		  <div id="log" style="margin-bottom:15px;"></div>
		  <input id="commandLine" style="position:absolute;bottom:0px;width:95%;" class="commandLine">
		</div>
		<div id="unplacedElements" style="display:none;"></div>
	  </body>
	</html>`
}

// This method is called when your extension is deactivated
export function deactivate(): void {}

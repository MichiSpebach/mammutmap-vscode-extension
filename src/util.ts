import * as vscode from 'vscode';
import { util } from '../out/distCommonJs/core/util/util';

export function normalizePath(path: string): string {
	// TODO: make implementation dependent on how fileSystem.extensionUri looks

	let normalizedPath: string = path.replace(/^[/](\w[:][/])/, '$1')
	normalizedPath = normalizedPath.replace(/^(\w[:]\\)/, start => start.toLowerCase())

    if (path === normalizedPath) {
		vscode.window.showWarningMessage(`normalizePath expected path '${path}' to start with '/c:/' or 'C:\\'.`)
	}

	return util.replaceBackslashesWithSlashes(normalizedPath)
}
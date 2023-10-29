import * as vscode from 'vscode';
import { ChildProcess, EnvironmentAdapter } from '../out/distCommonJs/core/environmentAdapter'

export class VsCodeEnvironmentAdapter implements EnvironmentAdapter {

	public getEnvironmentName(): 'vscode' {
		return 'vscode';
	}

	public runShellCommand(command: string): ChildProcess {
		throw new Error('Method not implemented.');
	}

	public openFile(path: string, options?: {nearButAvoidColumn?: vscode.ViewColumn}): void {
		if (!options?.nearButAvoidColumn) {
			vscode.window.showTextDocument(vscode.Uri.file(path))
			return
		}

		let nearestOtherTabGroup: vscode.TabGroup|undefined = undefined
		for (const tabGroup of vscode.window.tabGroups.all) {
			if (tabGroup.viewColumn === options.nearButAvoidColumn) {
				continue
			}
			if (!nearestOtherTabGroup || Math.abs(tabGroup.viewColumn-options.nearButAvoidColumn) < Math.abs(nearestOtherTabGroup.viewColumn-options.nearButAvoidColumn)) {
				nearestOtherTabGroup = tabGroup
			}
		}
		vscode.window.showTextDocument(vscode.Uri.file(path), {viewColumn: nearestOtherTabGroup?.viewColumn})
	}

}
import * as vscode from 'vscode';
import { ChildProcess, EnvironmentAdapter } from '../out/distCommonJs/core/environmentAdapter'

export class VsCodeEnvironmentAdapter implements EnvironmentAdapter {

	public getEnvironmentName(): 'vscode' {
		return 'vscode';
	}

	public runShellCommand(command: string): ChildProcess {
		throw new Error('Method not implemented.');
	}

	public openFile(path: string): void {
		vscode.window.showTextDocument(vscode.Uri.file(path))
	}

}
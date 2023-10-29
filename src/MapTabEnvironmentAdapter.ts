import * as vscode from 'vscode';
import { ChildProcess, EnvironmentAdapter } from '../out/distCommonJs/core/environmentAdapter'
import { environment } from './setup';

export class MapTabEnvironmentAdapter implements EnvironmentAdapter {
    private readonly mapPanel: vscode.WebviewPanel

    public constructor(mapPanel: vscode.WebviewPanel) {
        this.mapPanel = mapPanel
    }

    public getEnvironmentName(): 'electron' | 'browser' | 'vscode' {
        return environment.getEnvironmentName()
    }

    public runShellCommand(command: string): ChildProcess {
        return environment.runShellCommand(command)
    }

    public openFile(path: string): void {
        environment.openFile(path, {nearButAvoidColumn: this.mapPanel.viewColumn})
    }

}
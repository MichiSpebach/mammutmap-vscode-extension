import * as vscode from 'vscode';
import * as fs from 'fs'
import { FileSystemAdapter, Dirent, OpenDialogReturnValue, Stats, OpenDialogOptions, DirentBasicImpl } from '../out/distCommonJs/core/fileSystemAdapter';
import { NodeJsFileSystemAdapter } from '../out/distCommonJs/electronApp/NodeJsFileSystemAdapter';

export class VsCodeFileSystemAdapter extends FileSystemAdapter {
    private readonly nodeJsFileSystem: NodeJsFileSystemAdapter = new NodeJsFileSystemAdapter()
    
    public constructor(
        private readonly extensionUri: vscode.Uri
    ) {
        super();
    }

    public doesDirentExistAndIsFile(path: string): Promise<boolean> {
        return this.nodeJsFileSystem.doesDirentExistAndIsFile(this.toExtensionPath(path))
    }

    public doesDirentExist(path: string): Promise<boolean> {
        return this.nodeJsFileSystem.doesDirentExist(this.toExtensionPath(path))
    }

    public async getDirentStatsIfExists(path: string): Promise<Stats | null> {
        const stats: fs.Stats|null = await this.nodeJsFileSystem.getDirentStatsIfExists(this.toExtensionPath(path))
        if (!stats) {
            return null
        }
        const kind: 'directory'|'file' = this.getDirentKind(stats, path)
        return {size: stats.size, isFile: () => kind === 'file', kind} as Stats // 'kind' is needed because 'isFile()' would fail to be reconverted to Stats on webview side
    }

    public async getDirentStatsOrThrow(path: string): Promise<Stats> {
        const stats: fs.Stats = await this.nodeJsFileSystem.getDirentStatsOrThrow(this.toExtensionPath(path))
        const kind: 'directory'|'file' = this.getDirentKind(stats, path)
        return {size: stats.size, isFile: () => kind === 'file', kind} as Stats // 'kind' is needed because 'isFile()' would fail to be reconverted to Stats on webview side
    }

    public async readdir(path: string): Promise<Dirent[]> {
        const nodeJsDirents: fs.Dirent[] = await this.nodeJsFileSystem.readdir(this.toExtensionPath(path))
        return nodeJsDirents.map((nodeJsDirent: fs.Dirent) => {
            return new DirentBasicImpl(nodeJsDirent.name, this.getDirentKind(nodeJsDirent, path)) // 'nodeJsDirent' would fail to be reconverted to Dirent on webview side
        })
    }
    
    private getDirentKind(direntOrStats: Dirent | fs.Stats, path: string): 'directory' | 'file' {
        if (direntOrStats.isDirectory()) {
            return 'directory'
        } else if (direntOrStats.isFile()) {
            return 'file'
        } else {
            vscode.window.showWarningMessage(`VsCodeFileSystemAdapter::readdir(path='${path}') path is neither 'directory' nor 'file', defaulting to 'file'.`);
            return 'file'
        }
    }

    public readFile(path: string): Promise<string> {
        return this.nodeJsFileSystem.readFile(this.toExtensionPath(path))
    }

    public readFileSync(path: string): string {
        return this.nodeJsFileSystem.readFileSync(this.toExtensionPath(path))
    }

    public writeFile(path: string, data: string, options?: { throwInsteadOfWarn?: boolean | undefined; } | undefined): Promise<void> {
        return this.nodeJsFileSystem.writeFile(this.toExtensionPath(path), data, options)
    }

    public makeFolder(path: string): Promise<void> {
        return this.nodeJsFileSystem.makeFolder(this.toExtensionPath(path))
    }

    public symlink(existingPath: string, newPath: string, type?: 'dir' | 'file' | 'junction' | undefined): Promise<void> {
        return this.nodeJsFileSystem.symlink(this.toExtensionPath(existingPath), this.toExtensionPath(newPath), type)
    }

    public rename(oldPath: string, newPath: string): Promise<void> {
        return this.nodeJsFileSystem.rename(this.toExtensionPath(oldPath), this.toExtensionPath(newPath))
    }

    public async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
        //return this.nodeJsFileSystem.showOpenDialog(options)
        // TODO: this is only a hack
        const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders
        if (!workspaceFolders) {
            throw new Error('VsCodeFileSystemAdapter::showOpenDialog workspaceFolders is undefined.')
        }
        return {filePaths: workspaceFolders.map(folder => folder.uri.fsPath)}
    }

    private toExtensionPath(path: string): string {
        if (path.startsWith('./')) {
            return vscode.Uri.joinPath(this.extensionUri, 'out', 'dist', path).fsPath
        }
        return path
    }
}
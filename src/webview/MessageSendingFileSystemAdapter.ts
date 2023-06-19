import {
    DirectoryStatsBasicImpl,
    Dirent,
    DirentBasicImpl,
    FileStatsBasicImpl,
    FileSystemAdapter,
    OpenDialogOptions,
    OpenDialogReturnValue,
    Stats,
    UnknownDirentKindStatsBasicImpl
} from '../../out/dist/core/fileSystemAdapter.js'
import { log } from '../../out/dist/core/logService.js'
import * as messageManager from './messageBroker.js'

export class MessageSendingFileSystemAdapter extends FileSystemAdapter {
    public async doesDirentExistAndIsFile(path: string): Promise<boolean> {
        return messageManager.postMessage(this.doesDirentExistAndIsFile.name, path)
    }

    public doesDirentExist(path: string): Promise<boolean> {
        return messageManager.postMessage(this.doesDirentExist.name, path)
    }

    public async getDirentStatsIfExists(path: string): Promise<Stats | null> {
        const stats: Stats|null = await messageManager.postMessage(this.getDirentStatsIfExists.name, path)
        if (!stats) {
            return null
        }
        return this.buildStatsFromMessage(stats, path)
    }

    public async getDirentStatsOrThrow(path: string): Promise<Stats> {
        const stats: Stats = await messageManager.postMessage(this.getDirentStatsOrThrow.name, path)
        return this.buildStatsFromMessage(stats, path)
    }

    private buildStatsFromMessage(messageStats: any, path: string): Stats {
        // setting prototype wouldn't be enough because Stats does not know 'kind' TODO: improve, add 'kind' to Stats interface
        if (messageStats.kind === 'directory') {
            return new DirectoryStatsBasicImpl()
        }
        if (messageStats.kind === 'file') {
            return new FileStatsBasicImpl((messageStats as Stats).size)
        }
        log.warning(`MessageSendingFileSystemAdapter::buildStatsFromMessage(path='${path}') unknown direntKind '${messageStats.kind}'.`)
        return new UnknownDirentKindStatsBasicImpl(messageStats.kind)
    }

    public async readdir(path: string): Promise<Dirent[]> {
        const dirents = await messageManager.postMessage(this.readdir.name, path)
        dirents.forEach((dirent: Dirent) => {
            Object.setPrototypeOf(dirent, DirentBasicImpl.prototype)
        });
        return dirents
    }
    
    public readFile(path: string): Promise<string> {
        return messageManager.postMessage(this.readFile.name, path)
    }

    public readFileSync(path: string): string {
        throw new Error('Method not implemented.');
    }

    public writeFile(path: string, data: string, options?: { throwInsteadOfWarn?: boolean | undefined; } | undefined): Promise<void> {
        return messageManager.postMessage(this.writeFile.name, path, data, options)
    }

    public makeFolder(path: string): Promise<void> {
        return messageManager.postMessage(this.makeFolder.name, path)
    }

    public symlink(existingPath: string, newPath: string, type?: 'dir' | 'file' | 'junction' | undefined): Promise<void> {
        return messageManager.postMessage(this.symlink.name, existingPath, newPath, type)
    }

    public rename(oldPath: string, newPath: string): Promise<void> {
        return messageManager.postMessage(this.rename.name, oldPath, newPath)
    }

    public showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
        return messageManager.postMessage(this.showOpenDialog.name, options)
    }

}
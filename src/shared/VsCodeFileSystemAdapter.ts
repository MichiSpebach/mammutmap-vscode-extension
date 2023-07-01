import { FileSystemAdapter } from '../../out/dist/core/fileSystemAdapter.js';

export abstract class VsCodeFileSystemAdapter extends FileSystemAdapter {
    public abstract getWorkspaceFolderPath(): Promise<string>
}
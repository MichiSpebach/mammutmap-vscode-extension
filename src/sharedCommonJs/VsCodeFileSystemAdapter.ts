import { FileSystemAdapter } from '../../out/distCommonJs/core/fileSystemAdapter.js';

export abstract class VsCodeFileSystemAdapter extends FileSystemAdapter {
    public abstract getWorkspaceFolderPath(): Promise<string>
}
import { FileSystemAdapter } from '../out/distCommonJs/core/fileSystemAdapter'
import { VsCodeEnvironmentAdapter } from './VsCodeEnvironmentAdapter'

export let environment: VsCodeEnvironmentAdapter
export let fileSystem: FileSystemAdapter

export function initEnvironment(implementation: VsCodeEnvironmentAdapter): void {
    environment = implementation
}

export function initFileSystem(implementation: FileSystemAdapter): void {
    fileSystem = implementation
}
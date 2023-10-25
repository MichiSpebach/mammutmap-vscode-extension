import { EnvironmentAdapter } from '../out/distCommonJs/core/environmentAdapter'
import { FileSystemAdapter } from '../out/distCommonJs/core/fileSystemAdapter'

export let environment: EnvironmentAdapter
export let fileSystem: FileSystemAdapter

export function initEnvironment(implementation: EnvironmentAdapter): void {
    environment = implementation
}

export function initFileSystem(implementation: FileSystemAdapter): void {
    fileSystem = implementation
}
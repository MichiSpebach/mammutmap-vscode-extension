import * as domAdapter from '../../out/dist/core/domAdapter.js'
import * as commandLine from '../../out/dist/core/commandLine.js'
import * as applicationMenu from '../../out/dist/core/applicationMenu/applicationMenu.js'
import * as pluginLoader from '../../out/dist/core/pluginLoader.js'
import { mainWidget } from '../../out/dist/core/mainWidget.js'
import * as fileSystemAdapter from '../../out/dist/core/fileSystemAdapter.js'
import * as settings from '../../out/dist/core/Settings.js'
import * as contextMenu from '../../out/dist/core/contextMenu.js'
import { DirectDomAdapter } from '../../out/dist/browserApp/DirectDomAdapter.js'
import { HtmlApplicationMenu } from '../../out/dist/core/applicationMenu/HtmlApplicationMenu.js'
import { HtmlContextMenuPopup } from '../../out/dist/browserApp/HtmlContextMenuPopup.js'
import { util } from '../../out/dist/core/util/util.js'
import { MessageSendingFileSystemAdapter } from './MessageSendingFileSystemAdapter.js'
import * as map from '../../out/dist/core/Map.js'
import * as messageBroker from './messageBroker.js'

init()

async function init(): Promise<void> {
    //processing.init(new BrowserProcessingAdapter()) TODO
    domAdapter.init(new DirectDomAdapter())
    const fileSystem = new MessageSendingFileSystemAdapter()
    fileSystemAdapter.init(fileSystem)
    await settings.init()
    mainWidget.render()
    commandLine.init()
    contextMenu.init(new HtmlContextMenuPopup())
    await applicationMenu.initAndRender(new HtmlApplicationMenu())
    await pluginLoader.loadPlugins()
    await map.searchAndLoadMapCloseTo(await fileSystem.getWorkspaceFolderPath())
    messageBroker.postMessage('greet', ['Mammutmap initialized'])
}

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  util.logErrorWithoutThrow(event.reason)
})
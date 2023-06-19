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
import { searchAndLoadMapCloseTo } from '../../out/dist/core/Map.js'
import { util } from '../../out/dist/core/util/util.js'
import { MessageSendingFileSystemAdapter } from './MessageSendingFileSystemAdapter.js'
import { log } from '../../out/dist/core/logService.js'

init()

async function init(): Promise<void> {
    //processing.init(new BrowserProcessingAdapter()) TODO
    domAdapter.init(new DirectDomAdapter())
    fileSystemAdapter.init(new MessageSendingFileSystemAdapter())
    await settings.init()
    mainWidget.render()
    commandLine.init()
    contextMenu.init(new HtmlContextMenuPopup())
    await applicationMenu.initAndRender(new HtmlApplicationMenu())
    await pluginLoader.loadPlugins()
}

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  util.logErrorWithoutThrow(event.reason)
})
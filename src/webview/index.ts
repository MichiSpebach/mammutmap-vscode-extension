import * as domAdapter from '../../out/dist/core/domAdapter.js'
import * as applicationMenu from '../../out/dist/core/applicationMenu/applicationMenu.js'
import * as pluginLoader from '../../out/dist/core/pluginLoader.js'
import { mainWidget } from '../../out/dist/core/mainWidget.js'
import * as fileSystemAdapter from '../../out/dist/core/fileSystemAdapter.js'
import * as settings from '../../out/dist/core/settings/settings.js'
import * as contextMenu from '../../out/dist/core/contextMenu.js'
import { DirectDomAdapter } from '../../out/dist/browserApp/DirectDomAdapter.js'
import { HtmlApplicationMenu } from '../../out/dist/core/applicationMenu/HtmlApplicationMenu.js'
import { HtmlContextMenuPopup } from '../../out/dist/browserApp/HtmlContextMenuPopup.js'
import { log } from '../../out/dist/core/logService.js'
import { MessageSendingFileSystemAdapter } from './MessageSendingFileSystemAdapter.js'
import * as map from '../../out/dist/core/Map.js'
import * as messageBroker from './messageBroker.js'
import * as environment from '../../out/dist/core/environmentAdapter.js'
import { MessageSendingEnvironmentAdapter } from './MessageSendingEnvironmentAdapter.js'

init()

async function init(): Promise<void> {
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      log.errorWithoutThrow(event.reason)
    })

    environment.init(new MessageSendingEnvironmentAdapter())
    domAdapter.init(new DirectDomAdapter())
    const fileSystem = new MessageSendingFileSystemAdapter()
    fileSystemAdapter.init(fileSystem)
    await settings.init()
    mainWidget.render()
    contextMenu.init(new HtmlContextMenuPopup())
    await applicationMenu.initAndRender(new HtmlApplicationMenu({hideFileMenu: true}))
    await pluginLoader.loadPlugins()
    await map.searchAndLoadMapCloseTo(await fileSystem.getWorkspaceFolderPath())
    messageBroker.postMessage({command: 'greet', parameters: ['Mammutmap initialized']})
}
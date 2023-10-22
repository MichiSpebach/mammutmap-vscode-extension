import { ChildProcess, EnvironmentAdapter } from '../../out/dist/core/environmentAdapter.js'
import { RequestMessage } from '../shared/RequestMessage.js';
import * as messageBroker from './messageBroker.js'

export class MessageSendingEnvironmentAdapter implements EnvironmentAdapter {

	public runShellCommand(command: string): ChildProcess {
		throw new Error('Method not implemented.');
	}

	public openFile(path: string): void {
		messageBroker.postMessage(new RequestMessage({target: 'environment', command: 'openFile', parameters: [path]}))
	}
	
}
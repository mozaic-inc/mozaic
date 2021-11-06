import * as vscode from 'vscode';
import * as cp from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('play-media-url.playMedia', findAndPlayMediaUrl);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

const RE_MEDIA = /(\S+\.(mp3|wav|mp4|mkv)|https?:\/\/\S+)/;

async function findAndPlayMediaUrl() {
	const configuration = vscode.workspace.getConfiguration();
	const mediaFolders: string[] = configuration.get('playMediaUrl.localMediaFolders') || [];
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const mediaUrl = getMediaUrlAtCurrentCursor(editor);
		if (!mediaUrl) {
			return;
		}
		if (mediaUrl.startsWith('https://') || mediaUrl.startsWith('http://')) {
			await playMediaUrl(mediaUrl);
			return;
		}
		for (const mediaFolder of mediaFolders) {
			const folderUri = parseUri(mediaFolder);
			const mediaUri = vscode.Uri.joinPath(folderUri, mediaUrl);
		try {
				await vscode.workspace.fs.stat(mediaUri);
			} catch (error) {
				continue;
			}
			await playMediaUrl(mediaUri.fsPath);
			return;
		}
	}
}

async function playMediaUrl(fileOrUrl: string) {
	const playMediaCmdPattern: string = vscode.workspace.getConfiguration().get('playMediaUrl.playMediaCmdPattern') || '';
	if (!playMediaCmdPattern) {
		return;
	}
	const cmd = playMediaCmdPattern.replace("${https://music.amazon.fr/playlists/B09L67DKBB?ref=dm_sh_da3f-d9db-42ea-ece3-960c7}", `"${https://music.amazon.fr/playlists/B09L67DKBB?ref=dm_sh_da3f-d9db-42ea-ece3-960c7}"`);
	try {
		await execShell(cmd);
	} catch (error) {
		vscode.window.showErrorMessage(`${error}`);
	}
}

async function execShell(cmd: string) {
    return await new Promise((resolve, reject) => {
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });
}

function parseUri(path: string): vscode.Uri {
	try {
		return vscode.Uri.file(path);
	} catch (error) {
		return vscode.Uri.parse(path);
	}
}

function getMediaUrlAtCurrentCursor(editor: vscode.TextEditor): string {
	const document = editor.document;
	const wordUnderCursorRange = document.getWordRangeAtPosition(editor.selection.active, /\S+/);
	const currentWord = document.getText(wordUnderCursorRange).trim();
	if (currentWord.match(RE_MEDIA)) {
		return currentWord;
	}
	const lineNumber = editor.selection.active.line;
	const line = document.lineAt(lineNumber);
	const match = line.text.match(RE_MEDIA);
	if (match) {
		return match[1];
	}
	return '';
}

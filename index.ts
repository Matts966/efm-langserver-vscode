import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  DidChangeTextDocumentParams,
  DidSaveTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
} from 'vscode-languageclient/node';

import * as vscode from "vscode";

let client: LanguageClient;

export function activate() {
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { command: "efm-langserver" },
    debug: { command: "efm-langserver" },
  };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", pattern: `*` },
    ],
  };
  // Create the language client and start the client.
  client = new LanguageClient(
    'efmLangserver',
    'EFM Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();

  vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.uri.scheme !== "file") {
      return
    }
    const param: DidChangeTextDocumentParams = {
      textDocument: {
        uri: e.document.uri.toString(),
        version: e.document.version,
      },
      contentChanges: e.contentChanges.map(c => ({
        ...c,
        range: {
          ...c.range,
        },
      })),
    }
    return client.sendNotification('textDocument/didChange', param)
  })
  vscode.workspace.onDidSaveTextDocument((e) => {
    if (e.uri.scheme !== "file") {
      return
    }
    const param: DidSaveTextDocumentParams = {
      textDocument: {
        uri: e.uri.toString(),
      },
      text: e.getText(),
    }
    return client.sendNotification('textDocument/didSave', param)
  })
  vscode.workspace.onDidCloseTextDocument((e) => {
    if (e.uri.scheme !== "file") {
      return
    }
    const param: DidCloseTextDocumentParams = {
      textDocument: {
        uri: e.uri.toString(),
      }
    }
    return client.sendNotification('textDocument/didClose', param)
  })
  vscode.workspace.onDidOpenTextDocument((e) => {
    if (e.uri.scheme !== "file") {
      return
    }
    const param: DidOpenTextDocumentParams = {
      textDocument: {
        uri: e.uri.toString(),
        languageId: e.languageId,
        version: e.version,
        text: e.getText(),
      }
    }
    return client.sendNotification('textDocument/didOpen', param)
  })
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

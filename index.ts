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
  const outputChannel = vscode.window.createOutputChannel("efm-langserver-vscode")
  outputChannel.appendLine("starting efm-langserver-vscode...")

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
    outputChannel: outputChannel,
    traceOutputChannel: outputChannel,
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

  outputChannel.appendLine("started efm-langserver-vscode.")

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
    outputChannel.appendLine("publishing textDocument/didChange with param: " + JSON.stringify(param))
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
    outputChannel.appendLine("publishing textDocument/didSave with param: " + JSON.stringify(param))
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
    outputChannel.appendLine("publishing textDocument/didClose with param: " + JSON.stringify(param))
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
    outputChannel.appendLine("publishing textDocument/didOpen with param: " + JSON.stringify(param))
    return client.sendNotification('textDocument/didOpen', param)
  })
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

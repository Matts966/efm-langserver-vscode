import * as vscode from "vscode";
import {
  DidChangeTextDocumentParams, DidCloseTextDocumentParams,
  DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentFormattingParams, LanguageClient, LanguageClientOptions,
  ServerOptions
} from 'vscode-languageclient/node';
import { HoverRequest, CompletionRequest } from 'vscode-languageserver-protocol';


let client: LanguageClient;

export async function activate() {
  const outputChannel = vscode.window.createOutputChannel("efm-langserver-vscode")
  outputChannel.appendLine("starting efm-langserver-vscode...")

  // To prevent document not found error.
  const openDocuments = new Set<string>()

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
    openFile(e.document, outputChannel, openDocuments);
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
    const formatParams: DocumentFormattingParams = {
      textDocument: {
        uri: e.uri.toString(),
      },
      options: null
    }
    outputChannel.appendLine("publishing textDocument/formatting with param: " + JSON.stringify(formatParams))
    client.sendNotification('textDocument/formatting', formatParams)

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
    openDocuments.add(e.uri.toString());
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
  vscode.languages.registerHoverProvider([
    `*`,
  ], {
    async provideHover(document, position, token) {
      if (document.uri.scheme !== "file") {
        outputChannel.appendLine("uri: " + document.uri.toString() + " is not a file")
        return
      }
      outputChannel.appendLine("provideHover for " + document.uri.toString())
      openFile(document, outputChannel, openDocuments);
      return client.sendRequest(HoverRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
        if (token.isCancellationRequested) {
          return null;
        }
        return client.protocol2CodeConverter.asHover(result);
      });
    }
  });

  await client.onReady(); // To get initializeResult
  const triggers = client.initializeResult?.capabilities?.completionProvider?.triggerCharacters;
  outputChannel.appendLine(`trigger characters: ${triggers}`);
  vscode.languages.registerCompletionItemProvider([
    `*`,
  ], {
    async provideCompletionItems(document, position, token) {
      if (document.uri.scheme !== "file") {
        outputChannel.appendLine("uri: " + document.uri.toString() + " is not a file")
        return
      }
      outputChannel.appendLine("provideCompletionItems for " + document.uri.toString())
      openFile(document, outputChannel, openDocuments);
      const result = await client.sendRequest(CompletionRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token);
      if (token.isCancellationRequested) {
        return null;
      }
      return client.protocol2CodeConverter.asCompletionResult(result);
    }
  },
  ...triggers);
}

function openFile(document: vscode.TextDocument, outputChannel: vscode.OutputChannel, openDocuments: Set<string>) {
  if (!openDocuments.has(document.uri.toString())) {
    openDocuments.add(document.uri.toString());
  }
  const param: DidOpenTextDocumentParams = {
    textDocument: {
      uri: document.uri.toString(),
      languageId: document.languageId,
      version: document.version,
      text: document.getText(),
    }
  }
  outputChannel.appendLine("File not opened, publishing textDocument/didOpen with param: " + JSON.stringify(param))
  client.sendNotification('textDocument/didOpen', param)
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

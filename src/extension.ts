import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface WebviewMessage {
    command: string;
    text?: string;
    filePaths?: string[];
    fileContents?: { [key: string]: string };
    responseId?: string;
    filePath?: string;
    newContent?: string;
    suggestedChanges?: { filePath: string; newContent: string };
}

let chatViewPanel: vscode.WebviewPanel | undefined;
const contextFiles: Map<string, string> = new Map();

export function activate(context: vscode.ExtensionContext) {
    console.log('Qwen Coder Bridge активирован!');

    const openChatCommand = vscode.commands.registerCommand('qwenCoderBridge.openChat', () => {
        createOrShowChatPanel(context);
    });

    const sendMessageCommand = vscode.commands.registerCommand('qwenCoderBridge.sendMessage', async () => {
        if (!chatViewPanel) {
            createOrShowChatPanel(context);
        }
        
        const input = await vscode.window.showInputBox({
            prompt: 'Введите ваш запрос к Qwen Coder',
            placeHolder: 'Например: объясни этот код или предложи улучшения...'
        });

        if (input && chatViewPanel) {
            const files = getActiveEditorFiles();
            sendMessageToWebview({
                command: 'sendMessage',
                text: input,
                fileContents: files
            });
        }
    });

    const addFileCommand = vscode.commands.registerCommand('qwenCoderBridge.addFileToContext', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Добавить файл'
        });

        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            const content = fs.readFileSync(filePath, 'utf-8');
            contextFiles.set(filePath, content);
            
            vscode.window.showInformationMessage('Файл ' + path.basename(filePath) + ' добавлен в контекст');
            
            if (chatViewPanel) {
                sendMessageToWebview({
                    command: 'updateContext',
                    fileContents: Object.fromEntries(contextFiles)
                });
            }
        }
    });

    const applyChangesCommand = vscode.commands.registerCommand('qwenCoderBridge.applyChanges', async (changes: any) => {
        if (changes && changes.filePath && changes.newContent) {
            try {
                const uri = vscode.Uri.file(changes.filePath);
                const edit = new vscode.WorkspaceEdit();
                const document = await vscode.workspace.openTextDocument(uri);
                const lastLine = document.lineAt(document.lineCount - 1);
                const range = new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length);
                
                edit.replace(uri, range, changes.newContent);
                await vscode.workspace.applyEdit(edit);
                await document.save();
                
                vscode.window.showInformationMessage('Изменения успешно применены!');
            } catch (error) {
                vscode.window.showErrorMessage('Ошибка при применении изменений: ' + error);
            }
        }
    });

    context.subscriptions.push(openChatCommand);
    context.subscriptions.push(sendMessageCommand);
    context.subscriptions.push(addFileCommand);
    context.subscriptions.push(applyChangesCommand);

    createOrShowChatPanel(context);
}

function createOrShowChatPanel(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (chatViewPanel) {
        chatViewPanel.reveal(column);
        return;
    }

    chatViewPanel = vscode.window.createWebviewPanel(
        'qwenCoderBridgeChat',
        'Qwen Coder Bridge - Чат',
        column || vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
        }
    );

    chatViewPanel.webview.html = getWebviewContent(context);

    chatViewPanel.webview.onDidReceiveMessage(
        async (message: WebviewMessage) => {
            switch (message.command) {
                case 'sendToAPI':
                    await handleAPICall(message, context);
                    break;
                case 'applyChanges':
                    if (message.filePath && message.newContent) {
                        vscode.commands.executeCommand('qwenCoderBridge.applyChanges', {
                            filePath: message.filePath,
                            newContent: message.newContent
                        });
                    }
                    break;
            }
        },
        undefined,
        context.subscriptions
    );

    chatViewPanel.onDidDispose(
        () => {
            chatViewPanel = undefined;
        },
        null,
        context.subscriptions
    );
}

async function handleAPICall(message: WebviewMessage, context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('qwenCoderBridge');
    const proxyUrl = config.get('proxyUrl', 'http://localhost:3000');
    const useProxy = config.get('useProxy', true);
    const apiKey = config.get('apiKey', '');
    
    try {
        if (useProxy) {
            // Отправка запроса через прокси-сервер
            const response = await fetch(`${proxyUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message.text || '',
                    files: Object.entries(message.fileContents || {}).map(([filePath, content]) => ({
                        path: filePath,
                        content: content
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch((): any => ({}));
                if (response.status === 401) {
                    throw new Error('Требуется авторизация в прокси-сервере. Откройте http://localhost:3000/api/auth/login-url для входа.');
                }
                const errorMsg = (errorData as any)?.error || (errorData as any)?.message || response.statusText;
                throw new Error(`HTTP ${response.status}: ${errorMsg}`);
            }

            const data = await response.json() as any;
            const assistantMessage = data.response?.content || data.response?.message || JSON.stringify(data.response);

            // Пытаемся извлечь предложенные изменения из ответа
            let suggestedChanges = undefined;
            const codeBlockMatch = assistantMessage.match(/```(?:typescript|javascript|python|ts|js)?\s*([\s\S]*?)```/);
            if (codeBlockMatch && message.filePaths && message.filePaths.length > 0) {
                suggestedChanges = {
                    filePath: message.filePaths[0],
                    newContent: codeBlockMatch[1].trim()
                };
            }

            if (chatViewPanel) {
                sendMessageToWebview({
                    command: 'apiResponse',
                    responseId: message.responseId,
                    text: assistantMessage,
                    suggestedChanges: suggestedChanges
                });
            }
        } else {
            // Резервный вариант - прямой запрос к DashScope API
            await handleDashScopeAPI(message, context, apiKey);
        }

    } catch (error) {
        console.error('API Error:', error);
        if (chatViewPanel) {
            sendMessageToWebview({
                command: 'apiError',
                responseId: message.responseId,
                text: `Ошибка API: ${error instanceof Error ? error.message : String(error)}\n\n${useProxy ? 'Убедитесь, что:\n1. Прокси-сервер запущен (npm start в папке server)\n2. Вы авторизовались в прокси-сервере' : 'Убедитесь, что:\n1. API ключ действителен\n2. У вас есть доступ к DashScope\n3. Интернет-соединение активно'}`
            });
        }
    }
}

// Отдельная функция для работы с DashScope API (резервный вариант)
async function handleDashScopeAPI(message: WebviewMessage, context: vscode.ExtensionContext, apiKey: string) {
    if (!apiKey) {
        if (chatViewPanel) {
            sendMessageToWebview({
                command: 'apiError',
                responseId: message.responseId,
                text: 'API ключ не настроен! Пожалуйста, укажите ваш API ключ DashScope в настройках расширения (File > Preferences > Settings > Qwen Coder Bridge) И включите использование прокси-сервера.'
            });
        }
        return;
    }

    // Формируем запрос к DashScope API
    const systemPrompt = "Ты опытный программист-помощник. Анализируй код, предлагай улучшения, объясняй ошибки. Отвечай на русском языке. Если предлагаешь изменения кода, указывай полный путь к файлу и новое содержимое.";
    let userContent = message.text || '';

    // Добавляем контекст файлов
    if (message.fileContents && Object.keys(message.fileContents).length > 0) {
        userContent += '\n\n--- КОНТЕКСТ ФАЙЛОВ ---\n';
        for (const [filePath, content] of Object.entries(message.fileContents)) {
            const fileName = require('path').basename(filePath);
            userContent += `\nФайл: ${fileName}\nПуть: ${filePath}\nСодержимое:\n\`\`\`\n${content}\n\`\`\`\n`;
        }
    }

    const requestBody = {
        model: 'qwen-max',
        input: {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ]
        },
        parameters: {
            result_format: 'message'
        }
    };

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch((): any => ({}));
        throw new Error(`HTTP ${response.status}: ${(errorData as any)?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    // Парсим ответ от DashScope
    const assistantMessage = data.output?.choices?.[0]?.message?.content || 'Нет ответа от модели';

    // Пытаемся извлечь предложенные изменения из ответа (простая эвристика)
    let suggestedChanges = undefined;
    const codeBlockMatch = assistantMessage.match(/```(?:typescript|javascript|python|ts|js)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && message.filePaths && message.filePaths.length > 0) {
        suggestedChanges = {
            filePath: message.filePaths[0],
            newContent: codeBlockMatch[1].trim()
        };
    }

    if (chatViewPanel) {
        sendMessageToWebview({
            command: 'apiResponse',
            responseId: message.responseId,
            text: assistantMessage,
            suggestedChanges: suggestedChanges
        });
    }
}

function getActiveEditorFiles(): { [key: string]: string } {
    const files: { [key: string]: string } = {};
    const activeEditor = vscode.window.activeTextEditor;
    
    if (activeEditor) {
        const document = activeEditor.document;
        files[document.fileName] = document.getText();
    }

    contextFiles.forEach((content, filePath) => {
        files[filePath] = content;
    });

    return files;
}

function sendMessageToWebview(message: WebviewMessage) {
    if (chatViewPanel) {
        chatViewPanel.webview.postMessage(message);
    }
}

function getWebviewContent(context: vscode.ExtensionContext): string {
    return '<!DOCTYPE html>' +
'<html lang="ru">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'    <title>Qwen Coder Bridge</title>' +
'    <style>' +
'        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }' +
'        .chat-container { display: flex; flex-direction: column; height: calc(100vh - 40px); }' +
'        .messages { flex: 1; overflow-y: auto; border: 1px solid var(--vscode-widget-border); border-radius: 4px; padding: 10px; margin-bottom: 10px; }' +
'        .message { margin-bottom: 15px; padding: 10px; border-radius: 4px; }' +
'        .message.user { background-color: var(--vscode-input-background); border-left: 3px solid var(--vscode-button-background); }' +
'        .message.assistant { background-color: var(--vscode-editor-inactiveSelectionBackground); border-left: 3px solid var(--vscode-terminal-ansiGreen); }' +
'        .message.error { background-color: var(--vscode-inputValidation-errorBackground); border-left: 3px solid var(--vscode-inputValidation-errorBorder); }' +
'        .input-area { display: flex; gap: 10px; }' +
'        textarea { flex: 1; resize: none; height: 60px; padding: 8px; border: 1px solid var(--vscode-input-border); background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); font-family: var(--vscode-font-family); }' +
'        button { padding: 8px 16px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; }' +
'        button:hover { background-color: var(--vscode-button-hoverBackground); }' +
'        .file-info { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }' +
'        pre { background-color: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; overflow-x: auto; }' +
'        code { font-family: var(--vscode-editor-font-family); }' +
'        .apply-btn { margin-top: 10px; padding: 5px 10px; font-size: 12px; }' +
'        .loading { color: var(--vscode-progressBar-background); font-style: italic; }' +
'    </style>' +
'</head>' +
'<body>' +
'    <div class="chat-container">' +
'        <h2>Qwen Coder Bridge</h2>' +
'        <p class="file-info" id="fileInfo">Файлов в контексте: 0</p>' +
'        <div class="messages" id="messages"></div>' +
'        <div class="input-area">' +
'            <textarea id="messageInput" placeholder="Введите ваш запрос..."></textarea>' +
'            <button id="sendBtn">Отправить</button>' +
'        </div>' +
'    </div>' +
'    <script>' +
'        const vscode = acquireVsCodeApi();' +
'        let currentFiles = {};' +
'        window.addEventListener("message", event => {' +
'            const message = event.data;' +
'            switch (message.command) {' +
'                case "sendMessage":' +
'                    addUserMessage(message.text || "");' +
'                    currentFiles = message.fileContents || {};' +
'                    updateFileInfo();' +
'                    sendToAPI(message.text, message.fileContents);' +
'                    break;' +
'                case "updateContext":' +
'                    currentFiles = message.fileContents || {};' +
'                    updateFileInfo();' +
'                    break;' +
'                case "apiResponse":' +
'                    removeLoading();' +
'                    if (message.text) { addAssistantMessage(message.text, message.suggestedChanges); }' +
'                    break;' +
'                case "apiError":' +
'                    removeLoading();' +
'                    addErrorMessage(message.text || "Неизвестная ошибка");' +
'                    break;' +
'            }' +
'        });' +
'        function updateFileInfo() { document.getElementById("fileInfo").textContent = "Файлов в контексте: " + Object.keys(currentFiles).length; }' +
'        function addUserMessage(text) { const d = document.createElement("div"); d.className = "message user"; d.textContent = text; document.getElementById("messages").appendChild(d); }' +
'        function addAssistantMessage(text, changes) { const d = document.createElement("div"); d.className = "message assistant"; d.innerHTML = text.replace(/\\n/g, "<br>"); document.getElementById("messages").appendChild(d); if(changes) { const btn = document.createElement("button"); btn.className = "apply-btn"; btn.textContent = "Применить изменения"; btn.onclick = () => vscode.postMessage({command: "applyChanges", filePath: changes.filePath, newContent: changes.newContent}); d.appendChild(btn); } }' +
'        function addErrorMessage(text) { const d = document.createElement("div"); d.className = "message error"; d.textContent = "Ошибка: " + text; document.getElementById("messages").appendChild(d); }' +
'        function addLoading() { const d = document.createElement("div"); d.className = "message loading"; d.id = "loading"; d.textContent = "Ожидание ответа..."; document.getElementById("messages").appendChild(d); }' +
'        function removeLoading() { const l = document.getElementById("loading"); if(l) l.remove(); }' +
'        function sendToAPI(text, files) { addLoading(); vscode.postMessage({command: "sendToAPI", text: text, filePaths: Object.keys(files||{}), fileContents: files, responseId: Date.now().toString()}); }' +
'        document.getElementById("sendBtn").onclick = () => { const i=document.getElementById("messageInput"); const t=i.value.trim(); if(t){vscode.postMessage({command:"sendToAPI",text:t,filePaths:Object.keys(currentFiles),fileContents:currentFiles,responseId:Date.now().toString()});i.value="";} };' +
'    </script>' +
'</body>' +
'</html>';
}

export function deactivate() {
    if (chatViewPanel) {
        chatViewPanel.dispose();
    }
}

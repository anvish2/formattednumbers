const vscode = require('vscode');

function activate(context) {
    let activeEditor = vscode.window.activeTextEditor;
    let timeout;
    let throttleDelay;
    let separatorDecorationType;
    let minLength;
    let maxLength;

    function createDecorationType(style) {
        if (separatorDecorationType) {
            separatorDecorationType.dispose();
        }

        if (style === 'standard') {
            separatorDecorationType = vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: ',',
                    textDecoration: 'none; font-size: 0.9em; opacity: 0.5;',
                },
            });
        } else if (style === 'subtle') {
            separatorDecorationType = vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: " ̦", // space + Combining Comma Below (&#806;)
                    height: '0px',
                    width: '0px',
                    margin: '0 3.5px 0 -3.5px',
                }
            });
        }
    }

    function updateDecorations() {
        if (!activeEditor) return;

        const decorations = [];
        const regex = new RegExp(`\\b(?<!\\.)\\d{${minLength},${maxLength}}\\b`, 'g');

        for (const range of activeEditor.visibleRanges) {
            const text = activeEditor.document.getText(range);
            const offset = activeEditor.document.offsetAt(range.start);
            let match;

            while ((match = regex.exec(text)) !== null) {
                const number = match[0];

                for (let i = number.length - 3; i > 0; i -= 3) {
                    const pos = activeEditor.document.positionAt(offset + match.index + i);
                    decorations.push({
                        range: new vscode.Range(pos, pos)
                    });
                }
            }
        }
        activeEditor.setDecorations(separatorDecorationType, decorations);
    }

    function triggerUpdateDecorations(throttle = false) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        const delay = throttle ? throttleDelay : 0;
        timeout = setTimeout(updateDecorations, delay);
    }

    function updateConfig() {
        const scope = vscode.workspace.getConfiguration('formattedNumbers');
        throttleDelay = scope.get('throttle', 300);
        minLength = scope.get('minLength', 5);
        maxLength = scope.get('maxLength', 500);
        const style = scope.get('style', 'subtle');
        createDecorationType(style);
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (activeEditor && event.textEditor === activeEditor) {
            triggerUpdateDecorations(true);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('formattedNumbers')) {
            updateConfig();
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    updateConfig();

    if (activeEditor) {
        triggerUpdateDecorations();
    }
}

module.exports = { activate };

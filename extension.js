const vscode = require('vscode');

function activate(context) {
    let separatorDecorationType;

    let activeEditor = vscode.window.activeTextEditor;
    let timeout = undefined;
    let throttleDelay = 300;

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
        } else { // 'subtle' or default
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
        const regex = /\b(?<!\.)\d{5,500}\b/g;

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
        throttleDelay = vscode.workspace.getConfiguration('numberFormatter').get('throttle', 300);
        const style = vscode.workspace.getConfiguration('numberFormatter').get('style', 'subtle');
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
        if (event.affectsConfiguration('numberFormatter.throttle') || event.affectsConfiguration('numberFormatter.style')) {
            updateConfig();
        }
    }, null, context.subscriptions);

    updateConfig();
    if (activeEditor) {
        triggerUpdateDecorations();
    }
}

module.exports = { activate };

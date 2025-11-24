const vscode = require('vscode');

function activate(context) {
    let activeEditor = vscode.window.activeTextEditor;
    let timeout;
    let throttleDelay;
    let separatorDecorationType;
    let minLength;
    let maxLength;
    let formatAfterDecimal;

    function createDecorationType(style) {
        if (separatorDecorationType) {
            separatorDecorationType.dispose();
        }

        if (style === 'inline') {
            separatorDecorationType = vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: ',',
                    textDecoration: 'none; font-size: 0.9em; opacity: 0.5;',
                },
            });
        } else if (style === 'underline') {
            separatorDecorationType = vscode.window.createTextEditorDecorationType({
                before: {
                    //contentText: " ̦", // space + Combining Comma Below (&#806;)
                    //contentText: " ̣", // space + Combining Dot Below (&#803;)
                    //contentText: " ̝", // space + Combining Up Tack Below (&#797;)
                    //contentText: " ̠", // space + Combining Minus Sign Below (&#800;)
                    contentText: " ̩", // space + Combining Vertical Line Below (&#809;)
                    height: '0px',
                    width: '0px',
                    margin: '0 0.3em 0 -0.3em',
                    textDecoration: 'none; font-weight: bold;',
                }
            });
        }
    }

    function updateDecorations() {
        if (!activeEditor) return;

        const decorations = [];
        const regex = new RegExp(`\\b\\d{1,${maxLength}}(?:\\.\\d{1,${maxLength}})?\\b`, 'g');

        for (const range of activeEditor.visibleRanges) {
            const text = activeEditor.document.getText(range);
            const offset = activeEditor.document.offsetAt(range.start);
            let match;

            while ((match = regex.exec(text))) {
                const number = match[0];
                const dotIndex = number.indexOf('.');
                const integerPart = dotIndex !== -1 ? number.substring(0, dotIndex) : number;
                const fractionalPart = dotIndex !== -1 ? number.substring(dotIndex + 1) : '';

                if (integerPart.length >= minLength) {
                    for (let i = integerPart.length - 3; i > 0; i -= 3) {
                        const pos = activeEditor.document.positionAt(offset + match.index + i);
                        decorations.push({
                            range: new vscode.Range(pos, pos)
                        });
                    }
                }

                if (formatAfterDecimal && fractionalPart.length >= minLength) {
                    for (let i = 3; i < fractionalPart.length; i += 3) {
                        const pos = activeEditor.document.positionAt(offset + match.index + dotIndex + 1 + i);
                        decorations.push({
                            range: new vscode.Range(pos, pos)
                        });
                    }
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
        formatAfterDecimal = scope.get('formatAfterDecimal', false);
        const style = scope.get('style', 'underline');
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

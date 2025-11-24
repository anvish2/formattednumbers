const vscode = require('vscode');

function activate(context) {
    const separatorDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: " ̦", // space + Combining Comma Below (&#806;)
            height: '0px',
            width: '0px',
            margin: '0 3.5px 0 -3.5px',
        }
    });

    let activeEditor = vscode.window.activeTextEditor;
    
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

    if (activeEditor) {
        updateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) updateDecorations();
    }, null, context.subscriptions);

    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (activeEditor && event.textEditor === activeEditor) {
            updateDecorations();
        }
    }, null, context.subscriptions);
}

module.exports = { activate };

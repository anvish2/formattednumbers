const vscode = require('vscode');

function activate(context) {
    // Create decoration type for thousand separators
    const separatorDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            color: '#808080',
            contentText: ',',
            textDecoration: 'none; font-size: 0.9em;'
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    let activeEditor = vscode.window.activeTextEditor;
    
    function updateDecorations() {
        if (!activeEditor) return;
        
        const text = activeEditor.document.getText();
        const decorations = [];
        
        // Match numbers with 4+ digits
        const regex = /\b\d{4,}\b/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const number = match[0];
            const startPos = activeEditor.document.positionAt(match.index);
            
            // Calculate positions for comma insertion (every 3 digits from right)
            for (let i = number.length - 3; i > 0; i -= 3) {
                const pos = activeEditor.document.positionAt(match.index + i);
                decorations.push({
                    range: new vscode.Range(pos, pos)
                });
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

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);
}

module.exports = { activate };

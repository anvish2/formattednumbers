import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let activeEditor = vscode.window.activeTextEditor;
    let timeout: NodeJS.Timeout | undefined;
    let throttleDelay: number | undefined;
    let separatorDecorationType: vscode.TextEditorDecorationType | undefined;
    let spacingDecorationTypes: vscode.TextEditorDecorationType[] | undefined;
    let minLength = 0;
    let maxLength = 0;
    let formatAfterDecimal: boolean | undefined;
    let useSpacing: boolean | undefined;
    let useCharacter: boolean | undefined;
    let opacity: number | undefined;
    let style: 'inline' | 'underline' | undefined;
    const groupSize = 3;
    const spacingEm = 0.05;

    function createDecorationType() {
        if (separatorDecorationType) {
            separatorDecorationType.dispose();
            separatorDecorationType = undefined;
        }

        if (spacingDecorationTypes) {
            for (let type of spacingDecorationTypes) {
                type.dispose();
            }
            spacingDecorationTypes = undefined;
        }

        if (useSpacing) {
            spacingDecorationTypes = [];
            for (let i = 0; i < groupSize; i++) {
                spacingDecorationTypes[i] = createSpacingDecorationType(i + 1);
            }
        }

        if (useCharacter) {
            if (style === 'inline') {
                separatorDecorationType = vscode.window.createTextEditorDecorationType({
                    before: {
                        contentText: ',',
                        textDecoration: `none; opacity: ${opacity};`,
                    },
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
                });
            } else if (style === 'underline') {
                if (useSpacing) {
                    separatorDecorationType = vscode.window.createTextEditorDecorationType({
                        before: {
                            contentText: ',',
                            height: '0',
                            width: '0',
                            margin: '0 0.45em 0 -0.45em',
                            textDecoration: `none; font-size: 0.9em; opacity: ${opacity}; transform: translateY(.2em);`,
                        },
                        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
                    });
                } else {
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
                            textDecoration: `none; font-weight: bold; opacity: ${opacity};`,
                        },
                        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
                    });
                }
            }
        }
    }

    function createSpacingDecorationType(position: number) {
        let offset1 = spacingEm * 2; // first character offset
        let offset2 = spacingEm; // second and third characters offset
        if (position == 1) {
            return vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '',
                    width: `${offset1}em`,
                    margin: `0 0 0 ${offset1}em`,
                },
                after: {
                    contentText: '',
                    margin: `0 -${offset1}em 0 0`,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
        } else {
            return vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '',
                    width: `${offset2}em`,
                    margin: `0 0 0 -${offset2}em`,
                },
                after: {
                    contentText: '',
                    margin: `0 -${offset2}em 0 0`,
                },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
        }
    }

    function updateDecorations() {
        if (!activeEditor) return;

        const decorations: vscode.DecorationOptions[] = [];
        const spacingDecorations: vscode.DecorationOptions[][] = [];
        for (let i = 0; i < groupSize; i++) { spacingDecorations[i] = []; }
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
                    if (useSpacing) {
                        for (let i = integerPart.length - 1; i > 0; i -= 1) {
                            const reverseIndex = integerPart.length - 1 - i;
                            const decorationType = reverseIndex % groupSize;
                            const pos = activeEditor.document.positionAt(offset + match.index + i);
                            spacingDecorations[2 - decorationType].push({
                                range: new vscode.Range(pos, pos)
                            });
                        }
                    }
                    if (useCharacter) {
                        for (let i = integerPart.length - groupSize; i > 0; i -= groupSize) {
                            const pos = activeEditor.document.positionAt(offset + match.index + i);
                            decorations.push({
                                range: new vscode.Range(pos, pos)
                            });
                        }
                    }
                }

                if (formatAfterDecimal && fractionalPart.length >= minLength) {
                    if (useSpacing) {
                        for (let i = 0; i < fractionalPart.length; i += 1) {
                            const decorationType = i % groupSize;
                            const pos = activeEditor.document.positionAt(offset + match.index + dotIndex + 1 + i);
                            spacingDecorations[decorationType].push({
                                range: new vscode.Range(pos, pos)
                            });
                        }
                    }
                    if (useCharacter) {
                        for (let i = groupSize; i < fractionalPart.length; i += groupSize) {
                            const pos = activeEditor.document.positionAt(offset + match.index + dotIndex + 1 + i);
                            decorations.push({
                                range: new vscode.Range(pos, pos)
                            });
                        }
                    }
                }
            }
        }

        if (useSpacing && spacingDecorationTypes) {
            for (let i = 0; i < groupSize; i++) {
                activeEditor.setDecorations(spacingDecorationTypes[i], spacingDecorations[i]);
            }
        }
        if (useCharacter && separatorDecorationType) {
            activeEditor.setDecorations(separatorDecorationType, decorations);
        }
    }

    function triggerUpdateDecorations(throttle = false) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        if (throttle) {
            timeout = setTimeout(updateDecorations, throttleDelay);
        } else {
            updateDecorations();
        }
    }

    function updateConfig() {
        const scope = vscode.workspace.getConfiguration('formattedNumbers');
        throttleDelay = scope.get('throttle');
        minLength = scope.get('minLength') ?? 0;
        maxLength = scope.get('maxLength') ?? 0;
        formatAfterDecimal = scope.get('formatAfterDecimal');
        useSpacing = scope.get('useSpacing');
        useCharacter = scope.get('useCharacter');
        opacity = scope.get('separatorOpacity');
        style = scope.get('style');
        createDecorationType();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations(true);
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

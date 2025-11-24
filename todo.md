# package extension

npm install -g @vscode/vsce
vsce package
code --install-extension formattednumbers-0.0.1.vsix

# todo

detect when visible text part shows number only partially (has offset and starts with a number) and don't decorate it


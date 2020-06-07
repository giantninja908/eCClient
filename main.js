const electron = require('electron');
const {app, BrowserWindow, Menu, shell, ipcMain} = electron;
var os = require('os');
const path = require('path');
const fs = require('fs');
const shortcut = require('electron-localshortcut');

app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-metrics');
app.commandLine.appendSwitch('disable-metrics-repo');
app.commandLine.appendSwitch('smooth-scrolling');
app.commandLine.appendSwitch('enable-javascript-harmony');
app.commandLine.appendSwitch('enable-future-v8-vm-features');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('no-referrers');
app.commandLine.appendSwitch('disable-2d-canvas-clip-aa');
app.commandLine.appendSwitch('disable-bundled-ppapi-flash');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage=100');
if(os.cpus()[0].model.includes('AMD')) {
   app.commandLine.appendSwitch('enable-zero-copy');
}

var win = null;

function createGameWindow(){
	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    win = new BrowserWindow({
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntergration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.webContents.on('new-window', (event, url, frameName, disposition, options) => {
        if(!url) return;
        if(url.startsWith('https://twitch.tv/') || url.startsWith('https://www.twitch.tv') || url.startsWith('https://www.youtube')) {
			event.preventDefault();
			shell.openExternal(url);
            return;
        } else {
            event.preventDefault();
            const newWin = new BrowserWindow({
                width: width * 0.75,
                height: height * 0.9,
                webContents: options.webContents,
                show: false
            });
            newWin.once('ready-to-show', () => newWin.show());
            if(!options.webContents) {
                newWin.loadURL(url);
            }
            event.newGuest = newWin;
		}
    });
    shortcut.register(win, 'Esc', () => {
        win.webContents.send('Escape');
    });
    shortcut.register(win, 'F3', () => {
        win.webContents.send('home');
    });
    shortcut.register(win, 'F4', () => {
        win.webContents.send('findMatch');
    });
    shortcut.register(win, 'F5', () => {
        win.webContents.reloadIgnoringCache();
    });
    shortcut.register(win, 'F11', () => {
        win.setSimpleFullScreen(!win.isSimpleFullScreen());
    });
    shortcut.register(win, 'F7', ()=> {
    	win.webContents.openDevTools();
    });
    var template = [{
        label: "Application",
        submenu: [
            { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]}
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    //win.webContents.openDevTools(); //uncomment this line to open dev console
    win.setSimpleFullScreen(true);
    
    
    win.loadURL('https://krunker.io')
}

function init(){
	createGameWindow();
}
app.on('ready',init);

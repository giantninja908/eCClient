//const gui = require("nw.gui");
const electron = require('electron');
const {app, BrowserWindow, Menu, shell, ipcMain} = electron;
const fs = require('fs');
var os = require('os');
const shortcut = require('electron-localshortcut');
const path = require('path');
const url = require('url');
const mRPC = require('discord-rpc');
const clientId = '670062286890729492';
const clientSecret = '********************************'; //you really think I would hand it out?
const rpc = new mRPC.Client({ transport: 'websocket' });

var win = null, splash = null;

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

Menu.setApplicationMenu(null);

function createGameWindow() {
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    win = new BrowserWindow({
        backgroundColor: '#000000',
        show: false,
        webPreferences: {
            nodeIntergration: false,
            preload: path.join(__dirname, 'client.js')
        }
    });
    win.once('ready-to-show', () => {
        win.show();
        splash.close();
        splash = null;
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
    //win.webContents.openDevTools();
    win.setSimpleFullScreen(true);
    
    /*
    let filter = {urls:[]}
    try {fs.mkdir(swapFolder, { recursive: true }, e => {});}catch(e){};
		win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
			
			
			
			let tempP = path.join(swapFolder,details.url.replace(/(https|http)(:\/).+(krunker\.io)/gi,''))
			console.log(tempP)
			console.log(details.url)
			
			if(fs.existsSync(tempP)){
				if(!(fs.statSync(tempP).isDirectory())){
					console.log("EXISTS")
					console.log("\n")
					console.log(details.url)
					if (!(/\.(html|js)/g.test(tempP))) {
					callback({ cancel: false, redirectURL: url.format({
								pathname: tempP,
								protocol: 'file:',
								slashes: true
							}) || details.url});
					}else{
						callback({ cancel: false, redirectURL: details.url});
					}
				}else{
					callback({ cancel: false, redirectURL: details.url});
				}
			}else{
			
				callback({ cancel: false, redirectURL: details.url});
			}
		});
    */
    let sf = path.join(app.getPath('documents'), '/GiantReasourceSwapper');
    
    try {fs.mkdir(sf, { recursive: true }, e => {});}catch(e){};
	let s = { fltr: { urls: [] }, fls: {} };
	const afs = (dir, fileList = []) => {
		fs.readdirSync(dir).forEach(file => {
			const fp = path.join(dir, file);
			if (fs.statSync(fp).isDirectory()) {
				if (!(/\\(docs)$/.test(fp)))
					afs(fp);
			} else {
				if (!(/\.(html|js)/g.test(file))) {
					let k = '*://krunker.io' + fp.replace(sf, '').replace(/\\/g, '/') + '*';
					s.fltr.urls.push(k);
					console.log(fp)
					s.fls[k.replace(/\*/g, '')] = url.format({
						pathname: fp,
						protocol: 'file:',
						slashes: true
					});
				}
			}
		});
	};
	afs(sf);
	if (s.fltr.urls.length) {
		win.webContents.session.webRequest.onBeforeRequest(s.fltr, (details, callback) => {
			callback({ cancel: false, redirectURL: s.fls[details.url.replace(/https|http|(\?.*)|(#.*)/gi, '')] || details.url });
		});
	}
	
	/*const filter = {
		urls:['*://*.giantclient.epizy.com/*']
	};
	const session = electron.remote.session
	session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
                details.requestHeaders['Origin'] = null;
                details.headers['Origin'] = null;
                callback({ requestHeaders: details.requestHeaders })
	});*/
	
    win.loadURL('https://krunker.io/');
    rpc.login({ clientId }).catch(console.error);
    win.webContents.on('did-finish-load', () => {
        initRPC();
    });
    
    
    
    
    twitch();
    ipcMain.on('updated', () => {
        app.relaunch();
        app.quit();
    });
    //literally taken from Krunker Client, if it aint broke don't fix it
    
	
    
}

function initRPC() {
    setInterval(setActivity, 15e3);
    setTimeout(() => { setActivity(); }, 3000);

    ipcMain.on('RPCSet', (event, arg) => {
        if(!rpc) return;

        rpc.setActivity(arg);
    });

	async function setActivity() {
        try {
            win.webContents.send('RPCGet');
        } catch(err) {
            console.error(err);
        }        
	}
}

function twitch() {
    ipcMain.on('twitch', (event, arg1, arg2) => {
        fs.writeFile(arg1, arg2, 'utf-8', function(err) {
            if(err) return console.error(err);
        });
    });
}

function createSplash() {
    splash = new BrowserWindow({
        width: 700,
        height: 300,
        backgroundColor: '#000000',
        center: true,
        alwaysOnTop: true,
        frame: false,
        webPreferences: {
            nodeIntergration: true
        }
    });
    splash.loadFile('splash.html');
    createGameWindow();
}

app.on('ready', createSplash);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('quit', () => {
    win = null;
    splash = null;
    rpc.destroy();
    process.exit(0);
});

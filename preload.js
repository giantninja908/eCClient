const electron = require('electron');
const { ipcRenderer: ipcRenderer, remote, clipboard, shell } = electron;
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const tmi = require('tmi.js');
const client = new tmi.Client({
	options: { debug: true },
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: 'giantninja900',
		password: 'oauth:p1n8z4j7umynqtvxrip5gtyowesm4f'
	},
	channels: [ 'giantninja900' ]
});
client.connect();
client.on('message', (channel, tags, message, self) => {
	if(localStorage.getItem('cctwitchEnable')=='checked'){
	var gameInfo = getGameActivity();
	if(self) return;
	if(message.toLowerCase() === '!link') {
		client.say(channel, 'The link is: https://krunker.io/?game='+gameInfo.id);
	}
	}
});
console.log("ASDF")
ipcRenderer.on('Escape', () => {
    if(!(endUI.style.display === 'none')) {
        menuHolder.style.display = 'block';
        menuHider.style.display = 'block';
        endUI.style.display = 'none';
        uiBase.classList.add('onMenu');
        instructionHolder.style.display = 'block';
        overlay.style.display = 'none';
    } else {
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
        document.exitPointerLock();
    }
});
ipcRenderer.on('home', () => {
    window.location.href = 'https://krunker.io/';
});

window.prompt =  function importSettings() {
        var tempHTML = '<div class="setHed">Import Settings</div>';
        tempHTML += '<div class="settName" id="importSettings_div" style="display:block">Settings String<input type="url" placeholder="Paste Settings String Here" name="url" class="inputGrey2" id="settingString"></div>';
        tempHTML += '<a class="+" id="importBtn">Import</a>';
        menuWindow.innerHTML = tempHTML;
        importBtn.addEventListener('click', () => { parseSettings(settingString.value); });
    

    function parseSettings(string) {
        if(string && string != '') {
            try {
                var json = JSON.parse(string);
                for(var setting in json) {
                    setSetting(setting, json[setting]);
                    showWindow(1);
                }
            } catch(err) {
                console.error(err);
                alert('Error importing settings.');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
	(function (){
		'use strict';
		function insertCSS(){
			fs.readFile(path.join(app.getPath('documents'), '/GiantClient/style.css'), "utf-8", function(error, data) {
				if(!error){
					console.log(data)
					var formatedData = data.replace(/\s{2,10}/g, ' ').trim()
					console.log(formatedData)
					window.document.getElementsByTagName("head")[0].innerHTML+="<style>"+formatedData+"</style>"
				}else {
					console.log(error)
				}
			})
		}
		function init(){
			insertCSS();
        }
        init()
    })();
});


const electron = require('electron');
const { ipcRenderer: ipcRenderer, remote, clipboard, shell } = electron;
const semver = require('semver');
const https = require('follow-redirects').https;

const fs = require('fs');
const path = require('path');
const versionNum = '1.0.6';
var _rAF = null;

var partyUrl = "";
var inParty = false;
var partyHost = false;

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
ipcRenderer.on('RPCGet', (event) => {
    var gameInfo = getGameActivity();
    var matchString = gameInfo.mode + " on " + gameInfo.map;
    var playerString;
    fetch('https://matchmaker.krunker.io/game-info?game=' + gameInfo.id)
        .then(res => res.json())
        .then(json => {
            playerString = "Players: " + json[2] + " of " + json[3];
        })
        .catch(console.warn);
            
    var user = gameInfo.user;
    var timeLeft = Math.floor(Date.now() / 1000) + gameInfo.time;

    rpcObject = {
        details: matchString,
        state: playerString,
        largeImageKey: 'main',
        largeImageText: user,
        endTimestamp: timeLeft,
        instance: true
    };
    ipcRenderer.send('RPCSet', rpcObject);
});

document.addEventListener('DOMContentLoaded', (event) => {
    (function() {
		/*var jqs = document.createElement("script");
		jqs.onload = function() {
		  alert("Script loaded and ready");
		};
		fs.readFile('/etc/hosts', 'utf8', function (err,data) {
		  if (err) {
			return console.log(err);
		  }
		  console.log(data);
		});
		document.getElementsByTagName('head')[0].appendChild(jqs);*/
        'use strict';
		const $ = require('jquery');
        const shiraPath = path.join(remote.app.getAppPath() + '\\..\\shira.json');
        var shiraData = null;

        function shiraSetup() {
           fs.stat(shiraPath, (err, stats) => {
            if(err) {
                //file does not exist
            } else if(stats.isFile()) {
                shiraData = require(shiraPath);
                }
            });
        }

        function setShira(index) {
            index = parseInt(index);
            if(shiraData.sens[index] != '0') {
                setSetting('sensitivityX', shiraData.sens[index]);
                setSetting('sensitivityY', shiraData.sens[index]);
            }
            if(shiraData.fov[index] != '0') setSetting('fov', shiraData.fov[index]);
            sensCalc();
        }

        ipcRenderer.on('findMatch', () => {
            var tmpClients = 0;
            var gameID = null;
            var region = getRegion();
            var mode = getCCSettings('mode');
            var games = [];
            console.log(mode);
            fetch('https://matchmaker.krunker.io/game-list?hostname=krunker.io')
            .then(res => res.json())
            .then((json) => {
                if(!json.error) {
                    json = json.games;
                    for(var i = 0; i < json.length; i++) {
                            if(json[i][1] == region && !json[i][4].cs && json[i][4].i.substring(0, 3) == mode && json[i][2] < 8) {
                                if(json[i][2] == 7) {
                                    gameID = json[i][0];
                                    break;
                                } else if(json[i][2] > 0 && json[i][2] > tmpClients) {
                                    tmpClients = json[i][2];
                                    gameID = json[i][0];
                                }
                            }
                    }
                    if(gameID != null) {
                        playTick();
                        var url = 'https://krunker.io/?game=' + gameID;
                        window.location.href = url;
                    } else {
                        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
                        document.exitPointerLock();
                        instructions.innerHTML = 'No games found, try search again';
                        setTimeout(() => {
                            instructions.innerHTML = 'CLICK TO PLAY';
                        }, 2000);
                    }
                }
            }).catch(err => { throw err });
        });

        function getRegion() {
            var url = window.location.href;
            var str1 = url.split("=");
            var str2 = str1[1].split(":");
            switch(str2[0]) {
                case "SYD":
                return "au-syd";
                case "TOK":
                return "jb-hnd";
                case "MIA":
                return "us-fl";
                case "SV":
                return "us-ca-sv";
                case "FRA":
                return "de-fra";
                case "SIN":
                return "sgp";
                case "NY":
                return "us-nj";
            }
        }

        function exitGame() {
            remote.app.quit();
        }

        function joinGame() {
            var link = clipboard.readText();
            if(link.startsWith('https://krunker.io/?game=')) {
                window.location.href = link;
            } else {
                showWindow(24);
            }
        }

        function initMenu() {
            var buttonHtml = '<div class="button small buttonR" id="menuBtnHost" onmouseenter="playTick()" onclick="openHostWindow()">Host Game</div>';
            buttonHtml += '<div class="button small buttonG" id="menuBtnRanked" onmouseenter="playTick()" onclick="showWindow(27)">Ranked</div>'
            buttonHtml += '<div id="inviteButton" class="button small" onmouseenter="playTick()" onclick="copyInviteLink()">Invite</div>';
            buttonHtml += '<div class="button small buttonP" id="menuBtnBrowser" onmouseenter="playTick()" onclick="showWindow(2)">Server Browser</div>';
            buttonHtml += '<div class="button small" id="menuBtnJoin" onmouseenter="playTick()" onclick="openJoinWindow()">Join</div>';
            buttonHtml += '<div class="button small buttonR" id="menuExit" onmouseenter="playTick()">X</div>';
            subLogoButtons.innerHTML = buttonHtml;
            menuBtnJoin.addEventListener('click', () => { joinGame(); });
            menuExit.addEventListener('click', () => { exitGame(); });
        }

        function setCCSettings(key, value) {
            localStorage.setItem('cc' + key, value);
        }

        function getCCSettings(key) {
            return localStorage.getItem('cc' + key);
        }

        function getClassIndex() {
            return localStorage.getItem('classindex');
        }

        function classHtml() {
            var classIndex = getClassIndex();
            var tempHTML = '';
            if(classIndex != 9) {
                tempHTML += '<div class="settName" id="showWep_div" style="display:block">Show Weapon <label class="switch"><input type="checkbox" id="showInput"' + (isShown(classIndex) ? "checked" : "") + '><span class="slider"></span></label></div>';
                tempHTML += '<div class="settName" id="showWepADS_div" style="display:block">Hide Weapon ADS <label class="switch"><input type="checkbox" id="hideADSInput"' + (isHideADS(classIndex) ? "checked" : "") + '><span class="slider"></span></label></div>';
            }
            tempHTML += '<div class="settName" id="showCross_div" style="display:block">Always Show Crosshair <label class="switch"><input type="checkbox" id="crossInput" ' + (isCross(classIndex) ? "checked" : "") + '><span class="slider"></span></label></div>';
            return tempHTML;
        }

        function crossAll(cross) {
            if(cross === true) cross = 'on';
            if(cross === false) cross = 'off';
            var crossArray = ['akCross', 'awpCross', 'smgCross', 'lmgCross', 'shotCross', 'revCross', 'semiCross', 'rpgCross', 'agentCross', 'bowCross', 'famasCross'];
            /*for(var i=0;i<crossArray.length;i++){
            	setCCSettings(crossArray[i], cross);
            }*/
            $.each(crossArray, function(index, value) {
                setCCSettings(value, cross);
            });
        }

        function showAll(show) {
            if(show === true) show = 'on';
            if(show === false) show = 'off';
            var showArray = ['akShow', 'awpShow', 'smgShow', 'lmgShow', 'shotShow', 'revShow', 'semiShow', 'rpgShow', 'agentShow', 'bowShow', 'famasShow'];
            /*for(var i=0;i<showArray.length;i++){
            	setCCSettings(showArray[i], cross);
            }*/
            $.each(showArray, function(index, value) {
                setCCSettings(value, show);
            });
        }

        function hideADSAll(show) {
            if(show === true) show = 'on';
            if(show === false) show = 'off';
            var showArray = ['akHideADS', 'awpHideADS', 'smgHideADS', 'lmgHideADS', 'shotHideADS', 'revHideADS', 'semiHideADS', 'rpgHideADS', 'agentHideADS', 'bowHideADS', 'famasHideADS'];
            /*for(var i=0;i<showArray.length;i++){
            	setCCSettings(showArray[i], cross);
            }*/
            $.each(showArray, function(index, value) {
                setCCSettings(value, show);
            });
        }

        function initWindows() {
            var _classGen = windows[2].gen;
            windows[2].gen = function() {
                var tempHTML = _classGen();
                tempHTML += classHtml();
                setTimeout(() => {
                    if(getClassIndex() != 9) {
                        showInput.addEventListener('click', () => { toggleShow(getClassIndex()); });
                        hideADSInput.addEventListener('click', () => { toggleHideADS(getClassIndex()); });
                    }
                    crossInput.addEventListener('click', () => { toggleCross(getClassIndex()); });
                }, 10);
                return tempHTML;
            }

            var _settingsGen = windows[0].getCSettings;
            windows[0].getCSettings = function() {
                var tempHTML = _settingsGen();
                tempHTML += settingsExtras();
                setTimeout(() => {
                    var divList = menuWindow.getElementsByClassName('settName');
                    menuWindow.getElementsByTagName('div')[0].getElementsByTagName('div')[0].getElementsByTagName('a')[1].onclick = '';
                    menuWindow.getElementsByTagName('div')[0].getElementsByTagName('div')[0].getElementsByTagName('a')[1].addEventListener('click', () => { importSettings(); });
                    var y = false, x = false;
                    /*for(var i=0;i<divList.length;i++){
                    	var tempString = divList[i].innerHTML;
                        if(tempString.startsWith('Aim X Sensitivity') && !x) {
                            divList[i].innerHTML = adsHtml();
                            autoVal.addEventListener('change', () => { updateSens(autoVal.value); });
                            if(getCCSettings('ads') === "1") {
                                slid_relAds.addEventListener('input', () => { setRelative(slid_relAds.value); });
                                box_relAds.addEventListener('input', () => { setRelative(box_relAds.value); });
                            } else if(getCCSettings('ads') === "2") {
                                sensMenu.addEventListener('click', () => { showSensMenu(); });
                            }
                            x = true;
                        }
                        if(tempString.startsWith('Aspect Ratio')) {
                            divList[i].getElementsByTagName('select')[0].addEventListener('change', () => { sensCalc(); });
                            slid_aspectRatio.addEventListener('input', () => { sensCalc(); });
                        }
                        if(tempString.startsWith('Aim Y Sensitivity') && !y) {
                            divList[i].innerHTML = '';
                            y = true;
                        }
                        if(tempString.startsWith('Show Primary')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            divList[i].addEventListener('click', () => { showAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Hide Weapon on ADS')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            divList[i].addEventListener('click', () => { hideADSAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Always Show')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            divList[i].addEventListener('click', () => { crossAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Frame Cap')) {
                            divList[i].innerHTML = '';
                        }
                    }*/
                    $.each(divList, function(index, value) {
                        var tempString = value.innerHTML;
                        if(tempString.startsWith('Aim X Sensitivity') && !x) {
                            value.innerHTML = adsHtml();
                            autoVal.addEventListener('change', () => { updateSens(autoVal.value); });
                            if(getCCSettings('ads') === "1") {
                                slid_relAds.addEventListener('input', () => { setRelative(slid_relAds.value); });
                                box_relAds.addEventListener('input', () => { setRelative(box_relAds.value); });
                            } else if(getCCSettings('ads') === "2") {
                                sensMenu.addEventListener('click', () => { showSensMenu(); });
                            }
                            x = true;
                        }
                        if(tempString.startsWith('Aspect Ratio')) {
                            value.getElementsByTagName('select')[0].addEventListener('change', () => { sensCalc(); });
                            slid_aspectRatio.addEventListener('input', () => { sensCalc(); });
                        }
                        if(tempString.startsWith('Aim Y Sensitivity') && !y) {
                            value.innerHTML = '';
                            y = true;
                        }
                        if(tempString.startsWith('Show Primary')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            value.addEventListener('click', () => { showAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Hide Weapon on ADS')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            value.addEventListener('click', () => { hideADSAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Always Show')) {
                            var tempDiv = value.getElementsByTagName('input')[0];
                            value.addEventListener('click', () => { crossAll(tempDiv.checked); });
                        }
                        if(tempString.startsWith('Frame Cap')) {
                            value.innerHTML = '';
                        }
                    });
                    slid_input_sensitivityX.addEventListener('input', () => { sensCalc(); });
                    slid_sensitivityX.addEventListener('input', () => { sensCalc(); });
                    slid_input_sensitivityY.addEventListener('input', () => { sensCalc(); });
                    slid_sensitivityY.addEventListener('input', () => { sensCalc(); });
                    slid_input_fov.addEventListener('input', () => { sensCalc(); });
                    slid_fov.addEventListener('input', () => { sensCalc(); });
                }, 10);
                return tempHTML;
            }
        }

        function newEnterGame() {
            if(document.pointerLockElement !== null) {
                setTimeout(() => {
                    var index = getGameActivity().class.index;
                    setAdsSens(index);
                    setShow(index);
                    setHideADS(index);
                    setCross(index);
                    if(shiraData.active) {
                        setShira(index);
                    }
                }, 100);
            } else {
                //pointer lock exit
            }
        }


        function sensCalc() {
            if(getCCSettings('ads') === null) setCCSettings('ads', '0');
            if(getCCSettings('relAds') === null) setCCSettings('relAds', '0');
            if(getCCSettings('ads') === "2") return;
            if(localStorage.getItem('kro_setngss_fov') === null) localStorage.setItem('kro_setngss_fov', '70');
            if(localStorage.getItem('kro_setngss_sensitivityX') === null) localStorage.setItem('kro_setngss_sensitivityX', '1');
            if(localStorage.getItem('kro_setngss_sensitivityY') === null) localStorage.setItem('kro_setngss_sensitivityY', '1');
            var fov = localStorage.getItem('kro_setngss_fov');
            var hipSensX = localStorage.getItem('kro_setngss_sensitivityX');
            var hipSensY = localStorage.getItem('kro_setngss_sensitivityY');
            var distance, width, height;
            if(localStorage.getItem('kro_setngss_aspectRatio') === null || localStorage.getItem('kro_setngss_aspectRatio') == '') {
                width = $(window).width,
                height = $(window).height
            } else {
                var aspectString = localStorage.getItem('kro_setngss_aspectRatio').split('x');
                width = aspectString[0];
                height = aspectString[1];
            }
            console.log(width);
            console.log(height);
            if(getCCSettings('ads') === "0") {
                distance = 56.25;
            } else {
                distance = getCCSettings('relAds');
            }
            var adsScale = {
                ak : 1.6,
                awp : 2.7,
                smg : 1.65,
                lmg : 1.3,
                shot : 1.25,
                rev : 1.4,
                semi : 2.1,
                rpg : 1.5,
                bow : 1.4,
                famas : 1.5
            };
            var adsFov = {
                ak : fov / adsScale.ak,
                awp : fov / adsScale.awp,
                smg : fov / adsScale.smg,
                lmg : fov / adsScale.lmg,
                shot : fov / adsScale.shot,
                rev : fov / adsScale.rev,
                semi : fov / adsScale.semi,
                rpg : fov / adsScale.rpg,
                bow : fov / adsScale.bow,
                famas : fov / adsScale.famas
            };

            var vFovRad = fov * (Math.PI / 180);
            var hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * width / height);

            $.each(adsFov, function(index, value) {
                var adsVRad = value * (Math.PI / 180);
                var adsHRad = 2 * Math.atan(Math.tan(adsVRad / 2) * width / height);
                var hip2adsX, hip2adsY;
                if(distance === '0') {
                    hip2adsX = hipSensX * (Math.tan(adsHRad / 2) / Math.tan(hFovRad / 2));
                    hip2adsY = hipSensY * (Math.tan(adsHRad / 2) / Math.tan(hFovRad / 2));
                } else {
                    hip2adsX = hipSensX * (Math.atan((distance / 100) * Math.tan(adsHRad / 2)) / Math.atan((distance / 100) * Math.tan(hFovRad / 2)));
                    hip2adsY = hipSensY * (Math.atan((distance / 100) * Math.tan(adsHRad / 2)) / Math.atan((distance / 100) * Math.tan(hFovRad / 2)));
                }

                var adsSensX = adsScale[index] * hip2adsX;
                var adsSensY = adsScale[index] * hip2adsY;
                console.log(index + ': ' + adsSensX);
                console.log(index + ': ' + adsSensY);
                setCCSettings(index + 'X', adsSensX);
                setCCSettings(index + 'Y', adsSensY);
            });
        }

        function updateSens(option) {
            setCCSettings('ads', option);
            if(option === "1") {
                setTimeout(() => {
                    setRelative(getCCSettings('relAds'));
                }, 50);
            }
            updateWindow(1);
            sensCalc();
        }

        function setRelative(value) {
            value = parseFloat(value);
            if(value > 100) value = 100;
            if(value < 0) value = 0;
            setCCSettings('relAds', value);
            document.getElementById("slid_relAds").value = value;
            document.getElementById("box_relAds").value = value;
            sensCalc();
        }

        function bigboi() {
            if(getCCSettings('bigboi') === 'checked') {
                killsIcon.style.width = "160px";
                killsIcon.style.height = "160px";
                deathsIcon.style.width = "160px";
                deathsIcon.style.height = "160px";
                streakIcon.style.width = "160px";
                streakIcon.style.height = "160px";
            } else {
                killsIcon.style.width = "38px";
                killsIcon.style.height = "38px";
                deathsIcon.style.width = "38px";
                deathsIcon.style.height = "38px";
                streakIcon.style.width = "38px";
                streakIcon.style.height = "38px";
            }
        }

        function toggleBigBoi() {
            if(getCCSettings('bigboi') === null) setCCSettings('bigboi', 'unchecked');
            if(getCCSettings('bigboi') === 'unchecked') {
                setCCSettings('bigboi', 'checked');
            } else {
                setCCSettings('bigboi', 'unchecked');
            }
            bigboi();
        }

        function twitch() {
            if(getCCSettings('twitchPath') === null) setCCSettings('twitchPath', '');
            setInterval(() => {
                if(getCCSettings('twitch') !== 'checked' || getCCSettings('twitchPath') === '') return;
                ipcRenderer.send('twitch', getCCSettings('twitchPath'), window.location.href);
            }, 1000);
        }
    
        function setTwitchPath(path) {
            setCCSettings('twitchPath', path);
        }
    
        function toggleTwitch() {
            if(getCCSettings('twitch') === null) setCCSettings('twitch', 'unchecked');
            if(getCCSettings('twitch') === 'unchecked') {
                setCCSettings('twitch', 'checked');
            } else {
                setCCSettings('twitch', 'unchecked');
            }
        }

        function updateMode(value) {
            setCCSettings('mode', value);
        }

        function updateFpsLimit(value) {
            value = parseInt(value);
            if(value > 1000) value = 1000;
            if(value < 10 && value != 0) value = 10;
            setCCSettings('fpsLimit', value);
            document.getElementById("slid_fps").value = value;
            document.getElementById("box_fps").value = value;
            fpsLimit();
        }

        function settingsExtras() {
            var tempHTML = '<div class="setHed">Client Settings</div>';
            tempHTML += '<div class="settName" id="fps_div" style="display:block">FPS Limit<input type="number" class="sliderVal" id="slid_fps" min="0" max="1000" value="' + getCCSettings('fpsLimit') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_fps" min="0" max="1000" step="1" value="' + getCCSettings('fpsLimit') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="bigboi_div" style="display:block">Oversized Icons<label class="switch"><input type="checkbox" id="bigboiToggle" ' + getCCSettings('bigboi') + '><span class="slider"></span></label></div>';
            tempHTML += '<div class="settName" id="dark_div" style="display:block">Dark Theme<label class="switch"><input type="checkbox" id="darkThemeToggle" ' + getCCSettings('dark') + '><span class="slider"></span></label></div>';
            
            tempHTML += '<div class="settName">Game Mode <select id="modeVal" class="inputGrey2"></div>';
            tempHTML += '<option value="ffa" ' + (getCCSettings('mode') === "ffa" ? "selected" : "") + '>FFA</option>';
            tempHTML += '<option value="tdm" ' + (getCCSettings('mode') === "tdm" ? "selected" : "") + '>TDM</option>';
            tempHTML += '<option value="point" ' + (getCCSettings('mode') === "point" ? "selected" : "") + '>Point</option>';
            tempHTML += '<option value="ctf" ' + (getCCSettings('mode') === "ctf" ? "selected" : "") + '>CTF</option>';
            tempHTML += '</select></div>';
            tempHTML += '<div class="setHed">Twitch</div>';
            tempHTML += '<div class="settName" id="twitchBool_div" style="display:block">Twitch Linker<label class="switch"><input type="checkbox" id="twitchToggle" ' + getCCSettings('twitch') + '><span class="slider"></span></label></div>';
            tempHTML += '<div class="settName" id="twitchPath_div" style="display:block">Twitch File Path<input type="url" placeholder="Twitch File Path" name="url" class="inputGrey2" id="twitchPath" value="' + getCCSettings('twitchPath') + '"></div>'; 
            tempHTML += '<div class="setHed">Super Shady settings</div>';
            tempHTML += '<div class="settName" id="fps_div" style="display:block">FPS at a price<label class="switch"><input type="checkbox" id="fpsToggle" '+getCCSettings('boostFps') +'><span class="slider"></span></label></div>';
            tempHTML += '<div class="setHed">Party Settings</div>';
            tempHTML += '<div class="settName" id="partyBtn" style="display:block">Create Party <label class="inputGrey2"><a id="partyCreator" href="#">CLICK ME</a></label></div>';
            setTimeout(() => {
                slid_fps.addEventListener('input', () => { updateFpsLimit(slid_fps.value); });
                box_fps.addEventListener('input', () => { updateFpsLimit(box_fps.value); });
                modeVal.addEventListener('change', () => { updateMode(modeVal.value); });
                bigboiToggle.addEventListener('click', () => { toggleBigBoi(); });
                twitchToggle.addEventListener('click', () => { toggleTwitch(); });
                darkThemeToggle.addEventListener('click', () => { toggleDark(); });
			    twitchPath.addEventListener('input', () => { setTwitchPath(twitchPath.value); });
			    fpsToggle.addEventListener('click', () => {toggleFPS();});
			    partyCreator.addEventListener('click', () => {createParty();});
            }, 10);
            return tempHTML;
        }

        function showSensMenu() {
            var tempHTML = '<div class="settName"><a id="settingsBack" class="menuLink" style="font-size: 18px">Back</a></div>';
            tempHTML += '<div class="setHed">Custom Sensitivity</div>';
            tempHTML += '<div class="settName" id="ak_div" style="display:block">Triggerman <input type="number" class="sliderVal" id="slid_ak" min="0" max="15" value="' + getCCSettings('akX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_ak" min="0" max="15" step="0.1" value="' + getCCSettings('akX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="awp_div" style="display:block">Hunter <input type="number" class="sliderVal" id="slid_awp" min="0" max="15" value="' + getCCSettings('awpX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_awp" min="0" max="15" step="0.1" value="' + getCCSettings('awpX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="smg_div" style="display:block">Run N Gun <input type="number" class="sliderVal" id="slid_smg" min="0" max="15" value="' + getCCSettings('smgX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_smg" min="0" max="15" step="0.1" value="' + getCCSettings('smgX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="lmg_div" style="display:block">Spray N Pray <input type="number" class="sliderVal" id="slid_lmg" min="0" max="15" value="' + getCCSettings('lmgX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_lmg" min="0" max="15" step="0.1" value="' + getCCSettings('lmgX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="shot_div" style="display:block">Vince <input type="number" class="sliderVal" id="slid_shot" min="0" max="15" value="' + getCCSettings('shotX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_shot" min="0" max="15" step="0.1" value="' + getCCSettings('shotX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="rev_div" style="display:block">Detective <input type="number" class="sliderVal" id="slid_rev" min="0" max="15" value="' + getCCSettings('revX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_rev" min="0" max="15" step="0.1" value="' + getCCSettings('revX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="semi_div" style="display:block">Marksman <input type="number" class="sliderVal" id="slid_semi" min="0" max="15" value="' + getCCSettings('semiX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_semi" min="0" max="15" step="0.1" value="' + getCCSettings('semiX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="rpg_div" style="display:block">Rocketeer <input type="number" class="sliderVal" id="slid_rpg" min="0" max="15" value="' + getCCSettings('rpgX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_rpg" min="0" max="15" step="0.1" value="' + getCCSettings('rpgX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="bow_div" style="display:block">Bowman <input type="number" class="sliderVal" id="slid_bow" min="0" max="15" value="' + getCCSettings('bowX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_bow" min="0" max="15" step="0.1" value="' + getCCSettings('bowX') + '" class="sliderM"></div></div>';
            tempHTML += '<div class="settName" id="famas_div" style="display:block">Commando <input type="number" class="sliderVal" id="slid_famas" min="0" max="15" value="' + getCCSettings('famasX') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_famas" min="0" max="15" step="0.1" value="' + getCCSettings('famasX') + '" class="sliderM"></div></div>';
            menuWindow.innerHTML = tempHTML;
            var indexArray = ['ak', 'awp', 'smg', 'lmg', 'shot', 'rev', 'semi', 'rpg', ' ', ' ', ' ', 'bow', 'famas'];
            for(var i=0;i<indexArray.length;i++){
            	if(value !== ' ') {
                    var slidEl = document.getElementById('slid_' + value);
                    var boxEl = document.getElementById('box_' + value);
                    slidEl.addEventListener('input', () => { customSens(index, slidEl.value) });
                    boxEl.addEventListener('input', () => { customSens(index, boxEl.value) });
                }
            }
            $.each(indexArray, function(index, value) {
                if(value !== ' ') {
                    var slidEl = document.getElementById('slid_' + value);
                    var boxEl = document.getElementById('box_' + value);
                    slidEl.addEventListener('input', () => { customSens(index, slidEl.value) });
                    boxEl.addEventListener('input', () => { customSens(index, boxEl.value) });
                }

            });
            settingsBack.addEventListener('click', () => { updateWindow(1); });
        }

        function adsHtml() {
            if(getCCSettings('ads') === null) setCCSettings('ads', '0');
            if(getCCSettings('relAds') === null) setCCSettings('relAds', '0');
            var tempHTML = 'ADS Sensitivity <select id="autoVal" class="inputGrey2">';
            tempHTML += '<option value="0" ' + (getCCSettings('ads') === "0" ? "selected" : "") + '>Default</option>';
            tempHTML += '<option value="1" ' + (getCCSettings('ads') === "1" ? "selected" : "") + '>Relative</option>';
            tempHTML += '<option value="2" ' + (getCCSettings('ads') === "2" ? "selected" : "") + '>Custom</option>';
            tempHTML += '</select></div>';
            if(getCCSettings('ads') === "1") {
                tempHTML += '<div class="settName" id="ak_div" style="display:block">Relative ADS <input type="number" class="sliderVal" id="slid_relAds" min="0" max="100" value="' + getCCSettings('relAds') + '" style="border-width:0px"><div class="slidecontainer"><input type="range" id="box_relAds" min="0" max="100" step="1" value="' + getCCSettings('relAds') + '" class="sliderM"></div></div>';
            } else if(getCCSettings('ads') === "2") {
                tempHTML += '<div class="settName" style="padding-bottom: 7px"><a id="sensMenu" class="menuLink" style="font-size: 22px">Set Custom Sensitivity</a></div>';
            }
            return tempHTML;
        }

        function setAdsSens(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    setSetting('aimSensitivityX', getCCSettings('akX'));
                    setSetting('aimSensitivityY', getCCSettings('akY'));
                    break;
                case 1:
                    setSetting('aimSensitivityX', getCCSettings('awpX'));
                    setSetting('aimSensitivityY', getCCSettings('awpY'));
                    break;
                case 2:
                    setSetting('aimSensitivityX', getCCSettings('smgX'));
                    setSetting('aimSensitivityY', getCCSettings('smgY'));
                    break;
                case 3:
                    setSetting('aimSensitivityX', getCCSettings('lmgX'));
                    setSetting('aimSensitivityY', getCCSettings('lmgY'));
                    break;
                case 4:
                    setSetting('aimSensitivityX', getCCSettings('shotX'));
                    setSetting('aimSensitivityY', getCCSettings('shotY'));
                    break;
                case 5:
                    setSetting('aimSensitivityX', getCCSettings('revX'));
                    setSetting('aimSensitivityY', getCCSettings('revY'));
                    break;
                case 6:
                    setSetting('aimSensitivityX', getCCSettings('semiX'));
                    setSetting('aimSensitivityY', getCCSettings('semiY'));
                    break;
                case 7:
                    setSetting('aimSensitivityX', getCCSettings('rpgX'));
                    setSetting('aimSensitivityY', getCCSettings('rpgY'));
                    break;
                case 11:
                    setSetting('aimSensitivityX', getCCSettings('bowX'));
                    setSetting('aimSensitivityY', getCCSettings('bowY'));
                    break;
                case 12:
                    setSetting('aimSensitivityX', getCCSettings('famasX'));
                    setSetting('aimSensitivityY', getCCSettings('famasY'));
                    break;
            }
        }

        function setCross(index) {
            var client = this;
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 1:
                    if(getCCSettings('awpCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 2:
                    if(getCCSettings('smgCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 4:
                    if(getCCSettings('shotCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 5:
                    if(getCCSettings('revCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 6:
                    if(getCCSettings('semiCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 7:
                    if(getCCSettings('rpgCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 8:
                    if(getCCSettings('agentCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 11:
                    if(getCCSettings('bowCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
                case 12:
                    if(getCCSettings('famasCross') === "on") {
                        setSetting("crosshairAlways", true);
                    } else {
                        setSetting("crosshairAlways", false);
                    }
                    break;
            }
        }

        function setHideADS(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 1:
                    if(getCCSettings('awpHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 2:
                    if(getCCSettings('smgHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 4:
                    if(getCCSettings('shotHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 5:
                    if(getCCSettings('revHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 6:
                    if(getCCSettings('semiHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 7:
                    if(getCCSettings('rpgHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 8:
                    if(getCCSettings('agentHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 11:
                    if(getCCSettings('bowHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
                case 12:
                    if(getCCSettings('famasHideADS') === "on") {
                        setSetting("hideADS", true);
                    } else {
                        setSetting("hideADS", false);
                    }
                    break;
            }
        }

        function setShow(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 1:
                    if(getCCSettings('awpShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 2:
                    if(getCCSettings('smgShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 4:
                    if(getCCSettings('shotShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 5:
                    if(getCCSettings('revShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 6:
                    if(getCCSettings('semiShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 7:
                    if(getCCSettings('rpgShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 8:
                    if(getCCSettings('agentShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 11:
                    if(getCCSettings('bowShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
                case 12:
                    if(getCCSettings('famasShow') === "on") {
                        setSetting("showWeapon", true);
                    } else {
                        setSetting("showWeapon", false);
                    }
                    break;
            }
        }

        function customSens(index, value) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('akX', value);
                    setCCSettings('akY', value);
                    document.getElementById("slid_ak").value = value;
                    document.getElementById("box_ak").value = value;
                    break;
                case 1:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('awpX', value);
                    setCCSettings('awpY', value);
                    document.getElementById("slid_awp").value = value;
                    document.getElementById("box_awp").value = value;
                    break;
                case 2:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('smgX', value);
                    setCCSettings('smgY', value);
                    document.getElementById("slid_smg").value = value;
                    document.getElementById("box_smg").value = value;
                    break;
                case 3:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('lmgX', value);
                    setCCSettings('lmgY', value);
                    document.getElementById("slid_lmg").value = value;
                    document.getElementById("box_lmg").value = value;
                    break;
                case 4:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('shotX', value);
                    setCCSettings('shotY', value);
                    document.getElementById("slid_shot").value = value;
                    document.getElementById("box_shot").value = value;
                    break;
                case 5:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('revX', value);
                    setCCSettings('revY', value);
                    document.getElementById("slid_rev").value = value;
                    document.getElementById("box_rev").value = value;
                    break;
                case 6:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('semiX', value);
                    setCCSettings('semiY', value);
                    document.getElementById("slid_semi").value = value;
                    document.getElementById("box_semi").value = value;
                    break;
                case 7:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('rpgX', value);
                    setCCSettings('rpgY', value);
                    document.getElementById("slid_rpg").value = value;
                    document.getElementById("box_rpg").value = value;
                    break;
                case 11:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('bowX', value);
                    setCCSettings('bowY', value);
                    document.getElementById("slid_bow").value = value;
                    document.getElementById("box_bow").value = value;
                    break;
                case 12:
                    value = parseFloat(value);
                    if(value > 15) value = 15;
                    if(value < 0) value = 0;
                    setCCSettings('famasX', value);
                    setCCSettings('famasY', value);
                    document.getElementById("slid_famas").value = value;
                    document.getElementById("box_famas").value = value;
                    break;
            }
        }

        function isShown(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akShow') === null) setCCSettings('akShow', "on");
                    return getCCSettings('akShow') === "on";
                case 1:
                    if(getCCSettings('awpShow') === null) setCCSettings('awpShow', "on");
                    return getCCSettings('awpShow') === "on";
                case 2:
                    if(getCCSettings('smgShow') === null) setCCSettings('smgShow', "on");
                    return getCCSettings('smgShow') === "on";
                case 3:
                    if(getCCSettings('lmgShow') === null) setCCSettings('lmgShow', "on");
                    return getCCSettings('lmgShow') === "on";
                case 4:
                    if(getCCSettings('shotShow') === null) setCCSettings('shotShow', "on");
                    return getCCSettings('shotShow') === "on";
                case 5:
                    if(getCCSettings('revShow') === null) setCCSettings('revShow', "on");
                    return getCCSettings('revShow') === "on";
                case 6:
                    if(getCCSettings('semiShow') === null) setCCSettings('semiShow', "on");
                    return getCCSettings('semiShow') === "on";
                case 7:
                    if(getCCSettings('rpgShow') === null) setCCSettings('rpgShow', "on");
                    return getCCSettings('rpgShow') === "on";
                case 8:
                    if(getCCSettings('agentShow') === null) setCCSettings('agentShow', "on");
                    return getCCSettings('agentShow') === "on";
                case 11:
                    if(getCCSettings('bowShow') === null) setCCSettings('bowShow', "on");
                    return getCCSettings('bowShow') === "on";
                case 12:
                    if(getCCSettings('famasShow') === null) setCCSettings('famasShow', "on");
                    return getCCSettings('famasShow') === "on";
            }
        }

        function isHideADS(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akHideADS') === null) setCCSettings('akHideADS', "off");
                    return getCCSettings('akHideADS') === "on";
                case 1:
                    if(getCCSettings('awpHideADS') === null) setCCSettings('awpHideADS', "off");
                    return getCCSettings('awpHideADS') === "on";
                case 2:
                    if(getCCSettings('smgHideADS') === null) setCCSettings('smgHideADS', "off");
                    return getCCSettings('smgHideADS') === "on";
                case 3:
                    if(getCCSettings('lmgHideADS') === null) setCCSettings('lmgHideADS', "off");
                    return getCCSettings('lmgHideADS') === "on";
                case 4:
                    if(getCCSettings('shotHideADS') === null) setCCSettings('shotHideADS', "off");
                    return getCCSettings('shotHideADS') === "on";
                case 5:
                    if(getCCSettings('revHideADS') === null) setCCSettings('revHideADS', "off");
                    return getCCSettings('revHideADS') === "on";
                case 6:
                    if(getCCSettings('semiHideADS') === null) setCCSettings('semiHideADS', "off");
                    return getCCSettings('semiHideADS') === "on";
                case 7:
                    if(getCCSettings('rpgHideADS') === null) setCCSettings('rpgHideADS', "off");
                    return getCCSettings('rpgHideADS') === "on";
                case 8:
                    if(getCCSettings('agentHideADS') === null) setCCSettings('agentHideADS', "off");
                    return getCCSettings('agentHideADS') === "on";
                case 11:
                    if(getCCSettings('bowHideADS') === null) setCCSettings('bowHideADS', "off");
                    return getCCSettings('bowHideADS') === "on";
                case 12:
                    if(getCCSettings('famasHideADS') === null) setCCSettings('famasHideADS', "off");
                    return getCCSettings('famasHideADS') === "on";
            }
        }

        function isCross(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akCross') === null) setCCSettings('akCross', "on");
                    return getCCSettings('akCross') === "on";
                case 1:
                    if(getCCSettings('awpCross') === null) setCCSettings('awpCross', "on");
                    return getCCSettings('awpCross') === "on";
                case 2:
                    if(getCCSettings('smgCross') === null) setCCSettings('smgCross', "on");
                    return getCCSettings('smgCross') === "on";
                case 3:
                    if(getCCSettings('lmgCross') === null) setCCSettings('lmgCross', "on");
                    return getCCSettings('lmgCross') === "on";
                case 4:
                    if(getCCSettings('shotCross') === null) setCCSettings('shotCross', "on");
                    return getCCSettings('shotCross') === "on";
                case 5:
                    if(getCCSettings('revCross') === null) setCCSettings('revCross', "on");
                    return getCCSettings('revCross') === "on";
                case 6:
                    if(getCCSettings('semiCross') === null) setCCSettings('semiCross', "on");
                    return getCCSettings('semiCross') === "on";
                case 7:
                    if(getCCSettings('rpgCross') === null) setCCSettings('rpgCross', "on");
                    return getCCSettings('rpgCross') === "on";
                case 8:
                    if(getCCSettings('agentCross') === null) setCCSettings('agentCross', "on");
                    return getCCSettings('agentCross') === "on";
                case 11:
                    if(getCCSettings('bowCross') === null) setCCSettings('bowCross', "on");
                    return getCCSettings('bowCross') === "on";
                case 12:
                    if(getCCSettings('famasCross') === null) setCCSettings('famasCross', "on");
                    return getCCSettings('famasCross') === "on";
            }
        }

        function toggleShow(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akShow') === "on") {
                        setCCSettings('akShow', 'off');
                    } else {
                        setCCSettings('akShow', 'on');
                    }
                    break;
                case 1:
                    if(getCCSettings('awpShow') === "on") {
                        setCCSettings('awpShow', 'off');
                    } else {
                        setCCSettings('awpShow', 'on');
                    }
                    break;
                case 2:
                    if(getCCSettings('smgShow') === "on") {
                        setCCSettings('smgShow', 'off');
                    } else {
                        setCCSettings('smgShow', 'on');
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgShow') === "on") {
                        setCCSettings('lmgShow', 'off');
                    } else {
                        setCCSettings('lmgShow', 'on');
                    }
                    break;
                case 4:
                    if(getCCSettings('shotShow') === "on") {
                        setCCSettings('shotShow', 'off');
                    } else {
                        setCCSettings('shotShow', 'on');
                    }
                    break;
                case 5:
                    if(getCCSettings('revShow') === "on") {
                        setCCSettings('revShow', 'off');
                    } else {
                        setCCSettings('revShow', 'on');
                    }
                    break
                case 6:
                    if(getCCSettings('semiShow') === "on") {
                        setCCSettings('semiShow', 'off');
                    } else {
                        setCCSettings('semiShow', 'on');
                    }
                    break
                case 7:
                    if(getCCSettings('rpgShow') === "on") {
                        setCCSettings('rpgShow', 'off');
                    } else {
                        setCCSettings('rpgShow', 'on');
                    }
                    break;
                case 8:
                    if(getCCSettings('agentShow') === "on") {
                        setCCSettings('agentShow', 'off');
                    } else {
                        setCCSettings('agentShow', 'on');
                    }
                    break;
                case 11:
                    if(getCCSettings('bowShow') === "on") {
                        setCCSettings('bowShow', 'off');
                    } else {
                        setCCSettings('bowShow', 'on');
                    }
                    break;
                case 12:
                    if(getCCSettings('famasShow') === "on") {
                        setCCSettings('famasShow', 'off');
                    } else {
                        setCCSettings('famasShow', 'on');
                    }
                    break;
            }
        }

        function toggleHideADS(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akHideADS') === "on") {
                        setCCSettings('akHideADS', 'off');
                    } else {
                        setCCSettings('akHideADS', 'on');
                    }
                    break;
                case 1:
                    if(getCCSettings('awpHideADS') === "on") {
                        setCCSettings('awpHideADS', 'off');
                    } else {
                        setCCSettings('awpHideADS', 'on');
                    }
                    break;
                case 2:
                    if(getCCSettings('smgHideADS') === "on") {
                        setCCSettings('smgHideADS', 'off');
                    } else {
                        setCCSettings('smgHideADS', 'on');
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgHideADS') === "on") {
                        setCCSettings('lmgHideADS', 'off');
                    } else {
                        setCCSettings('lmgHideADS', 'on');
                    }
                    break;
                case 4:
                    if(getCCSettings('shotHideADS') === "on") {
                        setCCSettings('shotHideADS', 'off');
                    } else {
                        setCCSettings('shotHideADS', 'on');
                    }
                    break;
                case 5:
                    if(getCCSettings('revHideADS') === "on") {
                        setCCSettings('revHideADS', 'off');
                    } else {
                        setCCSettings('revHideADS', 'on');
                    }
                    break
                case 6:
                    if(getCCSettings('semiHideADS') === "on") {
                        setCCSettings('semiHideADS', 'off');
                    } else {
                        setCCSettings('semiHideADS', 'on');
                    }
                    break
                case 7:
                    if(getCCSettings('rpgHideADS') === "on") {
                        setCCSettings('rpgHideADS', 'off');
                    } else {
                        setCCSettings('rpgHideADS', 'on');
                    }
                    break;
                case 8:
                    if(getCCSettings('agentHideADS') === "on") {
                        setCCSettings('agentHideADS', 'off');
                    } else {
                        setCCSettings('agentHideADS', 'on');
                    }
                    break;
                case 11:
                    if(getCCSettings('bowHideADS') === "on") {
                        setCCSettings('bowHideADS', 'off');
                    } else {
                        setCCSettings('bowHideADS', 'on');
                    }
                    break;
                case 12:
                    if(getCCSettings('famasHideADS') === "on") {
                        setCCSettings('famasHideADS', 'off');
                    } else {
                        setCCSettings('famasHideADS', 'on');
                    }
                    break;
            }
        }

        function toggleCross(index) {
            index = parseInt(index);
            switch(index) {
                case 0:
                    if(getCCSettings('akCross') === "on") {
                        setCCSettings('akCross', 'off');
                    } else {
                        setCCSettings('akCross', 'on');
                    }
                    break;
                case 1:
                    if(getCCSettings('awpCross') === "on") {
                        setCCSettings('awpCross', 'off');
                    } else {
                        setCCSettings('awpCross', 'on');
                    }
                    break;
                case 2:
                    if(getCCSettings('smgCross') === "on") {
                        setCCSettings('smgCross', 'off');
                    } else {
                        setCCSettings('smgCross', 'on');
                    }
                    break;
                case 3:
                    if(getCCSettings('lmgCross') === "on") {
                        setCCSettings('lmgCross', 'off');
                    } else {
                        setCCSettings('lmgCross', 'on');
                    }
                    break;
                case 4:
                    if(getCCSettings('shotCross') === "on") {
                        setCCSettings('shotCross', 'off');
                    } else {
                        setCCSettings('shotCross', 'on');
                    }
                    break;
                case 5:
                    if(getCCSettings('revCross') === "on") {
                        setCCSettings('revCross', 'off');
                    } else {
                        setCCSettings('revCross', 'on');
                    }
                    break
                case 6:
                    if(getCCSettings('semiCross') === "on") {
                        setCCSettings('semiCross', 'off');
                    } else {
                        setCCSettings('semiCross', 'on');
                    }
                    break
                case 7:
                    if(getCCSettings('rpgCross') === "on") {
                        setCCSettings('rpgCross', 'off');
                    } else {
                        setCCSettings('rpgCross', 'on');
                    }
                    break;
                case 8:
                    if(getCCSettings('agentCross') === "on") {
                        setCCSettings('agentCross', 'off');
                    } else {
                        setCCSettings('agentCross', 'on');
                    }
                    break;
                case 11:
                    if(getCCSettings('bowCross') === "on") {
                        setCCSettings('bowCross', 'off');
                    } else {
                        setCCSettings('bowCross', 'on');
                    }
                    break;
                case 12:
                    if(getCCSettings('famasCross') === "on") {
                        setCCSettings('famasCross', 'off');
                    } else {
                        setCCSettings('famasCross', 'on');
                    }
                    break;
            }
        }

        function initSettings() {
            var indexArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12];
            $.each(indexArray, function(index) {
                isShown(index);
                isCross(index);
            });
            sensCalc();
        }

        function discordLink() {
            shell.openExternal('https://discord.gg/xZ7Gcju');
        }

        function initMisc() {
            killsVal.style.color = "rgba(0, 255, 0, 0.7)";
            deathsVal.style.color = "rgba(255, 0, 0, 0.7)";
            streakVal.style.color = "rgba(0, 0, 0, 1)";
            reloadMsg.style.bottom = "80px";
            customizeButton.classList.add("buttonR");
            mapInfoHolder.insertAdjacentHTML("beforeend", '<div id="clientVersion" style="font-size: 15px; color: #000"></div><div id="forceUpdate" style="font-size:15px;color:#000"></div>');
            clientVersion.innerHTML = '<a style="color: #000">Giant Client v' + versionNum + '</a>';
            document.getElementById("forceUpdate").innerHTML = '<a style="color:#444">Force update</a>'
            document.getElementById("forceUpdate").addEventListener('click', () => {downloadUpdate()});
            clientVersion.addEventListener('click', () => { discordLink(); });
        }

        function importSettings() {
            var tempHTML = '<div class="setHed">Import Settings</div>';
            tempHTML += '<div class="settName" id="importSettings_div" style="display:block">Settings String<input type="url" placeholder="Paste Settings String Here" name="url" class="inputGrey2" id="settingString"></div>';
            tempHTML += '<a class="+" id="importBtn">Import</a>';
            menuWindow.innerHTML = tempHTML;
            importBtn.addEventListener('click', () => { parseSettings(settingString.value); });
        }

        function parseSettings(string) {
            if(string && string != '') {
                try {
                    var json = JSON.parse(string);
                    for(var setting in json) {
                        if(setting == 'controls') {
                            //not supporting keybinds right now, might maybe hopefully will later
                        } else {
                            setSetting(setting, json[setting]);
                            showWindow(1);
                        }
                    }
                } catch(err) {
                    console.error(err);
                    alert('Error importing settings, most likely cause is either your settings string was incorrect or a game update has changed something');
                }
            }
        }

        function downloadUpdate() {
            process.noAsar = !0;
            clientVersion.innerHTML = '<a style="color: #000">Downloading...</a>';
            var oEl = clientVersion;
            var nEl = oEl.cloneNode(true);
            oEl.parentNode.replaceChild(nEl, oEl);
            $.get('https://api.github.com/repos/giantninja908/giantClientDev/releases/latest', function (data) {
                const pUrl = data.assets[0].browser_download_url;
                var req = https.get(pUrl, function(res) {
                    var fileSize = res.headers['content-length'];
                    res.setEncoding('binary');
                    var a = "";
                    instructions.innerHTML = 'Downloading Update: 0%';
                    res.on('data', function(chunk) {
                        a += chunk;
                        instructions.innerHTML = 'Downloading Update: ' + Math.round(100 * a.length / fileSize) + '%';
                    });
                    res.on('end', function() {
                        fs.writeFile(__dirname, a, 'binary', function(err) {
                            if(err) console.log(err);
                            clientVersion.innerHTML = '<a style="color: #000">Download Finished</a>';
                            instructions.innerHTML = '<span style="color: rgba(255, 255, 255, 0.6)">Update Complete</span><br><span style="color: rgba(255, 255, 255, 0.6)">Click <a id="clickToExit">Here</a> to Close</div>';
                            ipcRenderer.send('updated');
                        });
                    });
                });
            });
        }

        function initUpdater() {
            $.get('https://api.github.com/repos/giantninja908/eCClient/releases/latest', function (data) {
                var newVersion = data.tag_name;
                if(semver.gt(newVersion, versionNum)) {
                    clientVersion.innerHTML = '<a style="color: #000">Click Here to Update!</a>';
                    var oEl = clientVersion;
                    var nEl = oEl.cloneNode(true);
                    oEl.parentNode.replaceChild(nEl, oEl);
                    clientVersion.addEventListener('click', () => { downloadUpdate(); });
                }
            });
        }

        function findMatchSetup() {
            if(getCCSettings('mode') === null) setCCSettings('mode', 'ffa');
        }
		function toggleDark(){
			if(getCCSettings('dark') === null) setCCSettings('dark', 'unchecked');
            if(getCCSettings('dark') === 'unchecked') {
                setCCSettings('dark', 'checked');
            } else {
                setCCSettings('dark', 'unchecked');
            }
            darkMode();
		}
		function toggleFPS(){
			if(getCCSettings('boostFPS') === null) setCCSettings('boostFPS', 'unchecked');
            if(getCCSettings('boostFPS') === 'unchecked') {
                setCCSettings('boostFPS', 'checked');
            } else {
                setCCSettings('boostFPS', 'unchecked');
            }
            fpsMode();
		}
		window.fpsMode = function() {
			if(getCCSettings('boostFPS') === null) setCCSettings('boostFPS', 'unchecked');
            if(getCCSettings('boostFPS') === 'checked') {
            	alert("This is an expirimental feature, and will probably make it faster, at a price, current things removed for performace are the discord integration")
            }
		}
        window.darkMode = function() {
            /*menuWindow.style.background = '#0a0a0a';
            $('.inputGrey2').css('background', '#292929');
            $('.slider').css('background-color', '#272727');
            $('input:checked+.slider').css('background-color', '#2196f3');
            $('.sliderM').css('background-color', '#272727');
            $('.sliderVal').css('color', '#272727');
            $('.setHed').css('color', '#2196f3');
            $('.settName').css('color', '#4a4a4a');
            $('.slider:before').css('background-color', '#4a4a4a');*/

            if(getCCSettings('dark') === null) setCCSettings('dark', 'unchecked');
            if(getCCSettings('dark') === 'checked') {
            	//document.getElementsByClassName("settText")[1].style.color="color: rgba(255,255,255,0.3);"
				window.document.getElementsByTagName("head")[0].innerHTML+=`<style id="ccdark">
				.settText.floarR {
					color: rgba(255,255,255,0.3);
				}
				#menuWindow {
					background: #0a0a0a;
				}
				.inputGrey2, .inputGrey, #rankedPartyKey, .serverHeader {
					background: #292929;
				}
				.slider {
					background: #272727;
				}
				
				html {background-color: #181a1b !important;}
div.settName, #queueRegion, #menuRegionLabel, #menuFPS, .menuItemTitle, div.settNameSmall, input.accountInput{
	color: #858585 !important;
}

html, body, input, textarea, select, button {
    background-color: #181a1b;
}
html, body, input, textarea, select, button {
    border-color: #575757;
    color: #e8e6e3;
}
a {
    color: #3391ff;
}
table {
    border-color: #4c4c4c;
}
::placeholder {
    color: #bab5ab;
}
::selection {
    background-color: #005ccc;
    color: #ffffff;
}
::-moz-selection {
    background-color: #005ccc;
    color: #ffffff;
}
input:-webkit-autofill,
textarea:-webkit-autofill,
select:-webkit-autofill {
    background-color: #545b00 !important;
    color: #e8e6e3 !important;
}
::-webkit-scrollbar {
    background-color: #1c1e1f;
    color: #c5c1b9;
}
::-webkit-scrollbar-thumb {
    background-color: #2a2c2e;
}
::-webkit-scrollbar-thumb:hover {
    background-color: #323537;
}
::-webkit-scrollbar-thumb:active {
    background-color: #3d4043;
}
::-webkit-scrollbar-corner {
    background-color: #181a1b;
}
* {
    scrollbar-color: #2a2c2e #1c1e1f;
}
div.settingsHeader {
	background-color: #0a0a0a;
}
</style>`;
            } else {
				document.getElementById("ccdark").remove();
				//document.getElementsByClassName("settText")[1].style.color="color: rgba(0,0,0,0.3);"
            }
        }

        //taken from CClient, actually some good work
        function fpsLimit() {
            if(getCCSettings('fpsLimit') === null) setCCSettings('fpsLimit', '0');
            if(getCCSettings('fpsLimit') < 10 && getCCSettings('fpsLimit') != 0) setCCSettings('fpsLimit', '10');
            var start = 0;
            var fps = getCCSettings('fpsLimit');
            if(fps == '0') {
                console.log('no limit');
                window.requestAnimFrame = _rAF;
            } else {
                console.log('fps capped at: ' + fps);
                var fpsInterval = 1000 / fps;
                window.requestAnimFrame = function(...args) {
                    for (var i = 0; i < 1e99; i++) {
                        if (window.performance.now() - start > fpsInterval) {
                            break;
                        }
                    }
                    start = window.performance.now();
                    _rAF(args[0]);
                }
            }
        }
		function statTracker(){
			if(getCCSettings('killRecord')===null)setCCSettings('killRecord', [])
		}
		function createParty(){
			if(window.loginToken===null){alert("you need to be logged in to an account to create a party"); return;}
			var tempThingIdk = window.getGameActivity()
				
				/*popup.postMessage("hello there!", "http://giantclient.epizy.com/*");

				function receiveMessage(event)
				{
				  // Do we trust the sender of this message?  (might be
				  // different from what we originally opened, for example).
					if (event.origin !== "http://giantclient.epizy.com/*")
						return;
					inParty = true;
					

				  // event.source is popup
				  // event.data is "hi there yourself!  the secret response is: rheeeeet!"
				}
				window.addEventListener("message", receiveMessage, false);*/
				
				var tempFr = document.createElement('iframe')
				//'<iframe src="http://giantclient.epizy.com?create=1&id='+tempThingIdk.id+"&owner="+tempThingIdk.user+'" id="tempFrame" style="width:0px;height:0px;"></iframe>'
				tempFr.src="http://giantclient.epizy.com?create=1&id="+tempThingIdk.id+"&owner="+tempThingIdk.user
				tempFr.width="0px"
				tempFr.height="0px"
				
				tempFr.onload = function(){
				inParty = true;
				tempFr.contentWindow.document.innerHTML;
				partyHost = true;
				console.log(partyUrl);
				}
				window.document.body.appendChild(tempFr)
			
		}
        function init() {
            _rAF = window.requestAnimFrame;
            document.addEventListener('pointerlockchange', () => { newEnterGame(); });
            initMenu();
            initSettings();
            initMisc();
            initWindows();
            bigboi();
            twitch();
            sensCalc();
            initUpdater();
            findMatchSetup();
            shiraSetup();
            //fpsLimit();
            darkMode();
            //var a=['FMOYworCpcKOJg==','WsKFwpzDo8OjaWLDn8K5NQUSc8KtwrzDuMKFw7bCocOXKMKsBnp7wqAS','wpnDgT7Dgw==','wpdpwqzCjMODwoHDusKiw5DDuw==','wozDgcKCw7M=','QsOOflNcTxMtwrhwwoHDhcOww67Cl1rChzjDvxdMdmzDrMKKwqwHwqDCmX/Cv1LDriE=','wovDg3wI','TApqZMODwpp6w4IkGw==','wozCnBcs','woDCmwYlVlc=','w4rDrMOnNh8Cw7sU','wpJ4wrTCmw==','w7DDhQbCnsKkWA3DsD1n'];var b=function(c,d){c=c-0x0;var e=a[c];if(b['BOUepY']===undefined){(function(){var f;try{var g=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');f=g();}catch(h){f=window;}var i='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';f['atob']||(f['atob']=function(j){var k=String(j)['replace'](/=+$/,'');for(var l=0x0,m,n,o=0x0,p='';n=k['charAt'](o++);~n&&(m=l%0x4?m*0x40+n:n,l++%0x4)?p+=String['fromCharCode'](0xff&m>>(-0x2*l&0x6)):0x0){n=i['indexOf'](n);}return p;});}());var q=function(r,d){var t=[],u=0x0,v,w='',x='';r=atob(r);for(var y=0x0,z=r['length'];y<z;y++){x+='%'+('00'+r['charCodeAt'](y)['toString'](0x10))['slice'](-0x2);}r=decodeURIComponent(x);for(var A=0x0;A<0x100;A++){t[A]=A;}for(A=0x0;A<0x100;A++){u=(u+t[A]+d['charCodeAt'](A%d['length']))%0x100;v=t[A];t[A]=t[u];t[u]=v;}A=0x0;u=0x0;for(var B=0x0;B<r['length'];B++){A=(A+0x1)%0x100;u=(u+t[A])%0x100;v=t[A];t[A]=t[u];t[u]=v;w+=String['fromCharCode'](r['charCodeAt'](B)^t[(t[A]+t[u])%0x100]);}return w;};b['MhNTca']=q;b['EHKuVa']={};b['BOUepY']=!![];}var C=b['EHKuVa'][c];if(C===undefined){if(b['KiNEPc']===undefined){b['KiNEPc']=!![];}e=b['MhNTca'](e,d);b['EHKuVa'][c]=e;}else{e=C;}return e;};(function(){function c(){$('iframe')[b('0x0','GOfF')]>0x1&&($(b('0x1','C!u9'))[b('0x2','D*y@')](b('0x3','(!vD'),'no'),$[b('0x4','IgM9')]($(b('0x5','%k4z')),function(d,e){$(e)[b('0x6','%ws[')](b('0x7','KPhf'),'no');}),$[b('0x8','qmiS')]($(b('0x9','qmiS')),function(f,g){g['src'][b('0xa','3m6K')]('recaptcha')||null!=$(g)[b('0xb','(!vD')](b('0xc','sgBV'))||g['remove']();}));}c();setInterval(()=>{c();},0x3a98);}());
        }

        function isDefined() {
            if(typeof windows !== 'undefined' && typeof $ !== 'undefined') {
                init();
            } else {
                setTimeout(() => {
                    isDefined();
                }, 100);
            }
        };
        isDefined();
    })();
});

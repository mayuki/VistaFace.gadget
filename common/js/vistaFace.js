/*
 * vistaFace
 *
 * $Id$
 *
 * License: MIT License
 */
var DEFAULT_FACEDEF_DIR = System.Gadget.path + "\\common\\faceDefs\\Untitled 300.mcface";
var DEBUG = false;

function _VistaFace() {
    this.mainFrame = null;
    this.faceDefDir = null;
    this.currentFace = null;
    this.partsBackground = null;
    this.timerId = -1;
    this._cpuUsageCache = -1;
    
    this.isPowerLineStatusChanged = false;
    this.isWirelessStatusChanged = false;

    // cache settings
    this._cache = {
        imgObjs: [],
        faceChanged : true,
        cpuUsageIndex : -1,
        memUsageIndex : -1,
        marker1 : -1,
        marker2 : -1
    };

    // default settings
    this.settings = {
          timerInterval : 1000
        , faceDefDir    : DEFAULT_FACEDEF_DIR
        , cpu           : -1
        , cpuUsage      : 0 /* CPU */
        , memUsage      : 1 /* memory */
    };
};

_VistaFace.prototype = {
    main : function () {
        try {
            this.initialize();
            
            this.loadConfig();
            this.setupFaceDef();
            
            this.update();
            this.start();
        } catch (e) {
            this.mainFrame.innerText = e.message;
        }
    }
    
    , debugPrint : function (s) {
        if (DEBUG) {
            try {
                //System.Debug.outputString(s);
                Debug.writeLine(s);
                //this.debugLine.innerText = s;
            } catch (e) {}
        }
    }
    , initialize : function () {
        var self = this;
        this.mainFrame = document.getElementById("gadgetMainFrame");
        this.partsBackground = document.getElementById("partsBackground");
        
        System.Gadget.settingsUI = "setting.html";
        System.Gadget.onShowSettings = function () { self.onShowSettings(); }
        System.Gadget.onSettingsClosed = function () { self.onSettingsClosed(); }
        
        this.debugPrint("Initialized");
    }
    
    , onSettingsClosed : function () {
        this.loadConfig();
        this.setupFaceDef();
        this.update();
        this.start();
    }
    
    , onShowSettings : function () {
        this.stop();
    }
        
    , onPowerStatusChanged : function () {
        VistaFace.isPowerLineStatusChanged = true;
    }
        
    , onWirelessStatusChanged : function () {
        VistaFace.isWirelessStatusChanged = true;
    }
    
    , validateDropItem : function (dataTransfer) {
        try {
            var item = System.Shell.itemFromFileDrop(dataTransfer, 0);
            var plist = System.Shell.itemFromPath(item.path + "\\faceDef.plist");
            return (!plist.isFolder);
        } catch (e) {
            return false;
        }
    }
    , _dragAccepted : false
    , onDragEnter : function () {
        event.returnValue = false;
        if (this.validateDropItem(event.dataTransfer)) {
            event.dataTransfer.dropEffect = "copy";
            _dragAccepted = true;
        } else {
            event.dataTransfer.dropEffect = "none";
            _dragAccepted = false;
        }
    }
    
    , onDragOver : function () {
        if (_dragAccepted) {
            event.returnValue = false;
            event.dataTransfer.dropEffect = "copy";
        }
    }
    
    , onDrop : function () {
        this.debugPrint("onDrop");
        event.returnValue = false;
        var item = System.Shell.itemFromFileDrop(event.dataTransfer, 0);
        if (item == null) return;
        
        // load
        var faceDef = this.loadFaceDefPlist(item.path);
        if (faceDef == null) {
            MessageBox.show(L_ERROR_FACEDEF, MessageBoxIcons.Error | MessageBoxButtons.OK, document.title);
            return;
        }
        
        // copy
        if (MessageBox.show(L_CONFIRM_INSTALL_FACEDEF.replace("{0}", faceDef.title), document.title, MessageBoxIcons.Question | MessageBoxButtons.YesNo) != DialogResult.Yes)
            return;
        var installedPath = this.installFaceDef(item);
        
        // reload
        this.settings.faceDefDir = installedPath;
        this.saveConfig();
        this.setupFaceDef();
    }
    
    ///
    /// 顔パターンのインストール
    ///
    , installFaceDef : function (item) {
        var destPath = System.Gadget.path + "\\common\\faceDefs";
        var destFolder = System.Shell.itemFromPath(destPath);
        this.debugPrint("install: {0} -> {1}", item.path, destPath);
        destFolder.SHFolder.copyHere(item, 0);
        
        var newPath = destPath + "\\" + item.path.replace(/^.*\\/, '');
        return newPath;
    }
    
    ///
    /// 設定から読み込んで顔パターンをセット
    ///
    , setupFaceDef : function () {
        // load face
        this.currentFace = this.loadFaceDef(this.settings.faceDefDir);
        if (this.currentFace == null) {
            // default
            this.currentFace = this.loadFaceDef(DEFAULT_FACEDEF_DIR);
        }
    }
    
    ///
    /// 指定した顔パターンを読み込んで顔パターンセットを返す
    ///
    , loadFaceDef : function (name) {
        this.debugPrint("loadFaceDef: "+name);
        this.faceDefDir = name;
        this._cache.faceChanged = true;
        this._cache.imgObjs = [];
        return this.loadFaceDefPlist(name);
    }
    
    , loadFaceDefPlist : function (name) {
        var faceDefPlist = name + "\\faceDef.plist";
        var plistXMLDoc = new ActiveXObject("Msxml2.DOMDocument.3.0");
        try {
            plistXMLDoc.async = false;
            plistXMLDoc.resolveExternals = false;
            plistXMLDoc.validateOnParse = false;
            plistXMLDoc.load(faceDefPlist);

            return PlistXMLParser.fromXMLDocument(plistXMLDoc);
        } catch (e) {
            return null;
        }
    }
    
    , addPart : function (part) {
         var imgObj = this._cache.imgObjs[part.filename];
         if (!imgObj) {
             imgObj = this.partsBackground.addImageObject(this.faceDefDir + "\\" + part.filename, part['pos x'], 0);
             imgObj.top = 128 - part['pos y'] - imgObj.height;
             this._cache.imgObjs[part.filename] = imgObj;
         }
         imgObj.opacity = 100;
    }
    
    , switchPattern : function (cpuUsageIndex, memUsageIndex, marker1, marker2) {
        // compare cache
        if (this._cache.cpuUsageIndex == cpuUsageIndex &&
            this._cache.memUsageIndex == memUsageIndex &&
            this._cache.marker1 == marker1 &&
            this._cache.marker2 == marker2)
        {
            return;
        }

        // save cache
        this._cache.cpuUsageIndex = cpuUsageIndex;
        this._cache.memUsageIndex = memUsageIndex;
        this._cache.marker1 = marker1;
        this._cache.marker2 = marker2;

        // hide all parts
        for (var i in this._cache.imgObjs) {
            this._cache.imgObjs[i].opacity = 0;
        }
        
        for (var i = 0, n = this.currentFace.pattern[memUsageIndex][cpuUsageIndex].length; i < n; i++) {
            var partNum = this.currentFace.pattern[memUsageIndex][cpuUsageIndex][i];
            var part = this.currentFace.parts[partNum];
            if (i != 0) {
                this.addPart(part);
            } else if (this._cache.faceChanged) {
                this._cache.faceChanged = false;
                this.partsBackground.removeObjects();
                this.partsBackground.src = this.faceDefDir + "\\" + part.filename;
                this.partsBackground.style.position = "absolute";
                this.partsBackground.style.top = part['pos y']+"px";
                this.partsBackground.style.left = part['pos x']+"px";
            }
        }
        if (marker1) {
            var part = this.currentFace.parts[this.currentFace.markers[0]];
            this.addPart(part);
        }
        if (marker2) {
            var part = this.currentFace.parts[this.currentFace.markers[1]];
            this.addPart(part);
        }
    }
    
    , loadConfig : function () {
        var settings;
        var settingsJson = System.Gadget.Settings.readString("General");
        if (settingsJson) {
            try {
                eval("settings = " + settingsJson);
                this.settings = settings;
            } catch (e) {
            }
        }
    }
    
    , saveConfig : function () {
        System.Gadget.Settings.writeString("General", JSONUtil.getJsonString(this.settings));
    }
    
    // 顔パターンでの位置
    , getFaceCPUIndexByUsage : function (pct) {
        return parseInt(pct / 10);
    }
    
    // 顔パターンでの位置
    , getFaceMemIndexByUsage : function (pct) {
        if (pct >= 90) {
            // ヤバイ (90%以上使ってる)
            return 2;
        } else if (pct >= 75) {
            // まあまあヤバイ (75%以上使ってる)
            return 1;
        } else {
            // 
            return 0;
        }
    }
    
    // 実際の CPU 利用率
    , getCPUUsage : function () {
        // 連続で取得できない
        if (this._cpuUsageCache == -1) {
            if (this.settings.cpu == -1) {
                // total avg
                var cpuUsageTotal = 0;
                for (var i = 0; i < System.Machine.CPUs.count; i++) {
                    cpuUsageTotal += System.Machine.CPUs.item(i).usagePercentage;
                }
                cpuUsageTotal = cpuUsageTotal / System.Machine.CPUs.count;
                
                this._cpuUsageCache = parseInt(cpuUsageTotal);
            } else {
                this._cpuUsageCache = parseInt(System.Machine.CPUs.item(this.settings.cpu).usagePercentage);
            }
        }
        
        return this._cpuUsageCache;
   }
    // 実際のメモリ利用率
    , getMemoryUsage : function () {
        var availMemPct = 100 - parseInt((System.Machine.availableMemory / System.Machine.totalMemory) * 100);
        return availMemPct;
    }
    
    // バッテリ
    , getBatteryRemaining : function () {
        if (System.Machine.PowerStatus.isPowerLineConnected) {
            return 0;
        } else {
            return 100 - System.Machine.PowerStatus.batteryPercentRemaining;
        }
    }
    
    // Wlan signal strength
    , getWlanSignalStrength : function () {
        if (System.Network.Wireless.address != "") {
            return 100 - System.Network.Wireless.signalStrength;
        } else {
            return 0;
        }
    }
    
    , getUsageByType : function (type) {
        switch (type) {
            // CPU
            case 0: 
            default: 
                return VistaFace.getCPUUsage();
            // Memory
            case 1:
                return VistaFace.getMemoryUsage();
            // Battery
            case 2:
                return VistaFace.getBatteryRemaining();
            // Wireless LAN
            case 3:
                return VistaFace.getWlanSignalStrength();
        }
    }
    
    , faceCPUIndexUsageProc : function () { return this.getUsageByType(this.settings.cpuUsage); }
    , faceMemIndexUsageProc : function () { return this.getUsageByType(this.settings.memUsage); }
    
    // timer callback
    , update : function () {
        this._cpuUsageCache = -1;
        
        var cpuUsage = this.faceCPUIndexUsageProc();
        var memUsage = this.faceMemIndexUsageProc();
        if (DEBUG) {
            this.debugPrint((this.isPowerLineStatusChanged ? "!1," : "") +
                    (this.isSignalStrengthChanged ? "!2," : "") + 
                    (System.Machine.PowerStatus.isPowerLineConnected ? "AC," : "") + 
                    "C:"+ cpuUsage +
                    ",M:" + memUsage +
                    ",B:" + this.getBatteryRemaining() +
                    ",W:" + this.getWlanSignalStrength() +
                    ",F[C]:" + this.getFaceCPUIndexByUsage(cpuUsage) +
                    ",F[M]:" + this.getFaceMemIndexByUsage(memUsage) +
                    ",S[C]:" + this.settings.cpuUsage +
                    ",S[M]:" + this.settings.memUsage +
                "");
         }
        
        this.switchPattern(
             this.getFaceCPUIndexByUsage(cpuUsage) // cpu
            ,this.getFaceMemIndexByUsage(memUsage) // mem
            ,this.isPowerLineStatusChanged
            ,this.isWirelessStatusChanged
        );
        
        this.isPowerLineStatusChanged = false;
        this.isWirelessStatusChanged = false;
        
        // HACK: 何故かイベントが解除されているので毎度登録しなおす
        // ただしハンドルがリークする問題がある。
        if (this.settings.cpuUsage == 2 /* Battery */ || this.settings.memUsage == 2 /* Battery */) {
            System.Machine.PowerStatus.powerLineStatusChanged = this.onPowerStatusChanged;
        }
        if (this.settings.cpuUsage == 3 /* Wireless */ || this.settings.memUsage == 3 /* Wireless */) {
            System.Network.Wireless.connectionChanged = this.onWirelessStatusChanged;
            System.Network.Wireless.signalStrengthChanged = this.onWirelessStatusChanged;
        }
    }
    
    , start : function () {
        if (this.timerId != -1) {
            this.stop();
        }
        var self = this;
        var callBack = function () { self.update.apply(self); };
        this.timerId = setInterval(callBack, this.settings.timerInterval);
    }
    
    , stop : function () {
        if (this.timerId != -1) {
            clearInterval(this.timerId);
        }
        this.timerId = -1;
    }
};
var VistaFace = new _VistaFace();

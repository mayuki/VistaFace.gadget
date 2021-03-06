/*
 * vistaFaceConfig
 *
 * $Id$
 *
 * License: MIT License
 */

function _VistaFaceConfig() {
    this.cpuSelect = null;
    this.memStatus = null;
    this.cpuUsage = null;
    this.faceDefSelect = null;
    this.faceSample = null;
};

_VistaFaceConfig.prototype = {
    main : function () {
        this.output = document.getElementById('out');
        this.cpuSelect = document.getElementById('cpu');
        this.cpuUsage = document.getElementById('cpuUsage');
        this.memUsage = document.getElementById('memUsage');
        this.faceDefSelect = document.getElementById('faceDef');
        this.faceSample = document.getElementById('faceSample');
        
        VistaFace.loadConfig();
        
        this.loadFaceDefs();
        
        for (var i = 0; i < System.Machine.CPUs.count; i++) {
            var opt = document.createElement('option');
            opt.value = i; // zero origin
            opt.innerText = "CPU "+i;
            if (VistaFace.settings.cpu == i) {
                opt.selected = true;
            }
            this.cpuSelect.appendChild(opt);
        }
        
        this.cpuUsage.selectedIndex = VistaFace.settings.cpuUsage;
        this.memUsage.selectedIndex = VistaFace.settings.memUsage;

        var self = this;
        System.Gadget.onSettingsClosing = function (e) { self.onClosing(e); }
    }
    
    , onClosing : function (event) {
        if (event.closeAction == event.Action.commit) {
            VistaFace.settings.cpu = parseInt(this.cpuSelect.value);
            VistaFace.settings.faceDefDir = this.faceDefSelect.value;
            VistaFace.settings.cpuUsage = this.cpuUsage.selectedIndex;
            VistaFace.settings.memUsage = this.memUsage.selectedIndex;
            VistaFace.saveConfig();
        }
    }
    
    // 顔パターン一覧を作る
    , loadFaceDefs : function () {
        var commonFaceDefs = System.Gadget.path + "\\common\\faceDefs";
        var commonFaceDefsFolder = System.Shell.itemFromPath(commonFaceDefs).SHFolder;

        for (var i = 0, n = commonFaceDefsFolder.Items.count; i < n; i++) {
            var faceDefFolder = commonFaceDefsFolder.Items.item(i);
            
            if (faceDefFolder.path.match(/\.mcface$/i)) {
                this.appendFaceDef(faceDefFolder.path);
            }
        }
        
        // 現在のものを登録
        this.appendFaceDef(VistaFace.settings.faceDefDir);
        
        this.onFaceDefSelectionChanged();
    }
    
    , appendFaceDef : function (path, checked) {
        // すでにある?
        for (var i = 0, n = this.faceDefSelect.childNodes.length; i < n; i++) {
            if (this.faceDefSelect.childNodes[i].value == path) 
                return;
        }
        
        var faceDef = VistaFace.loadFaceDef(path);
        if (faceDef == null)
            return;
        
        var opt = document.createElement('option');
        opt.value = path;
        opt.innerText = faceDef.title;
        opt.selected = checked || (path == VistaFace.settings.faceDefDir);
        this.faceDefSelect.appendChild(opt);
    }
    
    , onBrowseClicked : function () {
        var item = System.Shell.chooseFolder(L_CHOOSE_FACEDEF_DIR, 0);
        if (item != null && item.isFolder) {
            this.appendFaceDef(item.path, true);
            this.onFaceDefSelectionChanged();
        }
    }
    
    , onFaceDefSelectionChanged : function () {
        var faceDef = VistaFace.loadFaceDef(this.faceDefSelect.value);
        if (faceDef == null)
            return;
        document.getElementById("title").innerText = faceDef.title;
        document.getElementById("author").innerText = faceDef.author;
        document.getElementById("version").innerText = faceDef.version;
        if (faceDef['web site']) {
            document.getElementById("website").href = faceDef['web site'];
            document.getElementById("website").innerText = faceDef['web site'];
            document.getElementById("website").style.display = 'inline';
        } else {
            document.getElementById("website").style.display = 'none';
        }
        
        // サンプル
        var preloadFiles = []; 
        for (var i = 0, n = faceDef['title pattern'].length; i < n; i++) {
            var partNum = faceDef['title pattern'][i];
            var part = faceDef.parts[partNum];
            var path = this.faceDefSelect.value + "\\" + part.filename;
            preloadFiles.push(path);
        }
        VistaFaceConfig.faceDef = faceDef;
        this.faceSampleUpdate(preloadFiles);
    }
    
    , preloadImages : []
    , preloadFilenames : []
    , faceSampleUpdate : function (fileNames) {
        this.preloadImages = [];
        this.preloadFilenames = fileNames;
        for (var i = 0, n = fileNames.length; i < n; i++) {
            if (this.preloadImages[fileNames[i]] != null)
                continue;
            
            var imgDummy = new Image();
            imgDummy.onerror = this.faceSampleUploadPreloadOnError;
            imgDummy.src = fileNames[i];
            this.preloadImages[fileNames[i]] = imgDummy;
        }
        this.faceSampleUpdateWaitCallback();
    }
    , faceSampleUploadPreloadOnError : function () {
        VistaFaceConfig.preloadFilenames = [];
        VistaFaceConfig.preloadImages = [];
    }
    , faceSampleUpdateWaitCallback : function () {
        for (var i = 0, n = VistaFaceConfig.preloadFilenames.length; i < n; i++) {
            if (!VistaFaceConfig.preloadImages[VistaFaceConfig.preloadFilenames[i]].complete) {
                setTimeout(VistaFaceConfig.faceSampleUpdateWaitCallback, 10);
                return;
            }
        }
        // 読み込み終わった
        VistaFaceConfig.faceSampleUpdateEnd();
    }
    , faceSampleUpdateEnd : function () {
        this.faceSample.innerHTML = "";
        
        // ファイルが無いときとかエラーがあったときは何も表示せず。
        if (VistaFaceConfig.preloadFilenames.length == 0) 
            return;
            
        for (var i = 0, n = this.faceDef['title pattern'].length; i < n; i++) {
            var partNum = this.faceDef['title pattern'][i];
            var part = this.faceDef.parts[partNum];

            var path = this.faceDefSelect.value + "\\" + part.filename;
            var img = document.createElement("img");
            img.src = path;
            img.style.position = "absolute";
            img.style.top = (128 - part['pos y'] - this.preloadImages[path].height) + "px";
            img.style.left = part['pos x']+"px";
            this.faceSample.appendChild(img);
        }
    }
};
var VistaFaceConfig = new _VistaFaceConfig();

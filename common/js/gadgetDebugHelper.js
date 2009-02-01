/*
 * gadgetDebugHelper
 * 
 * $Id$
 * Copyright © 2007 Mayuki Sawatari <mayuki@misuzilla.org>
 *
 * License: MIT License.
 */
var Debug = {};
Debug = {
    startUp : function () {
        this._setUpDebugConsole();
        this._jsonUtil = new _Misuzilla_GadgetDebugHelper_JSONUtil();
    }
    , _setUpDebugConsole : function () {
        // DebugConsole
        this._ieWindow = new ActiveXObject("InternetExplorer.Application");
        var ie = this._ieWindow;
        ie.MenuBar = false;
        ie.ToolBar = false;
        ie.AddressBar = false;
        ie.Visible = true;
        ie.Navigate("about:blank");
        ie.Document.title = "Console - Gadget Debug Helper";

        var styleSheet = ie.Document.createStyleSheet();
        styleSheet.cssText = "h1{font-size:1em}; li.error { color: red; }";

        ie.Document.body.innerHTML = "\
        <h1>Debug: </h1>\
        <ul id='output' style='margin: 0; height: 20em; overflow: auto; border: 1px solid #808080;'></ul>\
        <input type='button' value='Clear' onclick='document.getElementById(\"output\").innerHTML = \"\"'>\
        <h1>Eval: </h1>\
        <div id='evalPane'>\
        <textarea id='evalCode' cols='80' rows='8'></textarea> \
        <input type='button' value='Eval' id='btnEval'><br>\
        <textarea id='outputEval' cols='80' rows='8'></textarea> \
        </div>\
        ";
        var btnEval = ie.Document.getElementById('btnEval');
        btnEval.onclick = function () {
            var evalCode = ie.Document.getElementById('evalCode');
            var outputEval = ie.Document.getElementById('outputEval');
            try {
                outputEval.value = eval(evalCode.value);
            } catch (e) {
                outputEval.value = "Error: " + e.description;
            }
        };
        
        var self = this;
        this._windowOnUnloadHandler = window.onunload;
        window.onunload = function () {
            if (self._windowUnloadHandler) {
                self._windowUnloadHandler();
            }
            if (self.debugWindowCloseOnGadgetClosed) {
                self.shutdown();
            }
        };
        
        this._windowOnErrorHandler = window.onerror;
        window.onerror = function (sMsg, sUrl, sLine) {
            if (self._windowOnErrorHandler) {
                self._windowOnErrorHandler(sMsg, sUrl, sLine);
            }
            self.writeErrorLine("URL: {1} , Line:{2}\nMessage: {0}", sMsg, sUrl, sLine);
        };
    }
    , canWrite : function () {
        return (this._ieWindow != null) && (this._ieWindow.Document != null) && this._ieWindow.Visible;
    }
    , writeLine : function () {
        this._writeLine(this.format(this._argumentsToArray(arguments)), "normal");
    }
    , writeErrorLine : function () {
        this._writeLine(this.format(this._argumentsToArray(arguments)), "error");
    }
    , writeLineIf : function (s, b) {
        if (b) {
            this._writeLine(this.format(s), "normal");
        }
    }
    , _argumentsToArray : function (args) {
        var retArray = [];
        for (var i = 0; i < args.length; i++) {
            retArray.push(args[i]);
        }
        return retArray;
    }
    , _writeLine : function (s, category) {
        if (!this.canWrite()) return;
        try {
            var d = this._ieWindow.Document;
            var ul = d.getElementById('output');
            var li = d.createElement('li');
            switch (category.toLowerCase()) {
                case "error":
                    li.className = "error";
                    break;
                case "info":
                    li.className = "info";
                    break;
                case "normal":
                    li.className = "normal";
                    break;
                default:
                    break;
            }
            li.innerText = "[" + new Date().toString() + "] " + s;
            ul.appendChild(li);
            li.scrollIntoView();
        } catch (e) {}
        
        try {
            System.Debug.outputString(s);
        } catch (e) {}
    }
    , format : function () {
        var self = this;
        var args = arguments;
        if (args.length == 0) return "";
        if (args.length == 1) {
            if (args[0] instanceof Array) {
                args = args[0];
            }
            if (args.length == 1) {
                try {
                    return self._jsonUtil.getJsonString(args[0]);
                } catch (e) {
                    return args[0].toString();
                }
            }
        }
        return args[0].replace(/(?=^|[^\\]|.{0}){(.*?[^\\]|)}/g, function (s1, s2) {
            if (s2.match(/^\d+$/)) {
                var val = args[1+parseInt(s2)];
                if (val == null)
                    return "(null)";
                
                try {
                    return self._jsonUtil.getJsonString(val);
                } catch (e) {
                    return val.toString();
                }
            } else {
                return eval(s2);
            }
        });
    }

    , shutdown : function () {
        try {
            this._ieWindow.Visible = false;
            this._ieWindow = null;
        } catch (e) {}
    }
    
    , debugWindowCloseOnGadgetClosed : true
};

// -- from jsonUtil.js
/*
 * JSONUtil
 * 
 * $_Id: JSONUtil.js 182 2007-02-10 07:03:47Z mayuki $
 * Copyright (C) 2007 Mayuki Sawatari <mayuki@misuzilla.org>
 *
 * License: MIT License.
 */
function _Misuzilla_GadgetDebugHelper_JSONUtil () {};
_Misuzilla_GadgetDebugHelper_JSONUtil.prototype = {
    /**
     * @private
     * @param {String} s
     * @return {String}
     */
    escapeJson : function (s) {
        return s.replace(/\\/g, '\\\\').replace(/"/g, '\"').replace(/\n/g, '\n');
    },
    /**
     * @public
     * @param {Object} o Object
     * @return {String} JSON string
     */
    getJsonString : function (o) {
        switch (typeof(o)) {
            case 'string':
                return "\""+ this.escapeJson(o) + "\"";
                break;
            case 'number':
            case 'boolean':
                return o.toString();
                break;
            case 'object':
                if (Array.prototype.isPrototypeOf(o)) {
                    var arrItems = [];
                    for (var i = 0, n = o.length; i < n; i++) {
                        arrItems.push(this.getJsonString(o[i]));
                    }
                    return "[" + arrItems.join(',') + "]";
                } else if (Date.prototype.isPrototypeOf(o)) {
                    return "\""+ o.toString() + "\"";
                } else {
                    var objRepr = "";
                    for (var prop in o) {
                        if (!o.hasOwnProperty(prop))
                            continue;                
                        objRepr += '"' + this.escapeJson(prop) +'":'+ this.getJsonString(o[prop]) + ",";
                    }
                    objRepr = objRepr.replace(/,$/, '');
                    return "{"+objRepr+"}";
                }
                break;
        }
    },
    
    /**
     * @public
     * @param {String} json JSON string
     * @return {Object} Deserialized object
     */
    fromJsonString : function (json) {
        var o;
        try {
            eval("o = " + json);
        } catch (e) {}
        return o;
    }
};

if (window.DEBUG == undefined || window.DEBUG) {
    Debug.startUp();
}

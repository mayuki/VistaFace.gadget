/*
 * JSONUtil
 * 
 * $_Id: JSONUtil.js 182 2007-02-10 07:03:47Z mayuki $
 * Copyright (C) 2007 Mayuki Sawatari <mayuki@misuzilla.org>
 *
 * License: MIT License.
 */
 
function _JSONUtil () {};
_JSONUtil.prototype = {
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
var JSONUtil = new _JSONUtil();
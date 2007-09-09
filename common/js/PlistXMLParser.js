/*
 * PlistXMLParser
 * 
 * $Id$
 * Copyright (C) 2007 Mayuki Sawatari <mayuki@misuzilla.org>
 *
 * License: MIT License.
 */
 
// http://www.apple.com/DTDs/PropertyList-1.0.dtd
function _PlistXMLParser() {};
_PlistXMLParser.prototype = {
    fromXMLDocument : function (plistXmlDoc) {
        var plistChild = plistXmlDoc.documentElement.firstChild;
        return this.toObject(plistChild);
    },

    toObject : function (node) {
        switch (node.tagName) {
            case 'dict':
                return this.dictNode(node);
                break;
            case 'array':
                return this.arrayNode(node);
                break;
            case 'string':
                return node.firstChild.nodeValue;
                break;
            case 'true':
                return true;
                break;
            case 'false':
                return false;
                break;
            case 'real':
                return parseFloat(node.firstChild.nodeValue);
                break;
            case 'integer':
                return parseInt(node.firstChild.nodeValue);
                break;
                
            case 'date':
            case 'data':
            // TODO:
                return node.firstChild.nodeValue;
                break;
        }
    },
    
    dictNode : function (dictNode) {
        var obj = {};
        var keyNodes = dictNode.selectNodes("key");
        for (var i = 0, n = keyNodes.length; i < n; i++) {
            obj[keyNodes[i].firstChild.nodeValue] = this.toObject(keyNodes[i].nextSibling);
        }
        
        return obj;
    },
    
    arrayNode : function (arrayNode) {
        var array = [];
        var arrayItems = arrayNode.childNodes;
        for (var i = 0, n = arrayItems.length; i < n; i++) {
            array.push(this.toObject(arrayItems[i]));
        }    
        return array;
    }
};
var PlistXMLParser = new _PlistXMLParser();
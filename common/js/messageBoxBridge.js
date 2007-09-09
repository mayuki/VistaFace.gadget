/*
 * MessageBoxBridge
 * 
 * $Id$
 * Copyright © 2007 Mayuki Sawatari <mayuki@misuzilla.org>
 *
 * License: MIT License.
 */
 var MessageBox = {
    install : function () {
        document.write("\
            <script type='text/vbscript'>\n\
                Public Function dialogBridgeInternalShowMessageBox_1(prompt, buttons, title)\n\
                    dialogBridgeInternalShowMessageBox_1 = MsgBox(prompt, buttons, title)\n\
                End Function\n\
            </script>\
        ");
    }
    , show : function (prompt, title, buttons) {
        return dialogBridgeInternalShowMessageBox_1(prompt
                                            , (buttons ? buttons : (MessageBoxButtons.OK) )
                                            , (title   ? title : document.title));
    }
};
var MessageBoxButtons = {
      OK               : 0
    , OKCancel         : 1
    , AbortRetryIgnore : 2
    , YesNoCancel      : 3
    , YesNo            : 4
    , RetryCancel      : 5
};
var MessageBoxDefaultButtons = {
      Button1 : 0
    , Button2 : 256
    , Button3 : 512
    , Button4 : 768
};
var MessageBoxIcons = {
      Asterisk    : 64 /* Information */
    , Error       : 16
    , Exclamation : 48
    , Hand        : 16 /*Error*/
    , Information : 64
    , None        : 0
    , Question    : 32
    , Stop        : 16 /*Error*/
    , Warning     : 48 /*Exclamation*/
};
var DialogResult = {
      None   : 0
    , OK     : 1
    , Cancel : 2
    , Abort  : 3
    , Retry  : 4
    , Ignore : 5
    , Yes    : 6
    , No     : 7
};

MessageBox.install();

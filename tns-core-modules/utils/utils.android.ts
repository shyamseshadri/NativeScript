﻿import { enabled as traceEnabled, write as traceWrite, categories as traceCategories, 
    messageType as traceMessageType, notifyEvent as traceNotifyEvent, isCategorySet } from "trace";

export * from "./utils-common";

// We are using "ad" here to avoid namespace collision with the global android object
export module ad {

    export function setTextDecoration(view: android.widget.TextView, value: string) {
        var flags = 0;

        var values = (value + "").split(" ");

        if (values.indexOf("underline") !== -1) {
            flags = flags | android.graphics.Paint.UNDERLINE_TEXT_FLAG;
        }

        if (values.indexOf("line-through") !== -1) {
            flags = flags | android.graphics.Paint.STRIKE_THRU_TEXT_FLAG;
        }

        if (values.indexOf("none") === -1) {
            view.setPaintFlags(flags);
        } else {
            view.setPaintFlags(0);
        }
    }

    export function setTextTransform(v, value: string) {
        let view = v._nativeView;
        let str = view.getText() + "";
        let result = getTransformedString(value, view, str);

        if (v.formattedText) {
            for (var i = 0; i < v.formattedText.spans.length; i++) {
                var span = v.formattedText.spans.getItem(i);
                span.text = getTransformedString(value, view, span.text);
            }
        } else {
            view.setText(result);
        }
    }

    export function getTransformedString(textTransform: string, view, stringToTransform: string): string {
        let result: string;

        switch (textTransform) {
            case "uppercase":
                view.setTransformationMethod(null);
                result = stringToTransform.toUpperCase();
                break;

            case "lowercase":
                view.setTransformationMethod(null);
                result = stringToTransform.toLowerCase();
                break;

            case "capitalize":
                view.setTransformationMethod(null);
                result = getCapitalizedString(stringToTransform);
                break;

            case "none":
            default:
                result = view["originalString"] || stringToTransform;
                if (view["transformationMethod"]) {
                    view.setTransformationMethod(view["transformationMethod"]);
                }
                break;
        }

        if (!view["originalString"]) {
            view["originalString"] = stringToTransform;
            view["transformationMethod"] = view.getTransformationMethod();
        }

        return result;
    }

    function getCapitalizedString(str: string): string {
        var words = str.split(" ");
        var newWords = [];
        for (let i = 0; i < words.length; i++) {
            let word = words[i].toLowerCase();
            newWords.push(word.substr(0, 1).toUpperCase() + word.substring(1));
        }

        return newWords.join(" ");
    }

    export function setWhiteSpace(view: android.widget.TextView, value: string) {
        let nowrap = value === "nowrap";
        view.setSingleLine(nowrap);
        view.setEllipsize(nowrap ? android.text.TextUtils.TruncateAt.END : null);
    }

    let nativeApp: android.app.Application;
    declare var com;
    export function getApplication() {
        if (!nativeApp) {
            // check whether the com.tns.NativeScriptApplication type exists
            if (com.tns.NativeScriptApplication) {
                nativeApp = com.tns.NativeScriptApplication.getInstance();
            }

            // the getInstance might return null if com.tns.NativeScriptApplication exists but is  not the starting app type
            if (!nativeApp) {
                // check whether application.android.init has been explicitly called
                let application = require("application");
                nativeApp = application.android.nativeApp;

                if (!nativeApp) {
                    // TODO: Should we handle the case when a custom application type is provided and the user has not explicitly initialized the application module? 
                    let clazz = java.lang.Class.forName("android.app.ActivityThread");
                    if (clazz) {
                        let method = clazz.getMethod("currentApplication", null);
                        if (method) {
                            nativeApp = method.invoke(null, null);
                        }
                    }
                }
            }

            // we cannot work without having the app instance
            if (!nativeApp) {
                throw new Error("Failed to retrieve native Android Application object. If you have a custom android.app.Application type implemented make sure that you've called the '<application-module>.android.init' method.")
            }
        }

        return nativeApp;
    }
    export function getApplicationContext() {
        let app = getApplication();
        return app.getApplicationContext();
    }

    var inputMethodManager: android.view.inputmethod.InputMethodManager;
    export function getInputMethodManager() {
        if (!inputMethodManager) {
            inputMethodManager = <android.view.inputmethod.InputMethodManager>getApplicationContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        }
        return inputMethodManager;
    }

    export function showSoftInput(nativeView: android.view.View): void {
        var imm = getInputMethodManager();
        if (imm && nativeView instanceof android.view.View) {
            imm.showSoftInput(nativeView, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
        }
    }

    export function dismissSoftInput(nativeView: android.view.View): void {
        var imm = getInputMethodManager();
        if (imm && nativeView instanceof android.view.View) {
            imm.hideSoftInputFromWindow(nativeView.getWindowToken(), 0);
        }
    }

    export module collections {
        export function stringArrayToStringSet(str: string[]): java.util.HashSet<string> {
            var hashSet = new java.util.HashSet<string>();
            if ("undefined" !== typeof str) {
                for (var element in str) {
                    hashSet.add('' + str[element]);
                }
            }
            return hashSet;
        }

        export function stringSetToStringArray(stringSet: any): string[] {
            var arr = [];
            if ("undefined" !== typeof stringSet) {
                var it = stringSet.iterator();
                while (it.hasNext()) {
                    var element = '' + it.next();
                    arr.push(element);
                }
            }

            return arr;
        }
    }

    export module resources {
        var attr;
        var attrCache = new Map<string, number>();

        export function getDrawableId(name) {
            return getId(":drawable/" + name);
        }

        export function getStringId(name) {
            return getId(":string/" + name);
        }

        export function getId(name: string): number {
            var resources = getApplicationContext().getResources();
            var packageName = getApplicationContext().getPackageName();
            var uri = packageName + name;
            return resources.getIdentifier(uri, null, null);
        }

        export function getPalleteColor(name: string, context: android.content.Context): number {
            if (attrCache.has(name)) {
                return attrCache.get(name);
            }

            var result = 0;
            try {
                if (!attr) {
                    attr = java.lang.Class.forName("android.support.v7.appcompat.R$attr")
                }

                let colorID = 0;
                let field = attr.getField(name);
                if (field) {
                    colorID = field.getInt(null);
                }

                if (colorID) {
                    let typedValue = new android.util.TypedValue();
                    context.getTheme().resolveAttribute(colorID, typedValue, true);
                    result = typedValue.data;
                }
            }
            catch (ex) {
                traceWrite("Cannot get pallete color: " + name, traceCategories.Error, traceMessageType.error);
            }

            attrCache.set(name, result);
            return result;
        }
    }
}

export function GC() {
    gc();
}

export function openUrl(location: string): boolean {
    var context = ad.getApplicationContext();
    try {
        var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(location.trim()));
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

        context.startActivity(intent);
    } catch (e) {
        // We Don't do anything with an error.  We just output it
        traceWrite("Error in OpenURL", traceCategories.Error, traceMessageType.error);
        return false;
    }
    return true;
}
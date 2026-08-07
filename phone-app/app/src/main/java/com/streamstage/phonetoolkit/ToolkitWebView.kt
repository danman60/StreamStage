package com.streamstage.phonetoolkit

import android.content.Context
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.webkit.WebView

/**
 * A WebView that refuses the full-screen keyboard. Ported from ../tablet-app/KioskWebView.kt.
 *
 * In landscape, on anything short enough, Android's IME goes into "extract mode" and covers the
 * whole app with its own single-line editor. Measured on the tablet: tapping the film gate's
 * Studio name field replaced the entire kiosk page with a white keyboard panel. A phone in
 * landscape is shorter than that tablet was, so this is MORE likely here, not less.
 *
 * WebView exposes no setting for it, but the EditorInfo it hands the IME passes through here
 * first, so the two "do not take over the screen" flags can be added to it.
 */
class ToolkitWebView(ctx: Context) : WebView(ctx) {

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val ic = super.onCreateInputConnection(outAttrs)
        outAttrs.imeOptions = outAttrs.imeOptions or
            EditorInfo.IME_FLAG_NO_EXTRACT_UI or
            EditorInfo.IME_FLAG_NO_FULLSCREEN
        return ic
    }
}

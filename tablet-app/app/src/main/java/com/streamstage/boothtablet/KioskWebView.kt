package com.streamstage.boothtablet

import android.content.Context
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.webkit.WebView

/**
 * A WebView that refuses the full-screen keyboard.
 *
 * In landscape, on anything short enough, Android's IME goes into "extract mode": it covers
 * the whole app with its own single-line editor. Measured on a 1920x1080 / 320dpi screen,
 * tapping the film gate's Studio name field replaced the entire kiosk page with a white
 * keyboard panel. The visitor's view of what they are typing into — and the gate's own copy —
 * both disappear, on the one surface of this booth that captures a lead.
 *
 * WebView exposes no setting for this, but the EditorInfo it hands the IME passes through
 * here first, so the two "do not take over the screen" flags can be added to it.
 */
class KioskWebView(ctx: Context) : WebView(ctx) {

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val ic = super.onCreateInputConnection(outAttrs)
        outAttrs.imeOptions = outAttrs.imeOptions or
            EditorInfo.IME_FLAG_NO_EXTRACT_UI or
            EditorInfo.IME_FLAG_NO_FULLSCREEN
        return ic
    }
}

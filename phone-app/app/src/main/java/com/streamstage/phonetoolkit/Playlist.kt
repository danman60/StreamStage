package com.streamstage.phonetoolkit

import android.content.Context

/**
 * THE ORDER DANIEL DRAGGED THE FILMS INTO — remembered across app restarts.
 *
 * The film LIST is never stored: it is whatever `GET /films` says is on the laptop's disk right
 * now, every time (see [KioskBus.films]). Storing a list would mean a film rendered onto the laptop
 * this morning does not appear until someone clears app data — the exact class of bug this project
 * has been bitten by before.
 *
 * What IS stored is only the ORDER, as a list of ids. It is applied to whatever the server reports:
 *
 *   - ids that are still on disk come first, in the saved order
 *   - anything new the laptop has grown since — a film rendered overnight — falls in after them,
 *     in the server's own order, so it is visible rather than silently missing
 *   - ids that have disappeared from disk are dropped on the next save
 *
 * That ordering rule is deliberately the SAME rule the TV is asked to apply to a `playlist`
 * message (BUS-CONTRACT.md §2.4: named ids first, everything else keeps its relative order after).
 * One rule in two places beats two rules that drift.
 */
class Playlist(ctx: Context) {

    private val prefs = ctx.getSharedPreferences(HostStore.PREFS, Context.MODE_PRIVATE)

    /** The saved order, or empty when he has never dragged anything. */
    fun savedOrder(): List<String> =
        prefs.getString(KEY, null)
            ?.split(SEP)
            ?.filter { it.isNotBlank() }
            ?: emptyList()

    fun save(order: List<String>) {
        prefs.edit().putString(KEY, order.joinToString(SEP)).apply()
        Diag.i("playlist order saved: ${order.joinToString(", ")}")
    }

    fun clear() = prefs.edit().remove(KEY).apply()

    /**
     * Apply the saved order to what the server actually has. See the class note for the rule.
     * Films the laptop has that were never ordered keep the server's order, at the end.
     */
    fun apply(films: List<KioskBus.Film>): List<KioskBus.Film> {
        val order = savedOrder()
        if (order.isEmpty()) return films
        val byId = films.associateBy { it.id }
        val out = ArrayList<KioskBus.Film>(films.size)
        for (id in order) byId[id]?.let { out.add(it) }
        val placed = out.mapTo(HashSet()) { it.id }
        for (f in films) if (!placed.contains(f.id)) out.add(f)
        if (out.size != films.size) {
            // Cannot happen with the logic above, but a console that silently loses a film is a
            // console that loses the demo. Fail loud and fall back to the server's own order.
            Diag.e("playlist ordering lost films (${films.size} -> ${out.size}); using server order")
            return films
        }
        return out
    }

    private companion object {
        const val KEY = "kiosk_playlist_order"
        const val SEP = ""      // unit separator: cannot appear in a media basename
    }
}

package com.streamstage.boothloop.show

import kotlin.random.Random

data class DrawEntry(val email: String, val capturedAtIso: String, val consent: Boolean)

data class DrawResult(val winner: DrawEntry?, val auditLine: String, val eligibleCount: Int)

object PrizeDraw {
    fun pick(entries: List<DrawEntry>, seed: Long): DrawResult {
        val filtered = entries
            .filter { it.consent }
            .groupBy { it.email.lowercase() }
            .map { (_, group) ->
                group.minByOrNull { it.capturedAtIso }!!
            }
            .sortedBy { it.email }

        val eligibleCount = filtered.size

        return if (eligibleCount == 0) {
            DrawResult(null, "draw seed=$seed eligible=0 winner=", 0)
        } else {
            val random = Random(seed)
            val winner = filtered[random.nextInt(eligibleCount)]
            DrawResult(
                winner,
                "draw seed=$seed eligible=$eligibleCount winner=${winner.email}",
                eligibleCount
            )
        }
    }
}

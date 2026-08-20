package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Calgary's prize draw has no record anywhere. Zero of 41 lead emails mention a prize, draw or
 * winner, and the winner's name was owed to the organiser by a hard 4:00 PM deadline. The pick is
 * seeded so the same entries and the same seed always produce the same winner: a draw that can be
 * re-run in front of an organiser is the whole point.
 */
class PrizeDrawTest {
    private fun entry(email: String, consent: Boolean = true) =
        DrawEntry(email, "2026-08-11T10:07:00-06:00", consent)

    private val three = listOf(entry("a@gmail.com"), entry("b@gmail.com"), entry("c@gmail.com"))

    @Test fun picksAWinnerFromTheEligible() {
        val r = PrizeDraw.pick(three, seed = 42L)
        assertNotNull(r.winner)
        assertTrue(three.contains(r.winner))
        assertEquals(3, r.eligibleCount)
    }

    @Test fun isReproducibleForTheOrganiser() {
        assertEquals(
            PrizeDraw.pick(three, seed = 42L).winner,
            PrizeDraw.pick(three, seed = 42L).winner,
        )
    }

    @Test fun excludesEntriesWithoutConsent() {
        val mixed = listOf(entry("yes@gmail.com"), entry("no@gmail.com", consent = false))
        val r = PrizeDraw.pick(mixed, seed = 1L)
        assertEquals(1, r.eligibleCount)
        assertEquals("yes@gmail.com", r.winner!!.email)
    }

    @Test fun deduplicatesTheSamePersonEnteringTwice() {
        val dupes = listOf(entry("a@gmail.com"), entry("a@gmail.com"), entry("b@gmail.com"))
        assertEquals(2, PrizeDraw.pick(dupes, seed = 1L).eligibleCount)
    }

    @Test fun anEmptyDrawHasNoWinnerAndSaysSo() {
        val r = PrizeDraw.pick(emptyList(), seed = 1L)
        assertNull(r.winner)
        assertEquals(0, r.eligibleCount)
        assertTrue(r.auditLine.contains("0"))
    }

    @Test fun theAuditLineCarriesSeedCountAndWinner() {
        val r = PrizeDraw.pick(three, seed = 42L)
        assertTrue(r.auditLine.contains("42"))
        assertTrue(r.auditLine.contains("3"))
        assertTrue(r.auditLine.contains(r.winner!!.email))
    }
}

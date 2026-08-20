package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Every incident during Calgary was found by walking to the booth. The data already exists in
 * Diag.kt and Discovery.kt; nothing renders it as an answer. This is the pure view model only,
 * which is why it takes nowEpochMs as a parameter: a view model that reads the clock cannot be
 * tested.
 */
class ShowHealthTest {
    private val now = 1_754_920_000_000L

    private fun input(
        host: String? = "192.168.1.11:8180",
        queued: Int = 0,
        lastFlushEpochMs: Long? = now - 60_000L,
        state: ShowState = ShowState.LIVE,
    ) = HealthInput(host, queued, lastFlushEpochMs, state)

    private fun valueOf(lines: List<HealthLine>, label: String) =
        lines.first { it.label == label }.value

    @Test fun namesTheHostThatIsAnswering() {
        assertEquals("192.168.1.11:8180", valueOf(ShowHealth.lines(input(), now), "Host"))
    }

    @Test fun aMissingHostIsAlarming() {
        val line = ShowHealth.lines(input(host = null), now).first { it.label == "Host" }
        assertTrue(line.alarming)
    }

    @Test fun reportsQueueDepth() {
        assertEquals("0", valueOf(ShowHealth.lines(input(), now), "Queued"))
        assertEquals("7", valueOf(ShowHealth.lines(input(queued = 7), now), "Queued"))
    }

    @Test fun anEmptyQueueIsNotAlarming() {
        assertFalse(ShowHealth.lines(input(queued = 0), now).first { it.label == "Queued" }.alarming)
    }

    @Test fun aRecentFlushIsNotAlarming() {
        val l = ShowHealth.lines(input(lastFlushEpochMs = now - 60_000L), now)
        assertFalse(l.first { it.label == "Last flush" }.alarming)
    }

    @Test fun aStaleFlushIsAlarming() {
        // Over 15 minutes with leads queued means the bridge is not moving.
        val l = ShowHealth.lines(input(queued = 3, lastFlushEpochMs = now - 16 * 60_000L), now)
        assertTrue(l.first { it.label == "Last flush" }.alarming)
    }

    @Test fun neverFlushedSaysSoRatherThanShowingAnEpoch() {
        val v = valueOf(ShowHealth.lines(input(lastFlushEpochMs = null), now), "Last flush")
        assertTrue(v.lowercase().contains("never"))
        assertFalse(v.contains("1970"))
    }

    @Test fun reportsShowState() {
        assertEquals("LIVE", valueOf(ShowHealth.lines(input(), now), "Show"))
    }

    @Test fun alwaysReturnsAllFourLinesInOrder() {
        val labels = ShowHealth.lines(input(), now).map { it.label }
        assertEquals(listOf("Show", "Host", "Queued", "Last flush"), labels)
    }
}

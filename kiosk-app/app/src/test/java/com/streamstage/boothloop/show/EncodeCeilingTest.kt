package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A 2.6 Mbps encode froze DART on stage mid-talk on 2026-08-11; 1.2 Mbps played. The film that
 * would freeze the screen has to be refused when it enters the library, not discovered in front
 * of a room.
 */
class EncodeCeilingTest {
    @Test fun acceptsTheEncodeThatPlayed() {
        assertTrue(EncodeCeiling.check(1200, "robot-wall.mp4").accepted)
    }

    @Test fun acceptsExactlyTheCeiling() {
        assertTrue(EncodeCeiling.check(BITRATE_CEILING_KBPS, "edge.mp4").accepted)
    }

    @Test fun refusesTheEncodeThatFroze() {
        val v = EncodeCeiling.check(2600, "robot-wall.mp4")
        assertFalse(v.accepted)
        assertTrue(v.reason!!.contains("robot-wall.mp4"))
        assertTrue(v.reason!!.contains("2600"))
        assertTrue(v.reason!!.contains("1557"))
    }

    @Test fun refusesOneKbpsOver() {
        assertFalse(EncodeCeiling.check(BITRATE_CEILING_KBPS + 1, "edge.mp4").accepted)
    }

    @Test fun refusesAnUnknownBitrate() {
        // ffprobe could not read it. Unknown is not permission.
        val v = EncodeCeiling.check(0, "mystery.mp4")
        assertFalse(v.accepted)
        assertTrue(v.reason!!.contains("mystery.mp4"))
    }

    @Test fun acceptedVerdictCarriesNoReason() {
        assertEquals(null, EncodeCeiling.check(900, "fine.mp4").reason)
    }
}

package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Ten Calgary tablet rows are keyboard mash, and one real studio's email landed in the studio-name
 * field, which made the hottest lead of the show invisible until it was reconstructed by hand.
 * One contract, validated at every entry point, is the fix for all of it.
 */
class LeadValidatorTest {
    private fun raw(email: String?, channel: String = Channel.BOOTH_TABLET) = RawLead(
        email = email,
        studio = null,
        name = null,
        phone = null,
        channel = channel,
        deviceId = "tablet-1",
        capturedAtIso = "2026-08-11T10:07:00-06:00",
        noteText = null,
    )

    @Test fun acceptsAPlainRealAddress() {
        val v = LeadValidator.validate(raw("rosiepunzo@gmail.com"))
        assertTrue(v.ok)
        assertTrue(v.rejects.isEmpty())
        assertEquals("rosiepunzo@gmail.com", v.normalisedEmail)
    }

    @Test fun lowercasesAndTrims() {
        val v = LeadValidator.validate(raw("  Rosie.Punzo@GMAIL.com "))
        assertEquals("rosie.punzo@gmail.com", v.normalisedEmail)
    }

    @Test fun refusesMissingEmail() {
        val v = LeadValidator.validate(raw(null))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.EMAIL_MISSING))
    }

    @Test fun refusesKeyboardMash() {
        // Both are real rows from the Calgary record.
        assertFalse(LeadValidator.validate(raw("dd@hjj.com")).ok)
        assertFalse(LeadValidator.validate(raw("ghh@fff.com")).ok)
    }

    @Test fun refusesRepeatedCharacterRun() {
        val v = LeadValidator.validate(raw("aaaa@gmail.com"))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.EMAIL_REPEATED_CHARACTER_RUN))
    }

    @Test fun refusesAnUnknownChannel() {
        val v = LeadValidator.validate(raw("rosiepunzo@gmail.com", channel = "carrier_pigeon"))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.CHANNEL_UNKNOWN))
    }

    @Test fun refusesABareUtcTimestamp() {
        val lead = raw("rosiepunzo@gmail.com").copy(capturedAtIso = "2026-08-11T16:07:00Z")
        val v = LeadValidator.validate(lead)
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.CAPTURED_AT_MISSING_OFFSET))
    }

    @Test fun suggestsWithoutApplying() {
        // The Steppin' Up failure: a real domain typo with valid MX that still hard bounces.
        val v = LeadValidator.validate(raw("steppinupdanceco@outlook.co"))
        assertEquals("steppinupdanceco@outlook.com", v.suggestion)
        assertEquals("steppinupdanceco@outlook.co", v.normalisedEmail)
    }
}

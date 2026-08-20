package com.streamstage.boothloop.show

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * One digest of decisions at end of show, not one item per lead: 22 items is noise. The PA owns
 * the follow-up queue and every send decision, so this renders what was captured and nothing else.
 * It proposes no follow-up and drafts no email.
 */
class DigestRendererTest {
    private fun lead(email: String, channel: String, test: Boolean = false, note: String? = null) =
        RawLead(
            email = email, studio = null, name = null, phone = null,
            channel = channel, deviceId = "tablet-1",
            capturedAtIso = "2026-08-11T10:07:00-06:00", noteText = note, isTest = test,
        )

    private val leads = listOf(
        lead("a@gmail.com", Channel.BOOTH_TABLET),
        lead("b@gmail.com", Channel.TALK_QR, note = "wants a content day"),
        lead("t@test.com", Channel.BOOTH_TABLET, test = true),
    )

    @Test fun countsRealLeadsAndExcludesTests() {
        val out = DigestRenderer.render("Calgary CDTE day 2", leads, null)
        assertTrue(out.contains("2"))
        assertFalse(out.contains("t@test.com"))
    }

    @Test fun namesTheShow() {
        assertTrue(
            DigestRenderer.render("Calgary CDTE day 2", leads, null).contains("Calgary CDTE day 2")
        )
    }

    @Test fun breaksDownByChannel() {
        val out = DigestRenderer.render("s", leads, null)
        assertTrue(out.contains(Channel.BOOTH_TABLET))
        assertTrue(out.contains(Channel.TALK_QR))
    }

    @Test fun surfacesNotes() {
        assertTrue(DigestRenderer.render("s", leads, null).contains("wants a content day"))
    }

    @Test fun includesTheDrawAuditWhenThereIsOne() {
        val out = DigestRenderer.render("s", leads, "seed=42 eligible=3 winner=a@gmail.com")
        assertTrue(out.contains("seed=42"))
    }

    @Test fun aShowWithNoLeadsSaysSoRatherThanRenderingNothing() {
        val out = DigestRenderer.render("Empty show", emptyList(), null)
        assertTrue(out.contains("Empty show"))
        assertTrue(out.contains("0"))
    }

    @Test fun neverDraftsClientEmail() {
        val out = DigestRenderer.render("s", leads, null).lowercase()
        assertFalse(out.contains("dear "))
        assertFalse(out.contains("subject:"))
    }
}

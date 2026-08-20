package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Why a typo table and not an MX lookup: `dig MX outlook.co` answers
 * `nam.olc.protection.outlook.com`. Microsoft owns the typo domain, so it has valid MX, accepts
 * mail and hard bounces it. A live MX check would NOT have caught the Steppin' Up failure. This
 * table does, and it works on the booth LAN with no internet, which is the network the booth is
 * designed for.
 */
class TypoDomainsTest {
    @Test fun catchesTheSteppinUpFailure() {
        assertEquals(
            "steppinupdanceco@outlook.com",
            TypoDomains.suggestFor("steppinupdanceco@outlook.co"),
        )
    }

    @Test fun catchesCommonGmailTypos() {
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmial.com"))
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmai.com"))
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmail.co"))
    }

    @Test fun catchesHotmailAndYahooTypos() {
        assertEquals("a@hotmail.com", TypoDomains.suggestFor("a@hotmai.com"))
        assertEquals("a@yahoo.com", TypoDomains.suggestFor("a@yaho.com"))
    }

    @Test fun leavesAGoodAddressAlone() {
        assertNull(TypoDomains.suggestFor("rosiepunzo@gmail.com"))
        assertNull(TypoDomains.suggestFor("info@muskokadance.ca"))
    }

    @Test fun toleratesRubbishInput() {
        assertNull(TypoDomains.suggestFor(null))
        assertNull(TypoDomains.suggestFor(""))
        assertNull(TypoDomains.suggestFor("no-at-sign"))
    }

    @Test fun isCaseInsensitive() {
        assertEquals("a@gmail.com", TypoDomains.suggestFor("A@GMIAL.COM"))
    }
}

package com.streamstage.boothloop.show

import org.json.JSONObject

/**
 * The one place the booth's shared shapes live. Every file in this package imports from here and
 * none of them redefine any of it. A per-file builder cannot see its peers, so this file is the
 * only way they can agree.
 *
 * Nothing here touches android.* on purpose: it keeps the compile gate fast and the logic testable
 * on the JVM.
 */

/** Where a person entered from. Open-ended by design so the attract game can add a lane later. */
object Channel {
    const val BOOTH_TABLET = "booth_tablet"
    const val TALK_QR = "talk_qr"
    const val BOOTH_TV = "booth_tv"
    const val CHECKLIST = "checklist"
    const val DNYC = "dnyc"
    const val WEBSITE = "website"
    const val GAME = "game"

    val ALL = setOf(BOOTH_TABLET, TALK_QR, BOOTH_TV, CHECKLIST, DNYC, WEBSITE, GAME)
}

/** What posture the app is in. Spec section 10 pattern 3: one posture derives every safety default. */
enum class Posture {
    REHEARSAL,
    LIVE;

    /** Production writes are an explicit opt-in. Fabricated leads reached the live inbox twice. */
    val mayWriteProduction: Boolean get() = this == LIVE
}

/** A show is a run inside a booth campaign. Arm, live, close: the primitive v1 hangs off. */
enum class ShowState { ARMED, LIVE, CLOSED }

/**
 * One captured person, before validation. Free text as typed, nothing normalised, nothing invented.
 * Absent is null. Absent is never a placeholder: a synthesised studio name arrives in the CRM
 * looking exactly like something the visitor typed.
 */
data class RawLead(
    val email: String?,
    val studio: String?,
    val name: String?,
    val phone: String?,
    val channel: String,
    val deviceId: String?,
    val capturedAtIso: String?,
    val noteText: String?,
    val isTest: Boolean = false,
)

/** The reason a lead was refused. One per rule, so the tablet can say which box is wrong. */
enum class LeadReject {
    EMAIL_MISSING,
    EMAIL_MALFORMED,
    EMAIL_LOCAL_TOO_SHORT,
    EMAIL_REPEATED_CHARACTER_RUN,
    EMAIL_NO_VOWEL_IN_LOCAL,
    CHANNEL_UNKNOWN,
    CAPTURED_AT_MISSING_OFFSET,
}

/**
 * The result of validating one [RawLead]. [suggestion] is a "did you mean" for a known typo domain
 * and is NEVER applied automatically: the visitor is standing there and can confirm it themselves.
 */
data class LeadVerdict(
    val ok: Boolean,
    val rejects: List<LeadReject>,
    val normalisedEmail: String?,
    val suggestion: String?,
)

/** Timestamps are event-local WITH offset, never bare UTC. */
const val ISO_OFFSET_PATTERN = "yyyy-MM-dd'T'HH:mm:ssXXX"

/** DART's measured playback ceiling. 2.6 Mbps froze it mid-talk; 1.2 Mbps played. */
const val BITRATE_CEILING_KBPS = 1557

/** Every automatic lead-to-audio join carries one of these plus its basis. */
enum class MatchConfidence { CONFIRMED, PROBABLE, CANDIDATE }

/** Convenience for the pure files: build a JSONObject without importing android.* anywhere. */
fun jsonOf(vararg pairs: Pair<String, Any?>): JSONObject {
    val o = JSONObject()
    for ((k, v) in pairs) o.put(k, v ?: JSONObject.NULL)
    return o
}

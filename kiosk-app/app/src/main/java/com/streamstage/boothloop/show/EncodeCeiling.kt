package com.streamstage.boothloop.show

data class CeilingVerdict(val accepted: Boolean, val reason: String?)

object EncodeCeiling {
    fun check(kbps: Int, name: String): CeilingVerdict {
        return when {
            kbps <= 0 -> {
                CeilingVerdict(false, "$name bitrate could not be read")
            }
            kbps <= BITRATE_CEILING_KBPS -> {
                CeilingVerdict(true, null)
            }
            else -> {
                CeilingVerdict(
                    false,
                    "$name is $kbps kbps, over the ${BITRATE_CEILING_KBPS} kbps ceiling that plays on the booth TV"
                )
            }
        }
    }
}

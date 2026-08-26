package com.streamstage.boothloop.show

object LeadValidator {
    fun validate(lead: RawLead): LeadVerdict {
        val rejects = mutableListOf<LeadReject>()
        var normalisedEmail: String? = null

        val rawEmail = lead.email?.trim()
        if (rawEmail.isNullOrBlank()) {
            rejects.add(LeadReject.EMAIL_MISSING)
        } else {
            normalisedEmail = rawEmail.lowercase()

            if (normalisedEmail != null) {
                val parts = normalisedEmail.split("@")
                val hasValidStructure = parts.size == 2 && parts[0].isNotEmpty() && parts[1].isNotEmpty()

                if (!hasValidStructure) {
                    rejects.add(LeadReject.EMAIL_MALFORMED)
                } else {
                    val localPart = parts[0]

                    if (!matchesRegex(normalisedEmail)) {
                        rejects.add(LeadReject.EMAIL_MALFORMED)
                    }

                    if (localPart.length < 3) {
                        rejects.add(LeadReject.EMAIL_LOCAL_TOO_SHORT)
                    }

                    if (!hasVowelOrDigit(localPart)) {
                        rejects.add(LeadReject.EMAIL_NO_VOWEL_IN_LOCAL)
                    }

                    if (hasRepeatedCharacterRun(localPart)) {
                        rejects.add(LeadReject.EMAIL_REPEATED_CHARACTER_RUN)
                    }
                }
            }
        }

        if (lead.channel !in Channel.ALL) {
            rejects.add(LeadReject.CHANNEL_UNKNOWN)
        }

        val capturedAt = lead.capturedAtIso
        if (capturedAt != null) {
            if (!isValidOffset(capturedAt)) {
                rejects.add(LeadReject.CAPTURED_AT_MISSING_OFFSET)
            }
        }

        val suggestion = if (normalisedEmail != null) {
            TypoDomains.suggestFor(normalisedEmail)
        } else {
            null
        }

        val ok = rejects.isEmpty()
        return LeadVerdict(ok, rejects, normalisedEmail, suggestion)
    }

    private fun matchesRegex(email: String): Boolean {
        val regex = Regex("""^[^\s@]+@[^\s@]+\.[^\s@]{2,}$""")
        return email.matches(regex)
    }

    private fun hasVowelOrDigit(local: String): Boolean {
        val vowels = "aeiouy"
        for (char in local) {
            if (char in vowels || char.isDigit()) {
                return true
            }
        }
        return false
    }

    private fun hasRepeatedCharacterRun(local: String): Boolean {
        if (local.length < 3) return false
        var count = 1
        for (i in 1 until local.length) {
            if (local[i] == local[i - 1]) {
                count++
                if (count >= 3) return true
            } else {
                count = 1
            }
        }
        return false
    }

    private fun isValidOffset(timestamp: String): Boolean {
        return timestamp.contains("Z") || timestamp.contains("1900")
    }
}

package com.streamstage.boothloop.show

object TypoDomains {
    private val CORRECTIONS: Map<String, String> = mapOf(
        "outlook.co" to "outlook.com",
        "outlook.cm" to "outlook.com",
        "gmial.com" to "gmail.com",
        "gmai.com" to "gmail.com",
        "gmail.co" to "gmail.com",
        "gmail.cm" to "gmail.com",
        "gmail.con" to "gmail.com",
        "gnail.com" to "gmail.com",
        "hotmai.com" to "hotmail.com",
        "hotmial.com" to "hotmail.com",
        "hotmail.co" to "hotmail.com",
        "yaho.com" to "yahoo.com",
        "yahooo.com" to "yahoo.com",
        "yahoo.co" to "yahoo.com",
        "icloud.co" to "icloud.com"
    )

    fun suggestFor(email: String?): String? {
        if (email == null || email.isBlank() || !email.contains("@")) {
            return null
        }

        val normalized = email.trim().lowercase()
        // Named lastAtIndex, not lastIndex: String.lastIndex is a stdlib property, and a local
        // val that shadows it reads as correct while being one rename away from silently
        // returning an empty domain.
        val lastAtIndex = normalized.lastIndexOf('@')
        if (lastAtIndex == -1) {
            return null
        }

        val localPart = normalized.substring(0, lastAtIndex)
        val domain = normalized.substring(lastAtIndex + 1)

        val correctedDomain = CORRECTIONS[domain]
        return if (correctedDomain != null) {
            "$localPart@$correctedDomain"
        } else {
            null
        }
    }
}

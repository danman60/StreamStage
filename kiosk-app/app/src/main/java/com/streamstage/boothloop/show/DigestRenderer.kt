package com.streamstage.boothloop.show

object DigestRenderer {
    fun render(showName: String, leads: List<RawLead>, drawAudit: String?): String {
        val nonTestLeads = leads.filter { !it.isTest }
        val count = nonTestLeads.size

        val sb = StringBuilder()
        sb.append("## $showName\n")
        sb.append("$count\n")

        val channelMap = nonTestLeads
            .groupBy { it.channel }
            .mapValues { it.value.size }

        for ((channel, count) in channelMap) {
            sb.append("- $channel: $count\n")
        }

        val notes = nonTestLeads
            .filter { !it.noteText.isNullOrBlank() }
            .map { "${it.email}: ${it.noteText}" }

        if (notes.isNotEmpty()) {
            sb.append("Notes:\n")
            for (note in notes) {
                sb.append("- $note\n")
            }
        }

        if (drawAudit != null) {
            sb.append(drawAudit)
            if (!drawAudit.endsWith("\n")) {
                sb.append("\n")
            }
        }

        return sb.toString().trimEnd()
    }
}

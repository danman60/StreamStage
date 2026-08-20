package com.streamstage.boothloop.show



data class HealthInput(
    val host: String?,
    val queued: Int,
    val lastFlushEpochMs: Long?,
    val state: ShowState,
)

data class HealthLine(val label: String, val value: String, val alarming: Boolean)

object ShowHealth {
    fun lines(input: HealthInput, nowEpochMs: Long): List<HealthLine> {
        val showLine = HealthLine(
            label = "Show",
            value = input.state.name,
            alarming = input.state == ShowState.CLOSED && input.queued > 0
        )

        val hostLine = HealthLine(
            label = "Host",
            value = input.host ?: "none",
            alarming = input.host == null
        )

        val queuedLine = HealthLine(
            label = "Queued",
            value = input.queued.toString(),
            alarming = input.queued > 25
        )

        val lastFlushLine = {
            val isNever = input.lastFlushEpochMs == null
            val isOverFifteenMinutes = input.lastFlushEpochMs != null &&
                    (nowEpochMs - input.lastFlushEpochMs) > 15 * 60 * 1000

            val value = if (isNever) {
                "never"
            } else {
                val diffMs = nowEpochMs - input.lastFlushEpochMs
                val diffSec = diffMs / 1000
                when {
                    diffSec < 60 -> "just now"
                    diffSec < 3600 -> {
                        val minutes = diffSec / 60
                        "${minutes}m ago"
                    }
                    else -> {
                        val hours = diffSec / 3600
                        val minutes = (diffSec % 3600) / 60
                        "${hours}h ${minutes}m ago"
                    }
                }
            }

            val alarming = (isNever && input.queued > 0) || (isOverFifteenMinutes && input.queued > 0)

            HealthLine(
                label = "Last flush",
                value = value,
                alarming = alarming
            )
        }()

        return listOf(showLine, hostLine, queuedLine, lastFlushLine)
    }
}

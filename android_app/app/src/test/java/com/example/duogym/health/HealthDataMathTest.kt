package com.example.duogym.health

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class HealthDataMathTest {
    @Test
    fun mergedDurationMinutes_deduplicatesOverlappingSources() {
        val start = Instant.parse("2026-06-20T05:00:00Z")
        val intervals = listOf(
            start to start.plusSeconds(30 * 60),
            start.plusSeconds(10 * 60) to start.plusSeconds(50 * 60),
            start.plusSeconds(60 * 60) to start.plusSeconds(75 * 60),
        )

        assertEquals(65, HealthDataMath.mergedDurationMinutes(intervals))
    }

    @Test
    fun mergedDurationMinutes_ignoresInvalidIntervals() {
        val instant = Instant.parse("2026-06-20T05:00:00Z")

        assertEquals(
            0,
            HealthDataMath.mergedDurationMinutes(listOf(instant to instant, instant to instant.minusSeconds(1)))
        )
    }
}

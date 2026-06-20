package com.example.duogym.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.max

internal object HealthDataMath {
    fun mergedDurationMinutes(intervals: List<Pair<Instant, Instant>>): Int {
        val valid = intervals.filter { it.second.isAfter(it.first) }.sortedBy { it.first }
        if (valid.isEmpty()) return 0
        var currentStart = valid.first().first
        var currentEnd = valid.first().second
        var totalSeconds = 0L
        valid.drop(1).forEach { (start, end) ->
            if (!start.isAfter(currentEnd)) {
                if (end.isAfter(currentEnd)) currentEnd = end
            } else {
                totalSeconds += Duration.between(currentStart, currentEnd).seconds
                currentStart = start
                currentEnd = end
            }
        }
        totalSeconds += Duration.between(currentStart, currentEnd).seconds
        return max(0, (totalSeconds / 60).toInt())
    }
}

/** Reads already-deduplicated daily totals from Health Connect. Supabase never polls this layer. */
class HealthConnectRepository(private val context: Context) {
    companion object {
        private const val PROVIDER_PACKAGE = "com.google.android.apps.healthdata"

        val READ_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(FloorsClimbedRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(BodyFatRecord::class),
        )
    }

    private val sdkStatus: Int
        get() = HealthConnectClient.getSdkStatus(context, PROVIDER_PACKAGE)

    private val client: HealthConnectClient?
        get() = if (sdkStatus == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context, PROVIDER_PACKAGE)
        } else null

    suspend fun statusJson(): JSONObject {
        val granted = client?.permissionController?.getGrantedPermissions().orEmpty()
        return JSONObject()
            .put("available", sdkStatus == HealthConnectClient.SDK_AVAILABLE)
            .put("updateRequired", sdkStatus == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
            .put("permissionsGranted", granted.containsAll(READ_PERMISSIONS))
            .put("grantedCount", granted.intersect(READ_PERMISSIONS).size)
            .put("requiredCount", READ_PERMISSIONS.size)
    }

    suspend fun readDay(dateText: String): JSONObject = coroutineScope {
        val hc = client ?: return@coroutineScope errorJson(dateText, "Health Connect is unavailable")
        val granted = hc.permissionController.getGrantedPermissions()
        if (!granted.containsAll(READ_PERMISSIONS)) {
            return@coroutineScope errorJson(dateText, "Health Connect permission is required")
                .put("permissionRequired", true)
        }

        val date = LocalDate.parse(dateText)
        val zone = ZoneId.systemDefault()
        val start = date.atStartOfDay(zone).toInstant()
        val end = date.plusDays(1).atStartOfDay(zone).toInstant()
        val filter = TimeRangeFilter.between(start, end)

        val movement = async {
            hc.aggregate(
                AggregateRequest(
                    metrics = setOf(
                        StepsRecord.COUNT_TOTAL,
                        DistanceRecord.DISTANCE_TOTAL,
                        ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                        FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL,
                    ),
                    timeRangeFilter = filter,
                )
            )
        }
        val exercises = async {
            hc.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, filter)).records
        }
        val sleep = async {
            hc.readRecords(ReadRecordsRequest(SleepSessionRecord::class, filter)).records
        }
        val weights = async {
            hc.readRecords(ReadRecordsRequest(WeightRecord::class, filter)).records
        }
        val bodyFat = async {
            hc.readRecords(ReadRecordsRequest(BodyFatRecord::class, filter)).records
        }

        val totals = movement.await()
        val exerciseRecords = exercises.await()
        val mergedExerciseMinutes = HealthDataMath.mergedDurationMinutes(
            exerciseRecords.map { maxOf(it.startTime, start) to minOf(it.endTime, end) }
        )
        val sleepRecords = sleep.await()
        val sleepMinutes = HealthDataMath.mergedDurationMinutes(
            sleepRecords.map { maxOf(it.startTime, start) to minOf(it.endTime, end) }
        )
        val latestWeight = weights.await().maxByOrNull { it.time }
        val latestBodyFat = bodyFat.await().maxByOrNull { it.time }

        val steps = totals[StepsRecord.COUNT_TOTAL] ?: 0L
        val distanceKm = totals[DistanceRecord.DISTANCE_TOTAL]?.inKilometers
        val activeCalories = totals[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
        val floors = totals[FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL]

        JSONObject()
            .put("ok", true)
            .put("date", dateText)
            .put("source", "health_connect")
            .put("syncedAt", Instant.now().toString())
            .put("zoneId", zone.id)
            .put("steps", steps)
            .putNullable("distanceKm", distanceKm)
            .put("activeMinutes", mergedExerciseMinutes)
            .putNullable("activeCalories", activeCalories)
            .putNullable("floors", floors)
            .put("sleepMinutes", sleepMinutes)
            .put("sleepSessions", sleepRecords.size)
            .putNullable("weightKg", latestWeight?.weight?.inKilograms)
            .putNullable("bodyFatPercent", latestBodyFat?.percentage?.value)
            .put("origins", JSONArray(totals.dataOrigins.map { it.packageName }.sorted()))
    }

    private fun errorJson(date: String, message: String) = JSONObject()
        .put("ok", false)
        .put("date", date)
        .put("message", message)

    private fun JSONObject.putNullable(key: String, value: Any?): JSONObject =
        put(key, value ?: JSONObject.NULL)
}

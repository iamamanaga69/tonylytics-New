package com.example.duogym

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class ChatBackgroundReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        thread {
            ChatBackgroundPoller.pollSupabase(context)
            ChatBackgroundPoller.scheduleNextPoll(context)
        }
    }
}

object ChatBackgroundPoller {
    private const val SUPABASE_URL = "https://jjyfhkkuraqkfjlwzkfw.supabase.co"
    private const val SUPABASE_ANON_KEY = "sb_publishable_qIFkO2NSVVcImNYzKrCWyA_l9ZrKGwX"
    private const val POLL_INTERVAL_MS = 60000L // 1 minute interval

    fun startPolling(context: Context) {
        scheduleNextPoll(context)
    }

    fun scheduleNextPoll(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ChatBackgroundReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            9002,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerAt = SystemClock.elapsedRealtime() + POLL_INTERVAL_MS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                pendingIntent
            )
        } else {
            alarmManager.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                pendingIntent
            )
        }
        android.util.Log.d("ChatBackgroundPoller", "Scheduled next background chat poll in 1 minute")
    }

    fun pollSupabase(context: Context) {
        try {
            val prefs = context.getSharedPreferences("duogym_prefs", Context.MODE_PRIVATE)
            val username = prefs.getString("current_username", null) ?: return
            val lastCheckedTime = prefs.getString("last_checked_message_time", null) ?: run {
                val df = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                df.timeZone = java.util.TimeZone.getTimeZone("UTC")
                val currentUtcTime = df.format(java.util.Date())
                prefs.edit().putString("last_checked_message_time", currentUtcTime).apply()
                return
            }

            val encodedTime = java.net.URLEncoder.encode(lastCheckedTime, "UTF-8")
            val url = URL("$SUPABASE_URL/rest/v1/duogym_chat?receiver=eq.$username&created_at=gt.$encodedTime&order=created_at.asc")
            
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val messages = org.json.JSONArray(responseText)
                
                var latestTime = lastCheckedTime
                for (i in 0 until messages.length()) {
                    val msgObj = messages.getJSONObject(i)
                    val sender = msgObj.optString("sender")
                    val messageText = msgObj.optString("message")
                    val createdAt = msgObj.optString("created_at")

                    val senderDisplay = if (sender == "aman") "Aman" else "Rishit"
                    NotificationHelper.showChatNotification(context, senderDisplay, messageText, username, sender)
                    
                    if (createdAt > latestTime) {
                        latestTime = createdAt
                    }
                }
                
                if (latestTime != lastCheckedTime) {
                    prefs.edit().putString("last_checked_message_time", latestTime).apply()
                }
            }
            conn.disconnect()
        } catch (e: Exception) {
            android.util.Log.e("ChatBackgroundPoller", "Error polling Supabase", e)
        }
    }
}

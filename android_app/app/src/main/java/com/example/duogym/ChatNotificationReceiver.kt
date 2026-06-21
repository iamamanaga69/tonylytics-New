package com.example.duogym

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class ChatNotificationReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_MARK_READ = "com.example.duogym.CHAT_MARK_READ"
        const val ACTION_REPLY = "com.example.duogym.CHAT_REPLY"
        const val KEY_REPLY_TEXT = "key_reply_text"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
        const val EXTRA_REPLY_AS = "reply_as"
        const val EXTRA_REPLY_TO = "reply_to"

        private const val SUPABASE_URL = "https://jjyfhkkuraqkfjlwzkfw.supabase.co"
        private const val SUPABASE_ANON_KEY = "sb_publishable_qIFkO2NSVVcImNYzKrCWyA_l9ZrKGwX"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        when (intent.action) {
            ACTION_MARK_READ -> {
                notificationManager.cancel(notificationId)
            }

            ACTION_REPLY -> {
                val remoteInput = RemoteInput.getResultsFromIntent(intent)
                val replyText =
                    remoteInput?.getCharSequence(KEY_REPLY_TEXT)?.toString()?.trim()
                val replyAs = intent.getStringExtra(EXTRA_REPLY_AS) ?: return
                val replyTo = intent.getStringExtra(EXTRA_REPLY_TO) ?: return

                if (replyText.isNullOrEmpty()) return

                // Show "Sending..." feedback in the notification
                val sendingNotification =
                    NotificationCompat.Builder(context, NotificationHelper.CHAT_CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_email)
                        .setContentTitle("Sending reply…")
                        .setContentText(replyText)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setOngoing(true)
                        .build()
                notificationManager.notify(notificationId, sendingNotification)

                // Send the reply via Supabase REST API on a background thread
                thread {
                    val success = sendMessageToSupabase(replyAs, replyTo, replyText)
                    val resultNotification =
                        NotificationCompat.Builder(context, NotificationHelper.CHAT_CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.ic_dialog_email)
                            .setContentTitle(if (success) "✅ Reply sent" else "❌ Failed to send")
                            .setContentText(replyText)
                            .setPriority(NotificationCompat.PRIORITY_LOW)
                            .setAutoCancel(true)
                            .setTimeoutAfter(4000)
                            .build()
                    notificationManager.notify(notificationId, resultNotification)
                }
            }
        }
    }

    private fun sendMessageToSupabase(
        sender: String,
        receiver: String,
        message: String
    ): Boolean {
        return try {
            val url = URL("$SUPABASE_URL/rest/v1/duogym_chat")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
            conn.setRequestProperty("Prefer", "return=minimal")
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            val jsonMessage = org.json.JSONObject.quote(message)
            val body =
                """{"sender":"$sender","receiver":"$receiver","message":$jsonMessage}"""
            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body)
            writer.flush()
            writer.close()

            val responseCode = conn.responseCode
            conn.disconnect()
            responseCode in 200..299
        } catch (e: Exception) {
            android.util.Log.e("ChatNotifReply", "Failed to send reply via Supabase", e)
            false
        }
    }
}

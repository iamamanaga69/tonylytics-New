package com.example.duogym

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object NotificationHelper {
    const val CHANNEL_ID = "duogym_reminders"
    const val REMINDER_ALARM_ID = 9001

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "FitRivals Reminders"
            val descriptionText = "Daily reminders to hit the gym"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun scheduleDailyReminder(context: Context) {
        createNotificationChannel(context)
        
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, GymNotificationReceiver::class.java)
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REMINDER_ALARM_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Set calendar to today at 3:00 PM (15:00)
        val calendar = Calendar.getInstance().apply {
            timeInMillis = System.currentTimeMillis()
            set(Calendar.HOUR_OF_DAY, 15)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // If 3:00 PM has already passed today, schedule for tomorrow
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }

        // Schedule using inexact alarm or setAndAllowWhileIdle for close triggering
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                pendingIntent
            )
        } else {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                pendingIntent
            )
        }
        
        android.util.Log.d("DuoGymNotification", "Scheduled daily 3 PM reminder for: ${calendar.time}")
    }

    fun getMotivationalMessage(): Pair<String, String> {
        val messages = listOf(
            Pair("Hey Aman, time to load the bar! 🏋️‍♂️", "Your muscles are waiting for mechanical tension, not excuses. Get to the gym now! ⚡"),
            Pair("Rishit, the iron arena is calling! 🔥", "Comfort zone is where dreams go to die. Let's trigger some myofibrillar protein synthesis today! 💪"),
            Pair("Aman, protect that hot streak! 🔥", "You've built momentum. Don't let a single second of laziness break it. Stand up! ⚡"),
            Pair("Rishit, time for mechanical tension! 🧬", "Let's wake up the mTOR pathway. Lower the weight slowly and control the load! 💀"),
            Pair("Hey Aman, CNS check! 🧠", "Time to coordinate those motor units and lift with maximum intent. Let's go! 🏁"),
            Pair("Rishit, zero excuses today! 🚫", "The only bad workout is the one that didn't happen. Put on your gym shoes! 💪"),
            Pair("Aman, hypertrophy doesn't wait! 🧬", "Let's force those muscle fibers to adapt under mechanical loading. Get moving! 🔥"),
            Pair("Rishit, are you skipping legs? 🦵", "Lumbar spine overload happens when glutes remain dormant. Load the squat bar! 💀"),
            Pair("Aman & Rishit: iron therapy! 🤝", "Sweat is just fat crying. Leave your comfort at the door and dominate today! 🏋️‍♂️"),
            Pair("Rishit, time for eccentric control! ⏱️", "Take 3 seconds to lower the weight today. Maximize the micro-tears for maximum gains! ⚡"),
            Pair("Aman, no more debating! 🗣️", "The version of you that wants to skip today wants you to stay exactly the same. Get up! 🔥"),
            Pair("Rishit, push past the inertia! 🚀", "Breaking the inertia of sitting down is the hardest part. Just start the warm-up! 💪"),
            Pair("Aman, did you pack the straps? 🎒", "Back day requires heavy rows. Let's build that massive width! ⚡"),
            Pair("Rishit, don't cherry-pick today! 🍒", "Every skipped exercise is a direct setback in your alignment. Do the work! 💀"),
            Pair("Aman, let's talk physiology! 🔬", "Avoiding heavy compound lifts reduces bone mineral density. Protect your joints! ⚡"),
            Pair("Rishit, time to sweat! 💦", "Your future self is either thanking you or blaming you. Make the right choice. 🏋️‍♂️"),
            Pair("Aman, the bench press awaits! 🪓", "Time to build chest shape and pushing power. Let's crush today's plan! 🔥"),
            Pair("Rishit, high-incline walk tax? 📈", "Either crush your exercises or pay the high-incline treadmill tax. Your choice! 💀"),
            Pair("Aman, let's trigger that pump! 🩸", "Increased blood flow means rapid nutrient delivery to recovering fibers. Go lift! ⚡"),
            Pair("Rishit, time to chisel that frame! 🗿", "A sculpted physique is built set-by-set, rep-by-rep. Don't loaf around! 💪"),
            Pair("Hey Aman, let's hit the platform! 🥇", "Discipline outlasts motivation. Champion mindset only today. See you at the gym! 🏆"),
            Pair("Rishit, CNS recovery check! 🔋", "You rested, now it's time to fire those motor units at 100% capacity! 🔥"),
            Pair("Aman & Rishit, gainz delivery! 🚴‍♂️", "No delivery fee, just pure effort. The weights aren't going to lift themselves! 💪"),
            Pair("Aman, pushups or bench? 🤝", "It's chest day, the best day. Let's get that solid pump and push through! ⚡"),
            Pair("Rishit, biceps won't grow on tabs! 📱", "Close the screens and open the barbell rack. Time to curl some iron! 💀"),
            Pair("Aman, are you consistent? 📆", "Consistency is the ultimate separator between amateurs and athletes. Show up! 🔥"),
            Pair("Rishit, time to crush the limits! 🤯", "The mind limits you, the body adapts. Break the mental barrier today! ⚡"),
            Pair("Aman, hydration check! 💧", "Drink your water, pack your gear, and let's face the iron. No excuses! 💪"),
            Pair("Rishit, let's load the deadlift! 🏋️‍♂️", "Posterior chain activation is critical for dynamic athletic posture. Lift! 💀"),
            Pair("Aman, build that V-taper! 📐", "Lat pull-downs and rows are on the menu. Let's make that upper back wide! ⚡"),
            Pair("Rishit, shoulder day is here! 🛡️", "Lateral raises for 3D width. Focus on the mind-muscle connection! 🔥"),
            Pair("Aman, respect the daily card! 👑", "A perfect check-in card is the only acceptable outcome today. Let's go! 🏆"),
            Pair("Rishit, let's build the habit! 🔄", "Consistency is a chain. Don't break the chain. Hit the gym at 3 PM! ⚡"),
            Pair("Aman & Rishit, pure hustle time! 🏃‍♂️", "No excuses, no shortcuts. Just pure physical work. Let's conquer the day! 💪"),
            Pair("Rishit, face the training arena! 🏟️", "The barbell doesn't care about your mood. Grab it and pull! 🔥")
        )
        return messages.random()
    }
}

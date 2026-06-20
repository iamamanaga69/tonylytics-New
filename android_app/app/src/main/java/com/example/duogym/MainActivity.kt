package com.example.duogym

import android.Manifest
import android.content.pm.PackageManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import com.example.duogym.theme.DuoGymTheme

class MainActivity : ComponentActivity() {
  private var pendingOAuthCallback: String? = null

  fun consumeOAuthCallback(): String? {
    val callback = pendingOAuthCallback
    pendingOAuthCallback = null
    return callback
  }

  private val requestPermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
  ) { isGranted: Boolean ->
    if (isGranted) {
      android.util.Log.d("DuoGym", "Notification permission granted")
      NotificationHelper.scheduleDailyReminder(this)
    } else {
      android.util.Log.w("DuoGym", "Notification permission denied")
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    pendingOAuthCallback = intent?.dataString?.takeIf { it.startsWith("fitrivals://auth/callback") }

    // Request notification permission for Android 13+
    checkNotificationPermission()

    enableEdgeToEdge()
    setContent {
      DuoGymTheme(dynamicColor = false) {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = Color(0xFF040406) // Matching premium website background
        ) {
          GymWebView(modifier = Modifier.safeDrawingPadding())
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    pendingOAuthCallback = intent.dataString?.takeIf { it.startsWith("fitrivals://auth/callback") }
  }

  private fun checkNotificationPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val permission = Manifest.permission.POST_NOTIFICATIONS
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        requestPermissionLauncher.launch(permission)
      } else {
        NotificationHelper.scheduleDailyReminder(this)
      }
    } else {
      NotificationHelper.scheduleDailyReminder(this)
    }
  }
}

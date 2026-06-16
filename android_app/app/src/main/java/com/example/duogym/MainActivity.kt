package com.example.duogym

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.duogym.theme.DuoGymTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

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
}

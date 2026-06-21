package com.example.duogym

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.example.duogym.health.HealthConnectRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GymWebView(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val activity = context as MainActivity
    val lifecycleOwner = LocalLifecycleOwner.current
    val healthRepository = remember { HealthConnectRepository(context.applicationContext) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var filePathCallbackInstance by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        filePathCallbackInstance?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        filePathCallbackInstance = null
    }

    val healthPermissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) {
        activity.lifecycleScope.launch {
            val status = healthRepository.statusJson()
            webViewInstance?.evaluateJavascript(
                "window.onNativeHealthStatus && window.onNativeHealthStatus($status);",
                null
            )
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                webViewInstance?.evaluateJavascript(
                    "window.onNativeAppResumed && window.onNativeAppResumed();",
                    null
                )
                activity.consumeOAuthCallback()?.let { callback ->
                    val encoded = org.json.JSONObject.quote(callback)
                    webViewInstance?.evaluateJavascript(
                        "window.onNativeOAuthCallback && window.onNativeOAuthCallback($encoded);",
                        null
                    )
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            webViewInstance?.destroy()
            webViewInstance = null
        }
    }

    BackHandler(enabled = webViewInstance?.canGoBack() == true) {
        webViewInstance?.goBack()
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                layoutParams = android.view.ViewGroup.LayoutParams(
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT
                )
                // Match app background immediately
                setBackgroundColor(Color.parseColor("#040406"))
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                overScrollMode = View.OVER_SCROLL_NEVER
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
                setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true)

                // Enable remote debugging via Chrome DevTools
                WebView.setWebContentsDebuggingEnabled(
                    context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
                )

                // Narrow bridge: backup sharing plus read-only Health Connect access.
                addJavascriptInterface(
                    GymAppInterface(
                        activity = activity,
                        healthRepository = healthRepository,
                        webViewProvider = { webViewInstance },
                        permissionRequester = {
                            activity.runOnUiThread {
                                healthPermissionLauncher.launch(HealthConnectRepository.READ_PERMISSIONS)
                            }
                        }
                    ),
                    "AndroidApp"
                )

                val assetLoader = androidx.webkit.WebViewAssetLoader.Builder()
                    .addPathHandler("/assets/", androidx.webkit.WebViewAssetLoader.AssetsPathHandler(context))
                    .build()

                webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): android.webkit.WebResourceResponse? {
                        if (request != null) {
                            val response = assetLoader.shouldInterceptRequest(request.url)
                            if (response != null) return response
                        }
                        return super.shouldInterceptRequest(view, request)
                    }

                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        android.util.Log.d("WebViewInfo", "Page loaded: $url")
                        activity.consumeOAuthCallback()?.let { callback ->
                            val encoded = org.json.JSONObject.quote(callback)
                            view?.evaluateJavascript(
                                "window.onNativeOAuthCallback && window.onNativeOAuthCallback($encoded);",
                                null
                            )
                        }
                    }

                    override fun onReceivedError(
                        view: WebView?,
                        request: WebResourceRequest?,
                        error: android.webkit.WebResourceError?
                    ) {
                        android.util.Log.e("WebViewError", "Load Error: ${error?.description} for ${request?.url}")
                    }
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        android.util.Log.d("WebViewConsole", "${consoleMessage?.messageLevel()}: ${consoleMessage?.message()}")
                        return true
                    }

                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>?,
                        fileChooserParams: FileChooserParams?
                    ): Boolean {
                        filePathCallbackInstance = filePathCallback
                        // Launch with wildcard filter to ensure Android system picker doesn't block JSON files
                        fileChooserLauncher.launch("*/*")
                        return true
                    }
                }

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    @Suppress("DEPRECATION")
                    allowFileAccess = true
                    allowContentAccess = true
                    @Suppress("DEPRECATION")
                    databaseEnabled = true
                    @Suppress("DEPRECATION")
                    allowFileAccessFromFileURLs = true
                    @Suppress("DEPRECATION")
                    allowUniversalAccessFromFileURLs = true
                    cacheMode = WebSettings.LOAD_DEFAULT
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    textZoom = 100
                    mediaPlaybackRequiresUserGesture = false
                    setSupportZoom(false)
                    builtInZoomControls = false
                    displayZoomControls = false
                }

                // Load via secure https origin so cross-origin requests like YouTube embeds work correctly
                loadUrl("https://appassets.androidplatform.net/assets/index.html")
                webViewInstance = this
            }
        },
        modifier = modifier.fillMaxSize()
    )
}

class GymAppInterface(
    private val activity: ComponentActivity,
    private val healthRepository: HealthConnectRepository,
    private val webViewProvider: () -> WebView?,
    private val permissionRequester: () -> Unit,
) {
    private val context: Context get() = activity

    @JavascriptInterface
    fun requestHealthPermissions() {
        permissionRequester.invoke()
    }

    @JavascriptInterface
    fun openOAuth(url: String) {
        val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
        if (uri.scheme != "https") return
        activity.runOnUiThread {
            runCatching {
                activity.startActivity(Intent(Intent.ACTION_VIEW, uri))
            }.onFailure {
                android.util.Log.e("FitRivalsAuth", "Unable to open OAuth browser", it)
            }
        }
    }

    @JavascriptInterface
    fun getHealthConnectStatus() {
        activity.lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { healthRepository.statusJson() }
            webViewProvider()?.evaluateJavascript(
                "window.onNativeHealthStatus && window.onNativeHealthStatus($result);",
                null
            )
        }
    }

    @JavascriptInterface
    fun getDailyActivity(date: String) {
        if (!date.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) return
        activity.lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching { healthRepository.readDay(date) }.getOrElse {
                    org.json.JSONObject()
                        .put("ok", false)
                        .put("date", date)
                        .put("message", it.message ?: "Unable to read Health Connect")
                }
            }
            webViewProvider()?.evaluateJavascript(
                "window.onNativeActivityData && window.onNativeActivityData($result);",
                null
            )
        }
    }

    @JavascriptInterface
    fun getActivityHistory(endDate: String, requestedDays: Int) {
        if (!endDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) return
        val days = requestedDays.coerceIn(1, 7)
        activity.lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                val end = runCatching { LocalDate.parse(endDate) }.getOrNull()
                    ?: return@withContext org.json.JSONArray()
                val items = org.json.JSONArray()
                for (offset in days - 1 downTo 0) {
                    val date = end.minusDays(offset.toLong()).toString()
                    val item = runCatching { healthRepository.readDay(date) }.getOrElse {
                        org.json.JSONObject()
                            .put("ok", false)
                            .put("date", date)
                            .put("message", it.message ?: "Unable to read Health Connect")
                    }
                    items.put(item)
                }
                items
            }
            webViewProvider()?.evaluateJavascript(
                "window.onNativeActivityHistory && window.onNativeActivityHistory($result);",
                null
            )
        }
    }

    @JavascriptInterface
    fun shareBackup(dataJson: String, filename: String) {
        try {
            val file = File(context.cacheDir, filename)
            file.writeText(dataJson)
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(intent, "Share Backup Archive").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
        } catch (e: Exception) {
            android.util.Log.e("GymAppInterface", "Failed to share backup file", e)
        }
    }

    @JavascriptInterface
    fun showChatNotification(
        senderName: String,
        messageText: String,
        replyAs: String,
        replyTo: String
    ) {
        NotificationHelper.showChatNotification(context, senderName, messageText, replyAs, replyTo)
    }

    @JavascriptInterface
    fun clearChatNotifications() {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            for (id in 5000..5100) {
                notificationManager.cancel(id)
            }
        } catch (e: Exception) {
            android.util.Log.e("GymAppInterface", "Failed to clear notifications", e)
        }
    }
}

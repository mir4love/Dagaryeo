package com.jamsuni.dagaryeo

import android.Manifest
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class VerifiedImageShareModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "VerifiedImageShare"

  @ReactMethod
  fun share(fileUri: String, promise: Promise) {
    try {
      val parsedUri = Uri.parse(fileUri)
      val path = parsedUri.path ?: throw IllegalArgumentException("파일 경로가 없습니다.")
      val file = File(path)
      if (!file.exists() || !file.isFile) {
        throw IllegalArgumentException("공유할 검증 파일이 없습니다.")
      }

      val contentUri = FileProvider.getUriForFile(
        reactContext,
        "${reactContext.packageName}.verified-files",
        file,
      )
      val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, contentUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val chooser = Intent.createChooser(sendIntent, "검증된 이미지 공유").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      reactContext.startActivity(chooser)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_SHARE_VERIFIED_IMAGE", error.message, error)
    }
  }

  @ReactMethod
  fun saveToPhotos(fileUri: String, kind: String, mimeType: String, promise: Promise) {
    try {
      val extension = when (mimeType.lowercase(Locale.US)) {
        "image/jpeg", "image/jpg" -> "jpg"
        "image/heic", "image/heif" -> "heic"
        else -> "png"
      }
      val safeKind = if (kind == "original") "original" else "masked"
      val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(Date())
      val displayName = "Dagaryeo_${safeKind}_$timestamp.$extension"

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        saveWithMediaStore(fileUri, displayName, mimeType, promise)
      } else {
        saveLegacy(fileUri, displayName, mimeType, promise)
      }
    } catch (error: Exception) {
      promise.reject("E_SAVE_VERIFIED_IMAGE", error.message, error)
    }
  }

  private fun saveWithMediaStore(
    fileUri: String,
    displayName: String,
    mimeType: String,
    promise: Promise,
  ) {
    val resolver = reactContext.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Images.Media.DISPLAY_NAME, displayName)
      put(MediaStore.Images.Media.MIME_TYPE, mimeType)
      put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Dagaryeo")
      put(MediaStore.Images.Media.IS_PENDING, 1)
    }
    val outputUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
      ?: throw IllegalStateException("사진 앱에 새 파일을 만들지 못했습니다.")

    try {
      openSource(fileUri).use { input ->
        resolver.openOutputStream(outputUri, "w")?.use { output ->
          input.copyTo(output)
        } ?: throw IllegalStateException("사진 데이터를 저장하지 못했습니다.")
      }
      values.clear()
      values.put(MediaStore.Images.Media.IS_PENDING, 0)
      resolver.update(outputUri, values, null, null)
      promise.resolve(outputUri.toString())
    } catch (error: Exception) {
      resolver.delete(outputUri, null, null)
      throw error
    }
  }

  @Suppress("DEPRECATION")
  private fun saveLegacy(
    fileUri: String,
    displayName: String,
    mimeType: String,
    promise: Promise,
  ) {
    if (ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.WRITE_EXTERNAL_STORAGE,
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      throw SecurityException("사진 저장 권한이 필요합니다.")
    }

    val directory = File(
      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
      "Dagaryeo",
    )
    if (!directory.exists() && !directory.mkdirs()) {
      throw IllegalStateException("Dagaryeo 사진 폴더를 만들지 못했습니다.")
    }
    val destination = File(directory, displayName)
    openSource(fileUri).use { input -> destination.outputStream().use(input::copyTo) }
    MediaScannerConnection.scanFile(
      reactContext,
      arrayOf(destination.absolutePath),
      arrayOf(mimeType),
    ) { path, uri -> promise.resolve(uri?.toString() ?: path) }
  }

  private fun openSource(fileUri: String): InputStream {
    val uri = Uri.parse(fileUri)
    return if (uri.scheme == "content") {
      reactContext.contentResolver.openInputStream(uri)
        ?: throw IllegalArgumentException("원본 사진을 읽지 못했습니다.")
    } else {
      val path = uri.path ?: throw IllegalArgumentException("사진 파일 경로가 없습니다.")
      File(path).inputStream()
    }
  }
}

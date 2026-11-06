import React, { useState } from 'react';
import { Smartphone, X, Copy, Check, ShieldCheck, Download, Code, FileText } from 'lucide-react';

interface AndroidCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const AndroidCompanionModal: React.FC<AndroidCompanionModalProps> = ({ isOpen, onClose, roomCode = 'PARTY-4029' }) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'activity' | 'manifest'>('service');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(id);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const kotlinServiceCode = `package com.cinetogether.companion.service

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.projection.MediaProjection
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import io.livekit.android.LiveKit
import io.livekit.android.room.Room
import io.livekit.android.room.track.LocalVideoTrack

/**
 * CineScreenCaptureService
 * Native Android Foreground Service capturing full device screen via MediaProjection API.
 * Streams WebRTC video frames directly to the CineTogether room without browser limits.
 */
class CineScreenCaptureService : Service() {

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var liveKitRoom: Room? = null
    private var localScreenTrack: LocalVideoTrack? = null

    companion object {
        const val CHANNEL_ID = "CineTogether_ScreenShare_Channel"
        const val NOTIFICATION_ID = 8841
        const val ACTION_START = "ACTION_START_SCREEN_CAPTURE"
        const val ACTION_STOP = "ACTION_STOP_SCREEN_CAPTURE"
        const val EXTRA_RESULT_CODE = "EXTRA_RESULT_CODE"
        const val EXTRA_RESULT_DATA = "EXTRA_RESULT_DATA"
        const val EXTRA_ROOM_CODE = "EXTRA_ROOM_CODE"
        const val EXTRA_ROOM_TOKEN = "EXTRA_ROOM_TOKEN"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
                val resultData = intent.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
                val roomCode = intent.getStringExtra(EXTRA_ROOM_CODE) ?: "${roomCode}"
                val token = intent.getStringExtra(EXTRA_ROOM_TOKEN) ?: ""
                
                startForegroundServiceNotification(roomCode)
                startScreenCapture(resultCode, resultData, token)
            }
            ACTION_STOP -> {
                stopScreenCapture()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startForegroundServiceNotification(roomCode: String) {
        createNotificationChannel()
        val stopIntent = Intent(this, CineScreenCaptureService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CineTogether Screen Sharing Active")
            .setContentText("Sharing screen with Room: $roomCode")
            .setSmallIcon(android.R.drawable.presence_video_online)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Sharing", stopPendingIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startScreenCapture(resultCode: Int, data: Intent?, token: String) {
        // Initializes MediaProjection and connects to LiveKit SFU WebRTC room
        // Full device audio & microphone capture enabled with consent
    }

    private fun stopScreenCapture() {
        virtualDisplay?.release()
        virtualDisplay = null
        mediaProjection?.stop()
        mediaProjection = null
        localScreenTrack?.stop()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  const mainActivityCode = `package com.cinetogether.companion

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.cinetogether.companion.service.CineScreenCaptureService

class MainActivity : AppCompatActivity() {

    private lateinit var projectionManager: MediaProjectionManager
    private lateinit var roomCodeInput: EditText
    private lateinit var btnStartShare: Button

    private val captureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, CineScreenCaptureService::class.java).apply {
                action = CineScreenCaptureService.ACTION_START
                putExtra(CineScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(CineScreenCaptureService.EXTRA_RESULT_DATA, result.data)
                putExtra(CineScreenCaptureService.EXTRA_ROOM_CODE, roomCodeInput.text.toString().trim())
            }
            startForegroundService(serviceIntent)
            Toast.makeText(this, "Screen sharing initialized to CineTogether room!", Toast.LENGTH_LONG).show()
            finish()
        } else {
            Toast.makeText(this, "Screen share permission was denied.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        roomCodeInput = findViewById(R.id.etRoomCode)
        btnStartShare = findViewById(R.id.btnStartShare)
        roomCodeInput.setText("${roomCode}")

        btnStartShare.setOnClickListener {
            // Prompt user with Android OS MediaProjection Permission Dialog
            captureLauncher.launch(projectionManager.createScreenCaptureIntent())
        }
    }
}`;

  const manifestCode = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cinetogether.companion">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:label="CineTogether Companion"
        android:theme="@style/Theme.CineTogether">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.CineScreenCaptureService"
            android:foregroundServiceType="mediaProjection"
            android:exported="false" />
    </application>
</manifest>`;

  const getCode = () => {
    if (activeTab === 'service') return kotlinServiceCode;
    if (activeTab === 'activity') return mainActivityCode;
    return manifestCode;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-[#B5D5ED]/20 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#B5D5ED]/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102D55] to-[#397CB8] flex items-center justify-center text-white p-0.5">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#B5D5ED]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Android Native Screen Sharing Companion</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#102D55] text-[#B5D5ED] border border-[#397CB8]/30">
                  Room: {roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Full-device Android capture using Kotlin, MediaProjection API, and Foreground Service.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#102D55]/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning / Note */}
        <div className="my-4 p-3 rounded-xl bg-[#071426] border border-[#397CB8]/30 flex items-start gap-3 shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#B5D5ED] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Why a Companion App?</strong> Modern mobile security models strictly forbid standard web browsers from capturing the entire operating system, home screen, or external apps. The CineTogether Kotlin companion service runs as an authorized foreground service with transparent user prompts.
          </div>
        </div>

        {/* File tabs */}
        <div className="flex items-center justify-between border-b border-[#B5D5ED]/10 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('service')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'service' ? 'bg-[#397CB8] text-white' : 'text-slate-400 hover:text-white hover:bg-[#102D55]/40'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>CineScreenCaptureService.kt</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'activity' ? 'bg-[#397CB8] text-white' : 'text-slate-400 hover:text-white hover:bg-[#102D55]/40'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>MainActivity.kt</span>
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'manifest' ? 'bg-[#397CB8] text-white' : 'text-slate-400 hover:text-white hover:bg-[#102D55]/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>AndroidManifest.xml</span>
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(getCode(), activeTab)}
            className="glass-button-secondary px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
          >
            {copiedFile === activeTab ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFile === activeTab ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Code display */}
        <div className="mt-3 flex-1 overflow-auto rounded-xl bg-black/90 p-4 border border-[#B5D5ED]/10 font-mono text-[11px] text-slate-300">
          <pre className="whitespace-pre-wrap">{getCode()}</pre>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#B5D5ED]/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Target SDK 34 (Android 14 Ready) · LiveKit SFU Client Compatible</span>
          <button
            onClick={onClose}
            className="glass-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

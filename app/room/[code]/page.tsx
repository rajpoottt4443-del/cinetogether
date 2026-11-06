'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export default function WatchPartyRoom() {
  const params = useParams()
  const roomCode = params.code as string

  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [mediaUrl, setMediaUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4')
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!roomCode) return

    // Supabase Realtime Channel for Sync & Signaling
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } }
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'sync-playback' }, ({ payload }) => {
        const video = videoRef.current
        if (!video) return

        const latencySec = Math.max(0, (Date.now() - payload.sentAt) / 1000)
        const targetTime = payload.isPlaying 
          ? payload.currentTime + (latencySec * payload.playbackRate) 
          : payload.currentTime

        if (Math.abs(video.currentTime - targetTime) > 0.75) {
          video.currentTime = targetTime
        }

        if (payload.isPlaying && video.paused) {
          video.play().catch(() => {})
        } else if (!payload.isPlaying && !video.paused) {
          video.pause()
        }
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload])
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        const pc = getOrCreatePeerConnection()
        if (payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          if (payload.sdp.type === 'offer') {
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: { sdp: pc.localDescription }
            })
          }
        } else if (payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [roomCode])

  const getOrCreatePeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    pc.ontrack = (event) => {
      if (screenRef.current) {
        screenRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { candidate: event.candidate }
        })
      }
    }

    return pc
  }

  // Broadcast Playback State with Mathematical Drift Compensation
  const broadcastSync = (playing: boolean, time: number) => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'sync-playback',
      payload: {
        isPlaying: playing,
        currentTime: time,
        playbackRate: 1.0,
        sentAt: Date.now()
      }
    })
  }

  const handlePlay = () => {
    setIsPlaying(true)
    if (videoRef.current) {
      broadcastSync(true, videoRef.current.currentTime)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      broadcastSync(false, videoRef.current.currentTime)
    }
  }

  const handleSeek = () => {
    if (videoRef.current) {
      broadcastSync(isPlaying, videoRef.current.currentTime)
    }
  }

  // Start Native WebRTC Screen Sharing (Only user who clicks shares screen)
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      localStreamRef.current = stream

      const pc = getOrCreatePeerConnection()
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { sdp: pc.localDescription }
        })
      }
    } catch (err) {
      console.error('Screen share error:', err)
    }
  }

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !channelRef.current) return

    const msgObj = { text: newMessage, sender: 'User', timestamp: Date.now() }
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: msgObj
    })
    setMessages(prev => [...prev, msgObj])
    setNewMessage('')
  }

  return (
    <main className="min-h-screen bg-[#07090E] text-white p-6 flex flex-col lg:flex-row gap-6">
      {/* Main Theater Stage */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-[#0F1420] border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden relative aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            src={mediaUrl}
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeek}
            className="w-full h-full object-contain rounded-lg"
          />
        </div>

        {/* Screen Share Stage (Appears when someone shares screen) */}
        <div className="bg-[#0F1420] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase">Live Screen Share Stage</h2>
            <button
              onClick={startScreenShare}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-xl transition shadow-lg"
            >
              Share My Screen
            </button>
          </div>
          <div className="aspect-video bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
            <video ref={screenRef} autoPlay playsInline className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* Real-time Chat Sidebar */}
      <div className="w-full lg:w-80 bg-[#0F1420] border border-white/10 rounded-2xl p-4 flex flex-col h-[80vh] lg:h-auto shadow-2xl">
        <h2 className="text-md font-bold mb-4 border-b border-white/10 pb-2">Room Chat ({roomCode})</h2>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
          {messages.map((m, idx) => (
            <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 text-sm">
              <span className="text-xs text-indigo-400 font-semibold block mb-1">{m.sender}</span>
              <p className="text-gray-200">{m.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendChatMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold transition">
            Send
          </button>
        </form>
      </div>
    </main>
  )
}

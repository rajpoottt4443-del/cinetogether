import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Check, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (dataUrl: string) => Promise<void> | void;
  title?: string;
  description?: string;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  title = 'Upload Profile Photo',
  description = 'Upload a custom photo or capture a snapshot. Formats: JPG, PNG, WEBP (Max 10MB).'
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

  // Preset cinematic avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      compressImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Resize and compress image using HTML5 Canvas
  const compressImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_DIM = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(compressed);
      }
    };
    img.src = dataUrl;
  };

  // Webcam live snapshot
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 400 }, height: { ideal: 400 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setError('Unable to access camera. Please check browser permissions.');
    }
  };

  const captureCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setSelectedImage(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleClose = () => {
    stopCamera();
    setSelectedImage(null);
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    try {
      await onUpload(selectedImage);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-[#B5D5ED]/20 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#B5D5ED]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#102D55] flex items-center justify-center text-[#B5D5ED]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#102D55]/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#071426] border border-cyan-500/40 text-cyan-200 text-xs">
            {error}
          </div>
        )}

        {/* Preview Area */}
        <div className="mt-5 flex flex-col items-center">
          {isCameraActive ? (
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-[#397CB8] shadow-[0_0_20px_rgba(57,124,184,0.4)]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <button
                onClick={captureCamera}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-[#397CB8] text-white text-xs font-semibold rounded-full shadow-lg hover:bg-[#468ecf]"
              >
                Snap Photo
              </button>
            </div>
          ) : (
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-[#397CB8]/50 shadow-[0_0_25px_rgba(57,124,184,0.25)] bg-[#071426] flex items-center justify-center group">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Selected Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 mx-auto text-[#B5D5ED]/60 mb-1" />
                  <span className="text-[11px] text-slate-400">No photo chosen</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Device</span>
            </button>

            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="glass-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Webcam Snapshot</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="glass-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300"
              >
                Cancel Camera
              </button>
            )}
          </div>
        </div>

        {/* Or choose a cinematic preset */}
        <div className="mt-5 pt-4 border-t border-[#B5D5ED]/10">
          <p className="text-[11px] font-medium text-slate-400 mb-2 text-center">
            Or select a verified CineTogether avatar:
          </p>
          <div className="flex items-center justify-center gap-2.5">
            {presetAvatars.map((url, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedImage(url); stopCamera(); }}
                className={`relative w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                  selectedImage === url ? 'border-[#B5D5ED] scale-110 shadow-[0_0_10px_#B5D5ED]' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#B5D5ED]/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedImage || isProcessing}
            className="glass-button-primary px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

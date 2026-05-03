"use client";

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Portal } from './Portal';

interface BannerCropperProps {
  aspect: number;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export const BannerCropper: React.FC<BannerCropperProps> = ({ aspect, onCropComplete, onCancel }) => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImage(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: any) => {
    setZoom(zoom);
  }, []);

  const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = image;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[40px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Image Studio</h2>
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mt-1">Crop and optimize your banner asset</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <span className="material-symbols-outlined text-zinc-400">close</span>
            </button>
          </div>

          <div className="flex-1 relative bg-zinc-100">
            {image ? (
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={onCropChange}
                onCropComplete={onCropAreaComplete}
                onZoomChange={onZoomChange}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-6 group cursor-pointer hover:scale-110 transition-transform relative">
                  <span className="material-symbols-outlined text-4xl text-zinc-400 group-hover:text-primary transition-colors">cloud_upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectFile}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Select High-Res Image</h3>
                <p className="text-xs text-zinc-400 font-bold max-w-xs mt-2 uppercase tracking-widest">Recommended size for wide banners is at least 1920x820 pixels</p>
              </div>
            )}
          </div>

          {image && (
            <div className="p-8 bg-white border-t border-zinc-100 space-y-6">
              <div className="flex items-center gap-6">
                <span className="material-symbols-outlined text-zinc-400">zoom_in</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setImage(null)}
                  className="flex-1 h-16 rounded-2xl border-2 border-zinc-100 text-zinc-400 font-black text-[10px] tracking-widest uppercase hover:border-zinc-900 hover:text-zinc-900 transition-all"
                >
                  Change Image
                </button>
                <button
                  onClick={createCroppedImage}
                  className="flex-[2] h-16 bg-zinc-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-black transition-all shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Finalize & Upload
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

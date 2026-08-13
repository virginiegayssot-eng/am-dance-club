"use client";

import { useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onSave: (croppedBase64: string) => void;
};

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 500;

export default function AvatarCropper({ imageSrc, onCancel, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function clamp(value: number, max: number) {
    if (max <= 0) return 0;
    return Math.min(max, Math.max(-max, value));
  }

  function maxOffsets(z: number) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const displayedWidth = img.naturalWidth * coverScale * z;
    const displayedHeight = img.naturalHeight * coverScale * z;
    return {
      x: Math.max(0, (displayedWidth - VIEWPORT_SIZE) / 2),
      y: Math.max(0, (displayedHeight - VIEWPORT_SIZE) / 2),
    };
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const scale = Math.max(VIEWPORT_SIZE / img.naturalWidth, VIEWPORT_SIZE / img.naturalHeight);
    setCoverScale(scale);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function startDrag(x: number, y: number) {
    dragState.current = { startX: x, startY: y, startOffsetX: offset.x, startOffsetY: offset.y };
  }

  function moveDrag(x: number, y: number) {
    if (!dragState.current) return;
    const { x: maxX, y: maxY } = maxOffsets(zoom);
    setOffset({
      x: clamp(dragState.current.startOffsetX + (x - dragState.current.startX), maxX),
      y: clamp(dragState.current.startOffsetY + (y - dragState.current.startY), maxY),
    });
  }

  function endDrag() {
    dragState.current = null;
  }

  function handleZoomChange(newZoom: number) {
    setZoom(newZoom);
    const { x: maxX, y: maxY } = maxOffsets(newZoom);
    setOffset(o => ({ x: clamp(o.x, maxX), y: clamp(o.y, maxY) }));
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img) return;
    const effectiveScale = coverScale * zoom;
    const displayedWidth = img.naturalWidth * effectiveScale;
    const displayedHeight = img.naturalHeight * effectiveScale;
    const imageLocalX = -((VIEWPORT_SIZE - displayedWidth) / 2 + offset.x);
    const imageLocalY = -((VIEWPORT_SIZE - displayedHeight) / 2 + offset.y);
    const srcX = imageLocalX / effectiveScale;
    const srcY = imageLocalY / effectiveScale;
    const srcSize = VIEWPORT_SIZE / effectiveScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onSave(canvas.toDataURL("image/jpeg", 0.9));
  }

  const displayWidth = imgRef.current ? imgRef.current.naturalWidth * coverScale * zoom : undefined;
  const displayHeight = imgRef.current ? imgRef.current.naturalHeight * coverScale * zoom : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-heading text-lg mb-1 text-center">Adjust your photo</h3>
        <p className="font-body text-xs text-gray-400 text-center mb-4">Drag to reposition, use the slider to zoom</p>

        <div
          className="mx-auto rounded-full overflow-hidden bg-gray-100 relative cursor-move select-none touch-none"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onMouseDown={e => startDrag(e.clientX, e.clientY)}
          onMouseMove={e => { if (dragState.current) moveDrag(e.clientX, e.clientY); }}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={endDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={handleImgLoad}
            draggable={false}
            alt="Photo to crop"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: displayWidth,
              height: displayHeight,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="font-body text-xs text-gray-400 shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1 justify-center">Save Photo</button>
        </div>
      </div>
    </div>
  );
}

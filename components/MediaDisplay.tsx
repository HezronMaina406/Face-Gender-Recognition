
import React, { useRef, useState, useEffect } from 'react';
import type { DetectedFace } from '../types';

interface MediaDisplayProps {
  mediaType: 'image' | 'video';
  sourceUrl?: string;
  sourceObject?: MediaStream;
  faces: DetectedFace[];
  naturalWidth: number;
  naturalHeight: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onMetadataLoaded?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  mediaType,
  sourceUrl,
  sourceObject,
  faces,
  naturalWidth,
  naturalHeight,
  videoRef,
  onMetadataLoaded,
  autoPlay = false,
  muted = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current && naturalWidth > 0 && naturalHeight > 0) {
        const { clientWidth, clientHeight } = containerRef.current;
        const scaleX = clientWidth / naturalWidth;
        const scaleY = clientHeight / naturalHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    };
    
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [naturalWidth, naturalHeight]);

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;

  const renderMedia = () => {
    const props = {
      className: "object-contain",
      style: { width: scaledWidth, height: scaledHeight },
      onLoadedMetadata: onMetadataLoaded,
      autoPlay: autoPlay,
      muted: muted,
      playsInline: true,
    };

    if (mediaType === 'image') {
      return <img src={sourceUrl} alt="Analyzed content" {...props} />;
    } else if (mediaType === 'video') {
        const refProps = videoRef ? { ref: videoRef } : {};
        if (sourceObject) {
            return <video {...props} {...refProps} ref={el => {
                if(videoRef) (videoRef.current as HTMLVideoElement | null) = el;
                if(el) el.srcObject = sourceObject;
            }} />;
        }
        return <video src={sourceUrl} controls {...props} {...refProps} />;
    }
    return null;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      {renderMedia()}
      <div className="absolute" style={{ width: scaledWidth, height: scaledHeight }}>
        {faces.map((face, index) => {
          const { x, y, width, height } = face.box;
          const isUnknown = face.name.toLowerCase() === 'unknown';
          
          return (
            <div
              key={index}
              className={`absolute border-2 rounded-md transition-all duration-300 ${isUnknown ? 'border-red-500' : 'border-cyan-400'}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
              }}
            >
              <div className={`absolute -top-7 left-0 text-sm font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${isUnknown ? 'bg-red-500' : 'bg-cyan-400'} text-white`}>
                {face.name} {face.gender && `(${face.gender})`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

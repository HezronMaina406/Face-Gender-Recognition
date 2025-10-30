
import React, { useState, useCallback, useRef } from 'react';
import { MediaDisplay } from './MediaDisplay';
import { detectAndRecognizeFaces } from '../services/geminiService';
import { Spinner } from './Spinner';
import { UploadIcon } from './Icons';
import type { KnownPerson, RecognitionOptions, DetectedFace } from '../types';

interface VideoAnalyzerProps {
  knownPeople: KnownPerson[];
  options: RecognitionOptions;
}

export const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ knownPeople, options }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [personCount, setPersonCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [naturalSize, setNaturalSize] = useState<{width: number, height: number}>({width: 0, height: 0});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDetectedFaces([]);
      setPersonCount(0);
      setError(null);
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
        setNaturalSize({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
    }
  }

  const handleAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current) return;
    
    setIsLoading(true);
    setError(null);
    setDetectedFaces([]);
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context.');
      setIsLoading(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const frameDataUrl = canvas.toDataURL('image/jpeg');

    try {
      const result = await detectAndRecognizeFaces(frameDataUrl, knownPeople, options);
      setDetectedFaces(result.faces);
      setPersonCount(result.personCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [knownPeople, options]);

  return (
    <div className="h-full flex flex-col p-4">
      {!videoUrl && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
          <UploadIcon className="w-16 h-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Upload a Video</h3>
          <p className="text-gray-400 mb-4">Drag and drop or click to select a file.</p>
          <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" id="video-upload" />
          <label htmlFor="video-upload" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors">
            Select Video
          </label>
        </div>
      )}
      {videoUrl && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative mb-4 rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
            <MediaDisplay
              mediaType="video"
              sourceUrl={videoUrl}
              faces={detectedFaces}
              onMetadataLoaded={handleMetadataLoaded}
              videoRef={videoRef}
              naturalWidth={naturalSize.width}
              naturalHeight={naturalSize.height}
            />
          </div>
          {options.countPeople && personCount > 0 && (
             <div className="text-center text-lg font-semibold text-cyan-300 mb-4">
               Detected Persons: {personCount}
             </div>
           )}
           {error && <div className="text-center text-red-400 mb-4">{error}</div>}
        </div>
      )}

      <div className="flex-shrink-0 mt-auto pt-4 flex items-center justify-center space-x-4">
         <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" id="video-upload-2" />
          <label htmlFor="video-upload-2" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg cursor-pointer transition-colors">
            Change Video
          </label>
        <button
          onClick={handleAnalyzeFrame}
          disabled={!videoFile || isLoading}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center min-w-[180px]"
        >
          {isLoading ? <Spinner /> : 'Analyze Frame'}
        </button>
      </div>
    </div>
  );
};

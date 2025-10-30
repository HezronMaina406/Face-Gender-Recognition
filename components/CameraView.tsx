import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { MediaDisplay } from './MediaDisplay';
import { detectAndRecognizeFaces } from '../services/geminiService';
import { Spinner } from './Spinner';
import { UserPlusIcon, PlayIcon, StopIcon, RecordIcon } from './Icons';
import type { KnownPerson, RecognitionOptions, DetectedFace } from '../types';

interface CameraViewProps {
  knownPeople: KnownPerson[];
  options: RecognitionOptions;
  addPerson: (name: string, image: string) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ knownPeople, options, addPerson }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error: cameraError } = useCamera(videoRef);

  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [personCount, setPersonCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{width: number, height: number}>({width: 0, height: 0});
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const analysisIntervalRef = useRef<number | null>(null);
  const isProcessingFrame = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
      setError(cameraError);
  }, [cameraError])

  const handleMetadataLoaded = () => {
      if (videoRef.current) {
          setNaturalSize({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
      }
  }

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  }, []);

  const analyzeRealtimeFrame = useCallback(async () => {
    if (isProcessingFrame.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
    }

    const frameDataUrl = captureFrame();
    if (!frameDataUrl) return;

    isProcessingFrame.current = true;
    
    try {
      const result = await detectAndRecognizeFaces(frameDataUrl, knownPeople, options);
      // Only update if analysis is still active
      if (analysisIntervalRef.current) {
          setDetectedFaces(result.faces);
          setPersonCount(result.personCount);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An analysis error occurred.');
    } finally {
      isProcessingFrame.current = false;
    }
  }, [captureFrame, knownPeople, options]);

  useEffect(() => {
    if (isAnalyzing) {
      analysisIntervalRef.current = window.setInterval(analyzeRealtimeFrame, 1500); 
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [isAnalyzing, analyzeRealtimeFrame]);

  const handleToggleAnalysis = () => {
    const wasAnalyzing = isAnalyzing;
    setIsAnalyzing(prev => !prev);
    if (wasAnalyzing) {
        setDetectedFaces([]);
        setPersonCount(0);
    }
  };

  const handleRegisterClick = () => {
    const frame = captureFrame();
    if (frame) {
      setSnapshot(frame);
      setIsRegistering(true);
    }
  };
  
  const handleConfirmRegistration = () => {
    if (newPersonName.trim() && snapshot) {
      addPerson(newPersonName.trim(), snapshot);
      setIsRegistering(false);
      setNewPersonName('');
      setSnapshot(null);
    }
  };

  const handleStartRecording = useCallback(() => {
    if (stream) {
      recordedChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? { mimeType: 'video/webm; codecs=vp9' }
        : {};
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `FaceRec-recording-${new Date().toISOString()}.${extension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        recordedChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, [stream]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return (
    <div className="h-full flex flex-col p-4">
       <div className="flex-1 relative mb-4 rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
            <MediaDisplay
              mediaType="video"
              sourceObject={stream}
              faces={detectedFaces}
              onMetadataLoaded={handleMetadataLoaded}
              videoRef={videoRef}
              naturalWidth={naturalSize.width}
              naturalHeight={naturalSize.height}
              autoPlay
              muted
            />
            {!stream && !cameraError && <div className="absolute text-gray-400">Initializing camera...</div>}
       </div>
       {options.countPeople && personCount > 0 && (
         <div className="text-center text-lg font-semibold text-cyan-300 mb-4">
           Detected Persons: {personCount}
         </div>
       )}
       {error && <div className="text-center text-red-400 mb-4">{error}</div>}

      <div className="flex-shrink-0 mt-auto pt-4 flex items-center justify-center space-x-2 md:space-x-4">
        <button
          onClick={handleRegisterClick}
          disabled={!stream || isAnalyzing || isRecording}
          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>Register</span>
        </button>
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={!stream || isAnalyzing}
          className={`font-bold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed ${
            isRecording ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {isRecording ? <StopIcon className="w-5 h-5"/> : <RecordIcon className="w-5 h-5"/>}
          <span>{isRecording ? 'Stop' : 'Record'}</span>
        </button>
        <button
          onClick={handleToggleAnalysis}
          disabled={!stream || isRecording}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center min-w-[140px] space-x-2"
        >
          {isAnalyzing ? <StopIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
          <span>{isAnalyzing ? 'Stop' : 'Analyze'}</span>
        </button>
      </div>

      {isRegistering && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-8 max-w-sm w-full border border-gray-700">
            <h3 className="text-2xl font-bold mb-4">Register New Person</h3>
            <img src={snapshot!} alt="Snapshot" className="rounded-lg mb-4 w-full aspect-square object-cover" />
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter person's name"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex justify-end space-x-4">
              <button onClick={() => setIsRegistering(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
              <button onClick={handleConfirmRegistration} disabled={!newPersonName.trim()} className="bg-cyan-600 hover:cyan-500 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
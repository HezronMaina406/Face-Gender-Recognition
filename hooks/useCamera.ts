
import { useState, useEffect, RefObject } from 'react';

export const useCamera = (videoRef: RefObject<HTMLVideoElement>) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    
    const getCameraStream = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not supported by this browser.');
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        if (err instanceof DOMException) {
            if(err.name === 'NotAllowedError') {
                 setError('Camera permission denied. Please allow camera access in your browser settings.');
            } else {
                 setError(`Error accessing camera: ${err.message}`);
            }
        } else {
            setError('An unknown error occurred while accessing the camera.');
        }
        console.error("Error accessing camera: ", err);
      }
    };

    getCameraStream();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef]);

  return { stream, error };
};

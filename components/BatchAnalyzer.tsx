import React, { useState, useCallback } from 'react';
import { MediaDisplay } from './MediaDisplay';
import { detectAndRecognizeFaces } from '../services/geminiService';
import { Spinner } from './Spinner';
import { UploadIcon, FolderIcon } from './Icons';
import type { KnownPerson, RecognitionOptions, DetectedFace } from '../types';

interface BatchAnalyzerProps {
  knownPeople: KnownPerson[];
  options: RecognitionOptions;
}

interface ImageFileState {
  id: string;
  file: File;
  url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result: { faces: DetectedFace[]; personCount: number } | null;
  naturalSize: { width: number; height: number };
}

const CONCURRENCY_LIMIT = 3;

export const BatchAnalyzer: React.FC<BatchAnalyzerProps> = ({ knownPeople, options }) => {
  const [imageFiles, setImageFiles] = useState<ImageFileState[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Fix: Explicitly type `file` as `File` to resolve TS errors where it was being inferred as `unknown`.
      const newFiles: ImageFileState[] = Array.from(files).map((file: File) => {
        const url = URL.createObjectURL(file);
        const newFileState: ImageFileState = {
          id: `${file.name}-${file.lastModified}`,
          file,
          url,
          status: 'pending',
          result: null,
          naturalSize: { width: 0, height: 0 },
        };
        const img = new Image();
        img.onload = () => {
          setImageFiles(currentFiles => 
            currentFiles.map(f => f.id === newFileState.id ? {...f, naturalSize: { width: img.naturalWidth, height: img.naturalHeight }} : f)
          );
        };
        img.src = url;
        return newFileState;
      });
      setImageFiles(newFiles);
      setSelectedImageId(newFiles[0].id);
    }
  };

  const handleAnalyzeBatch = useCallback(async () => {
    setIsBatchLoading(true);

    const filesToProcess = imageFiles.filter(f => f.status === 'pending' || f.status === 'error');
    const queue = [...filesToProcess];

    const process = async (fileState: ImageFileState) => {
      setImageFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'processing' } : f));
      try {
        const result = await detectAndRecognizeFaces(fileState.file, knownPeople, options);
        setImageFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'done', result } : f));
      } catch (err) {
        console.error(`Failed to process ${fileState.file.name}`, err);
        setImageFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'error' } : f));
      }
    };

    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
      while (queue.length > 0) {
        const fileToProcess = queue.shift();
        if (fileToProcess) {
          await process(fileToProcess);
        }
      }
    });

    await Promise.all(workers);
    setIsBatchLoading(false);
  }, [imageFiles, knownPeople, options]);

  const selectedImage = imageFiles.find(f => f.id === selectedImageId);

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {imageFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 text-center m-4">
          <FolderIcon className="w-16 h-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Process a Batch of Photos</h3>
          <p className="text-gray-400 mb-4">Select multiple images to analyze them all at once.</p>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="batch-upload" multiple />
          <label htmlFor="batch-upload" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors">
            Select Images
          </label>
        </div>
      ) : (
        <>
          <aside className="w-full lg:w-72 flex-shrink-0 p-4 border-r border-gray-700/50 flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Image Queue</h3>
            <ul className="flex-1 space-y-2 overflow-y-auto pr-2 -mr-2">
              {imageFiles.map(f => (
                <li key={f.id}>
                  <button onClick={() => setSelectedImageId(f.id)} className={`w-full flex items-center space-x-3 p-2 rounded-md text-left transition-colors ${selectedImageId === f.id ? 'bg-cyan-600/30' : 'hover:bg-gray-700/70'}`}>
                    <img src={f.url} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="thumbnail" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className={`text-xs capitalize ${f.status === 'done' ? 'text-green-400' : f.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>{f.status}</p>
                    </div>
                    {f.status === 'processing' && <Spinner />}
                  </button>
                </li>
              ))}
            </ul>
             <div className="mt-4 flex-shrink-0">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="batch-upload-2" multiple />
                <label htmlFor="batch-upload-2" className="w-full text-center block bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors mb-2">
                    Change Images
                </label>
                <button
                  onClick={handleAnalyzeBatch}
                  disabled={isBatchLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center"
                >
                  {isBatchLoading ? <Spinner /> : `Process Batch (${imageFiles.filter(f => f.status !== 'done').length})`}
                </button>
             </div>
          </aside>
          <main className="flex-1 p-4 flex flex-col min-h-0">
             {selectedImage ? (
                <>
                <div className="flex-1 relative mb-4 rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
                    <MediaDisplay
                        mediaType="image"
                        sourceUrl={selectedImage.url}
                        faces={selectedImage.result?.faces || []}
                        naturalWidth={selectedImage.naturalSize.width}
                        naturalHeight={selectedImage.naturalSize.height}
                    />
                </div>
                 {options.countPeople && selectedImage.result && (
                    <div className="text-center text-lg font-semibold text-cyan-300 mb-0">
                        Detected Persons: {selectedImage.result.personCount}
                    </div>
                  )}
                </>
             ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">Select an image to view results</div>
             )}
          </main>
        </>
      )}
    </div>
  );
};

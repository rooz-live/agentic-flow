import React, { useState, useCallback } from 'react';

/**
 * VisionClaw Uploader
 *
 * Provides an interface for dragging and dropping local chart images
 * directly into the browser for immediate semantic topology crunching.
 * Bypasses API data walls by enabling local vision processing.
 */
export const VisionClawUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'IDLE' | 'CRUNCHING' | 'COMPLETE' | 'FAILED'>('IDLE');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setUploadedFile(file);
        processImage(file);
      } else {
        alert('Invalid payload. Must be an image file for VisionClaw extraction.');
      }
    }
  }, []);

  const processImage = async (file: File) => {
    setProcessingStatus('CRUNCHING');

    // Simulating the VisionClaw semantic extraction process
    // In reality, this would send the file to the local LLaVA/Vision backend
    setTimeout(() => {
      setProcessingStatus('COMPLETE');
    }, 2500);
  };

  return (
    <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 font-mono text-gray-300">
      <h2 className="text-lg font-bold text-indigo-400 mb-4 tracking-widest border-b border-indigo-900/50 pb-2">
        VISIONCLAW: LOCAL SEMANTIC INGESTION
      </h2>

      <div
        className={`relative w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center transition-all duration-300
          ${isDragging ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'}
          ${processingStatus === 'CRUNCHING' ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {processingStatus === 'IDLE' && !uploadedFile && (
          <>
            <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p className="text-sm font-bold text-gray-400">DRAG & DROP CHART PAYLOAD</p>
            <p className="text-xs text-gray-600 mt-1">Bypasses API boundaries via local mmaps</p>
          </>
        )}

        {processingStatus === 'CRUNCHING' && (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-bold text-indigo-400 animate-pulse">EXTRACTING TOPOLOGY...</p>
          </div>
        )}

        {processingStatus === 'COMPLETE' && uploadedFile && (
          <div className="flex flex-col items-center text-green-400">
             <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="text-sm font-bold">SEMANTIC CRUNCH COMPLETE</p>
            <p className="text-xs text-gray-500 mt-1">{uploadedFile.name} injected into ledger</p>
            <button
              className="mt-4 px-3 py-1 text-[10px] border border-green-500 rounded hover:bg-green-900/30 transition-colors"
              onClick={() => { setUploadedFile(null); setProcessingStatus('IDLE'); }}
            >
              INGEST NEW PAYLOAD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

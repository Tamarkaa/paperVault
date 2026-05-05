import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { PdfViewer } from './PdfViewer';

const API_BASE = "http://127.0.0.1:8000";

interface Props {
  filePath: string;
  paperId?: string | null;
  onClose: () => void;
  onNotesSaved?: () => void;
}

export function PdfReaderWithChat({ filePath, paperId, onClose, onNotesSaved }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const pdfUrl = `${API_BASE}/pdf?path=${encodeURIComponent(filePath)}`;

  // Initialize agent when component mounts
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        setIsInitializing(true);
        const response = await fetch(`${API_BASE}/agent/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize agent');
        }

        const data = await response.json();
        setSessionId(data.session_id);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        console.error('Error initializing agent:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAgent();

    // Cleanup: Close agent when component unmounts
    return () => {
      if (sessionId) {
        fetch(`${API_BASE}/agent/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        }).catch((err) => console.error('Error closing agent:', err));
      }
    };
  }, []);

  const handleClose = () => {
    if (sessionId) {
      fetch(`${API_BASE}/agent/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .catch((err) => console.error('Error closing agent:', err))
        .finally(() => onClose());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[85vh] overflow-hidden flex">
        <div className="w-3/5 border-r h-full flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="text-sm font-semibold">PDF Viewer</div>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-800">
              <X />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 border border-red-200">
                Error initializing agent: {error}
              </div>
            )}
            <PdfViewer url={pdfUrl} onSelection={setSelectedText} />
          </div>
        </div>

        <div className="w-2/5 h-full flex flex-col">
          {isInitializing ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Initializing chat agent...
            </div>
          ) : sessionId ? (
            <ChatPanel 
              sessionId={sessionId} 
              filePath={filePath} 
              paperId={paperId}
              selectedText={selectedText || undefined}
              onNotesSaved={onNotesSaved}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Failed to initialize chat agent
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

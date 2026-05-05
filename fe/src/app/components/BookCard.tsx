import { Copy, Trash2, FileText } from 'lucide-react';
import { ResearchPaper } from '../types';
import { useState } from 'react';

interface PaperCardProps {
  paper: ResearchPaper;
  onClick: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
  onOpenFile?: () => void;
}

export function PaperCard({ paper, onClick, showDelete, onDelete, onOpenFile }: PaperCardProps) {
  const [copiedCitation, setCopiedCitation] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleCopyCitation = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(paper.citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenFile) {
      onOpenFile();
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-xl relative group"
    >
      {showDelete && onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <div className="aspect-[2/3] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <FileText className="w-12 h-12 text-pink-400" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{paper.title}</h3>
        <p className="text-xs text-gray-600 mb-2 line-clamp-1">{paper.authors}</p>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{paper.description}</p>
        <div className="flex gap-2 mt-2">
          {onOpenFile && (
            <button
              onClick={handleOpenFile}
              className="flex-1 text-xs text-white px-2 py-1 rounded transition-colors"
              style={{ backgroundColor: '#e0b4df' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
              title="Open PDF file"
            >
              Open File
            </button>
          )}
          <button
            onClick={handleCopyCitation}
            className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
              copiedCitation
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Copy BibTeX citation"
          >
            <Copy className="w-3 h-3 inline mr-1" />
            {copiedCitation ? 'Copied!' : 'Citation'}
          </button>
        </div>
      </div>
    </div>
  );
}

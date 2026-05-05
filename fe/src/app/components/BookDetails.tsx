import { X, Copy, FileText, Trash2, ExternalLink, Tag } from 'lucide-react';
import { ResearchPaper, UserPaper, Category } from '../types';
import { useState, useEffect } from 'react';

const API_BASE = "http://127.0.0.1:8000";

interface PaperDetailsProps {
  paper: ResearchPaper;
  userPaper?: UserPaper;
  onClose: () => void;
  onChangeStatus: (status: 'to-read' | 'reading' | 'read' | null) => void;
  onOpenFile?: () => void;
  onDeletePaper?: () => void;
}

// Utility function to extract URL from BibTeX citation
function extractUrlFromCitation(citation: string): string | null {
  const urlMatch = citation.match(/url\s*=\s*\{([^}]+)\}/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Also try to match URL without braces
  const urlMatch2 = citation.match(/url\s*=\s*["\']?([^",\s]+)["\']?/i);
  if (urlMatch2) {
    return urlMatch2[1];
  }
  return null;
}

export function PaperDetails({
  paper,
  userPaper,
  onClose,
  onChangeStatus,
  onOpenFile,
  onDeletePaper,
}: PaperDetailsProps) {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paperCategories, setPaperCategories] = useState<Category[]>([]);
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState<string>('');

  useEffect(() => {
    fetchCategories();
    fetchPaperCategories();
  }, [paper.id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchPaperCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/papers/${paper.id}/categories`);
      const data = await res.json();
      setPaperCategories(data);
    } catch (err) {
      console.error('Failed to fetch paper categories:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!selectedCategoryToAdd) return;

    try {
      const res = await fetch(
        `${API_BASE}/papers/${paper.id}/categories/${selectedCategoryToAdd}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const category = categories.find((c) => c.id === selectedCategoryToAdd);
        if (category) {
          setPaperCategories([...paperCategories, category]);
          setSelectedCategoryToAdd('');
        }
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/papers/${paper.id}/categories/${categoryId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setPaperCategories(paperCategories.filter((c) => c.id !== categoryId));
      }
    } catch (err) {
      console.error('Failed to remove category:', err);
    }
  };

  const availableCategories = categories.filter(
    (c) => !paperCategories.some((pc) => pc.id === c.id)
  );

  const statusOptions = [
    { value: 'to-read', label: 'To Read', color: 'blue' },
    { value: 'reading', label: 'Reading', color: 'green' },
    { value: 'read', label: 'Read', color: 'purple' },
  ] as const;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(paper.citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const paperUrl = extractUrlFromCitation(paper.citation);

  const handleOpenPaper = () => {
    if (paperUrl) {
      window.open(paperUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Paper Details</h2>
          <div className="flex items-center gap-2">
            {onDeletePaper && (
              <button
                onClick={onDeletePaper}
                className="text-red-500 hover:text-red-700 transition-colors p-2"
                title="Delete paper"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 
                  className={`text-2xl font-bold text-gray-900 mb-2 ${
                    paperUrl ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''
                  }`}
                  onClick={paperUrl ? handleOpenPaper : undefined}
                  title={paperUrl ? 'Click to open paper' : undefined}
                >
                  {paper.title}
                </h1>
                {paperUrl && (
                  <button
                    onClick={handleOpenPaper}
                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                    title="Open paper in new tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-lg text-gray-600 mb-4">by {paper.authors}</p>
              
              {paper.description && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{paper.description}</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onChangeStatus(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userPaper?.status === option.value
                        ? `bg-${option.color}-500 text-white`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={
                      userPaper?.status === option.value
                        ? {
                            backgroundColor:
                              option.color === 'blue'
                                ? '#e0b4df'
                                : option.color === 'green'
                                ? '#22c55e'
                                : '#a855f7',
                          }
                        : undefined
                    }
                  >
                    {option.label}
                    {userPaper?.status === option.value && ' ✓'}
                  </button>
                ))}
                {userPaper && (
                  <button
                    onClick={() => onChangeStatus(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">BibTeX Citation</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {paper.citation}
                </pre>
                <button
                  onClick={handleCopyCitation}
                  className={`mt-3 flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                    copiedCitation
                      ? 'bg-green-500 text-white'
                      : 'text-white'
                  }`}
                  style={
                    copiedCitation
                      ? {}
                      : {
                          backgroundColor: '#e0b4df',
                        }
                  }
                  onMouseEnter={(e) => { if (!copiedCitation) e.currentTarget.style.backgroundColor = '#c97fc5'; }}
                  onMouseLeave={(e) => { if (!copiedCitation) e.currentTarget.style.backgroundColor = '#e0b4df'; }}
                >
                  <Copy className="w-4 h-4" />
                  {copiedCitation ? 'Copied!' : 'Copy Citation'}
                </button>
              </div>
            </div>

            {onOpenFile && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">File Location</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 mb-3 break-all font-mono">{paper.filePath}</p>
                  <button
                    onClick={onOpenFile}
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#e0b4df' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
                  >
                    <FileText className="w-4 h-4" />
                    Open PDF
                  </button>
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {paperCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {paperCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300"
                        style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}
                      >
                        <span className="text-sm text-gray-700">{cat.name}</span>
                        <button
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-0.5"
                          title="Remove from category"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {availableCategories.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={selectedCategoryToAdd}
                      onChange={(e) => setSelectedCategoryToAdd(e.target.value)}
                      className="flex-1 px-3 py-2 rounded border border-gray-300 text-sm"
                    >
                      <option value="">Select a category to add...</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddCategory}
                      disabled={!selectedCategoryToAdd}
                      className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#e0b4df' }}
                      onMouseEnter={(e) => { if (selectedCategoryToAdd) e.currentTarget.style.backgroundColor = '#c97fc5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
                    >
                      Add
                    </button>
                  </div>
                )}
                {availableCategories.length === 0 && paperCategories.length === 0 && (
                  <p className="text-sm text-gray-500">No categories available. Create one from the sidebar.</p>
                )}
              </div>
            </div>

            {/* Summary Section */}
            {paper.summary && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {paper.summary.split('\n').map((line, idx) => {
                      if (line.startsWith('##')) {
                        return (
                          <h4 key={idx} className="font-bold text-gray-900 mt-4 mb-2 text-base">
                            {line.replace(/^#+\s*/, '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={idx} className="ml-4 mb-1">
                            {line.replace(/^-\s*/, '')}
                          </li>
                        );
                      }
                      if (line.trim() === '') {
                        return <div key={idx} className="h-2" />;
                      }
                      return (
                        <p key={idx} className="mb-2">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Notes Section */}
            {paper.conversationNotes && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Conversation Notes</h3>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {paper.conversationNotes.split('\n').map((line, idx) => {
                      if (line.startsWith('##')) {
                        return (
                          <h4 key={idx} className="font-bold text-gray-900 mt-4 mb-2 text-base">
                            {line.replace(/^#+\s*/, '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={idx} className="ml-4 mb-1">
                            {line.replace(/^-\s*/, '')}
                          </li>
                        );
                      }
                      if (line.trim() === '') {
                        return <div key={idx} className="h-2" />;
                      }
                      return (
                        <p key={idx} className="mb-2">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

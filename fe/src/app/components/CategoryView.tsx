import { Plus, FolderOpen, Download } from 'lucide-react';
import { ResearchPaper, UserPaper, Category } from '../types';
import { PaperCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { useState } from 'react';
import { exportCategoryPapers } from '../utils/exportUtils';

interface CategoryViewProps {
  category: Category;
  papers: ResearchPaper[];
  userPapers: UserPaper[];
  onPaperClick: (paper: ResearchPaper) => void;
  onAddPaper: () => void;
}

export function CategoryView({
  category,
  papers,
  userPapers,
  onPaperClick,
  onAddPaper,
}: CategoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredPapers = papers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayPapers = searchQuery ? filteredPapers : papers;

  const handleExport = (format: 'markdown' | 'json' | 'txt') => {
    exportCategoryPapers(category, papers, format);
    setShowExportMenu(false);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
          </div>
          <p className="text-gray-600">
            {category.description && (
              <>
                {category.description}
                <br />
              </>
            )}
            Papers in this category {displayPapers.length > 0 && `(${displayPapers.length})`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {papers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#c97fc5',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b560a8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
                title="Export all papers in this category"
              >
                <Download className="w-5 h-5" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => handleExport('markdown')}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-200 text-sm"
                  >
                    <div className="font-medium text-gray-900">Markdown (.md)</div>
                    <div className="text-xs text-gray-500">Readable format for LLMs</div>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-200 text-sm"
                  >
                    <div className="font-medium text-gray-900">JSON (.json)</div>
                    <div className="text-xs text-gray-500">Structured format</div>
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                  >
                    <div className="font-medium text-gray-900">Plain Text (.txt)</div>
                    <div className="text-xs text-gray-500">Simple text format</div>
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onAddPaper}
            className="flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: '#e0b4df',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
          >
            <Plus className="w-5 h-5" />
            Add Paper
          </button>
        </div>
      </div>

      <div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {displayPapers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No papers found' : 'No Papers in This Category'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? `No papers match "${searchQuery}"`
              : 'Add papers to this category from the paper details'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayPapers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onClick={() => onPaperClick(paper)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

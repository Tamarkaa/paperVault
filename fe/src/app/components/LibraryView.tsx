import { Plus } from 'lucide-react';
import { ResearchPaper, UserPaper } from '../types';
import { PaperCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { useState } from 'react';

interface LibraryViewProps {
  papers: ResearchPaper[];
  userPapers: UserPaper[];
  onPaperClick: (paper: ResearchPaper) => void;
  onAddPaper: () => void;
}

export function LibraryView({
  papers,
  userPapers,
  onPaperClick,
  onAddPaper,
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPapers = papers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayPapers = searchQuery ? filteredPapers : papers;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Library</h1>
          <p className="text-gray-600">
            All papers in your library {displayPapers.length > 0 && `(${displayPapers.length})`}
          </p>
        </div>
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

      <div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {displayPapers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Plus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No papers found' : 'No Papers in Library'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? `No papers match "${searchQuery}"`
              : 'Start building your research paper collection'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddPaper}
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: '#e0b4df',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
            >
              <Plus className="w-5 h-5" />
              Add Your First Paper
            </button>
          )}
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

import { Plus, BookMarked } from 'lucide-react';
import { ResearchPaper, UserPaper } from '../types';
import { PaperCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { useState } from 'react';

interface ToReadViewProps {
  papers: ResearchPaper[];
  userPapers: UserPaper[];
  onPaperClick: (paper: ResearchPaper) => void;
  onAddPaper: () => void;
}

export function ToReadView({
  papers,
  userPapers,
  onPaperClick,
  onAddPaper,
}: ToReadViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getPaperById = (id: string) => papers.find((p) => p.id === id);

  const toReadPapers = userPapers
    .filter((up) => up.status === 'to-read')
    .map((up) => getPaperById(up.paperId))
    .filter((p): p is ResearchPaper => p !== undefined);

  const filteredPapers = toReadPapers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayPapers = searchQuery ? filteredPapers : toReadPapers;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">To Read</h1>
          <p className="text-gray-600">
            Papers you want to read {displayPapers.length > 0 && `(${displayPapers.length})`}
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
          <BookMarked className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No papers found' : 'No Papers to Read Yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? `No papers match "${searchQuery}"`
              : 'Add papers to your to-read list'}
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

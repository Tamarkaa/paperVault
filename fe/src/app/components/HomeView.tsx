import { useState } from 'react';
import { Plus, BookMarked, Clock, CheckCircle } from 'lucide-react';
import { ResearchPaper, UserPaper } from '../types';
import { PaperCard } from './BookCard';
import { SearchBar } from './SearchBar';

interface HomeViewProps {
  papers: ResearchPaper[];
  userPapers: UserPaper[];
  onPaperClick: (paper: ResearchPaper) => void;
  onAddPaper: () => void;
}

export function HomeView({
  papers,
  userPapers,
  onPaperClick,
  onAddPaper,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getPaperById = (id: string) => papers.find((p) => p.id === id);

  const reading = userPapers
    .filter((up) => up.status === 'reading')
    .map((up) => getPaperById(up.paperId))
    .filter((p): p is ResearchPaper => p !== undefined);

  const toRead = userPapers
    .filter((up) => up.status === 'to-read')
    .map((up) => getPaperById(up.paperId))
    .filter((p): p is ResearchPaper => p !== undefined);

  const readPapers = userPapers
    .filter((up) => up.status === 'read')
    .map((up) => getPaperById(up.paperId))
    .filter((p): p is ResearchPaper => p !== undefined);

  const filteredPapers = papers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase()) 
  );

  const allUserPapers = userPapers.map((up) => getPaperById(up.paperId)).filter((p): p is ResearchPaper => p !== undefined);
  const availablePapers = searchQuery
    ? filteredPapers
    : papers.filter((paper) => !userPapers.find((up) => up.paperId === paper.id));

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Papers</h1>
          <p className="text-gray-600">Manage and organize your research paper collection</p>
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

      {!searchQuery && (
        <>
          {reading.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Currently Reading</h2>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  {reading.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {reading.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onClick={() => onPaperClick(paper)}
                  />
                ))}
              </div>
            </div>
          )}

          {toRead.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BookMarked className="w-6 h-6 text-pink-600" />
                <h2 className="text-2xl font-semibold text-gray-900">To Read</h2>
                <span className="px-3 py-1 rounded-full text-sm text-white" style={{ backgroundColor: '#e0b4df' }}>
                  {toRead.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {toRead.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onClick={() => onPaperClick(paper)}
                  />
                ))}
              </div>
            </div>
          )}

          {readPapers.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Read</h2>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                  {readPapers.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {readPapers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onClick={() => onPaperClick(paper)}
                  />
                ))}
              </div>
            </div>
          )}

          {allUserPapers.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BookMarked className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Papers Yet</h3>
              <p className="text-gray-600 mb-6">Start building your research paper collection</p>
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
            </div>
          )}
        </>
      )}

      {searchQuery && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Search Results
            {filteredPapers.length > 0 && (
              <span className="text-gray-500 text-lg ml-2">({filteredPapers.length})</span>
            )}
          </h2>
          {filteredPapers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No papers found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onClick={() => onPaperClick(paper)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

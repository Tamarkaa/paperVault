import { useState } from 'react';
import { X, FileUp } from 'lucide-react';
import { ResearchPaper } from '../types';

interface AddPaperModalProps {
  onClose: () => void;
  onAdd: (paper: ResearchPaper) => void;
}

export function AddPaperModal({ onClose, onAdd }: AddPaperModalProps) {
  const [formData, setFormData] = useState({
    doi: '',
    description: '',
    filePath: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.doi || !formData.filePath) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Fetch metadata for DOI from backend
      const doiRes = await fetch('http://localhost:8000/api/doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: formData.doi }),
      });

      if (!doiRes.ok) {
        const err = await doiRes.text();
        throw new Error(err || 'Failed to fetch DOI data');
      }

      const doiData = await doiRes.json();

      const paperPayload = {
        title: doiData.title || '',
        authors: doiData.authors || '',
        description: formData.description || '',
        filePath: formData.filePath,
        citation: doiData.citation || '',
      };

      // Create paper in backend
      const createRes = await fetch('http://localhost:8000/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paperPayload),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(err || 'Failed to create paper');
      }

      const created = await createRes.json();

      // Ensure shape matches ResearchPaper
      const newPaper: ResearchPaper = {
        id: created.id || `paper-${Date.now()}`,
        title: created.title || paperPayload.title,
        authors: created.authors || paperPayload.authors,
        description: created.description || paperPayload.description,
        filePath: created.filePath || paperPayload.filePath,
        citation: created.citation || paperPayload.citation,
        dateAdded: created.dateAdded || new Date().toISOString(),
      };

      onAdd(newPaper);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'An error occurred while adding the paper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileUp className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add Research Paper</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DOI <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.doi}
              onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="e.g., 10.1038/s41586-020-2649-2"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authors <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.authors}
              onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="e.g., John Doe, Jane Smith"
            />
          </div> */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Path <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.filePath}
              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="/home/user/papers/paper.pdf"
            />
            <p className="text-xs text-gray-500 mt-1">Absolute path to the PDF file on your computer</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              placeholder="Brief description or key points about this paper (optional)"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BibTeX Citation <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.citation}
              onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder={`@article{key2024,\n  title={Paper Title},\n  author={Doe, J. and Smith, J.},\n  year={2024}\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">BibTeX format for easy citation in your documents</p>
          </div> */}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
              style={{
                backgroundColor: '#e0b4df',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c97fc5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e0b4df'; }}
              disabled={loading}
            >
              {loading ? 'Adding…' : 'Add Paper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

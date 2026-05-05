import { User, FileText, Clock, CheckCircle } from 'lucide-react';
import { UserPaper, ResearchPaper } from '../types';

interface AccountViewProps {
  userBooks: UserPaper[];
  researchPapers: ResearchPaper[];
}

export function AccountView({ userBooks: userPapers, researchPapers }: AccountViewProps) {
  const reading = userPapers.filter((up) => up.status === 'reading').length;
  const toRead = userPapers.filter((up) => up.status === 'to-read').length;
  const readPapers = userPapers.filter((up) => up.status === 'read').length;
  const totalPapers = researchPapers.length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e0b4df' }}>
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Researcher</h1>
            <p className="text-gray-600">researcher@email.com</p>
            <p className="text-sm text-gray-500 mt-1">Member since February 2026</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Papers</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPapers}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currently Reading</p>
                  <p className="text-2xl font-bold text-gray-900">{reading}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#f5e6f0' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e0b4df' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">To Read</p>
                  <p className="text-2xl font-bold text-gray-900">{toRead}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Papers Read</p>
                  <p className="text-2xl font-bold text-gray-900">{readPapers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
    </div>
  );
}

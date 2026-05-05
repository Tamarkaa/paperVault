export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  description: string;
  filePath: string;
  citation: string; 
  summary?: string; 
  conversationNotes?: string;
  dateAdded: string;
}

export interface UserPaper {
  paperId: string;
  status: 'to-read' | 'reading' | 'read';
  dateAdded: string;
  dateFinished?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface UserList {
  id: string;
  name: string;
  paperIds: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

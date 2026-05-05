import { useState, useEffect } from 'react';
import { AppSidebar } from './components/AppSidebar';
import { HomeView } from './components/HomeView';
import { LibraryView } from './components/LibraryView';
import { ToReadView } from './components/ToReadView';
import { ReadingView } from './components/ReadingView';
import { ReadView } from './components/ReadView';
import { AccountView } from './components/AccountView';
import { PaperDetails } from './components/BookDetails';
import { AddPaperModal } from './components/AddBookModal';
import { ResearchPaper, UserPaper, Category } from './types';
import { PdfReaderWithChat } from './components/PdfReaderWithChat';
import { CategoryView } from './components/CategoryView';

const API_BASE = "http://127.0.0.1:8000";
export default function App() {
  const [activeView, setActiveView] = useState('home');
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [userPapers, setUserPapers] = useState<UserPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [openedPdfPath, setOpenedPdfPath] = useState<string | null>(null);
  const [openedPaperId, setOpenedPaperId] = useState<string | null>(null);
  const [categoryPapers, setCategoryPapers] = useState<ResearchPaper[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // -------------------------
  // Fetch Data
  // -------------------------

  const fetchPapers = async () => {
    try {
      const res = await fetch(`${API_BASE}/papers`);
      const data = await res.json();
      setPapers(data);
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    }
  };

  const fetchUserPapers = async () => {
    try {
      const res = await fetch(`${API_BASE}/user-papers`);
      const data = await res.json();
      setUserPapers(data);
    } catch (err) {
      console.error("Failed to fetch user papers:", err);
    }
  };

  useEffect(() => {
    fetchPapers();
    fetchUserPapers();
  }, []);
  

  // -------------------------
  // UI Handlers
  // -------------------------

  const handlePaperClick = (paper: ResearchPaper) => {
    setSelectedPaper(paper);
  };

  const handleCloseDetails = () => {
    setSelectedPaper(null);
  };

const handleAddPaper = async (paper: ResearchPaper) => {
  try {
    // Paper was already created in the modal, just add to UI
    setPapers((prev) => [paper, ...prev]);

    // Automatically add to user_papers with to-read status
    const userPaperRes = await fetch(`${API_BASE}/user-papers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: paper.id }),
    });

    if (userPaperRes.ok) {
      const newUserPaper = await userPaperRes.json();
      setUserPapers((prev) => [
        ...prev,
        {
          paperId: newUserPaper.paperId,
          status: newUserPaper.status || 'to-read',
          dateAdded: newUserPaper.dateAdded,
          dateFinished: undefined,
        },
      ]);
    }

    setShowAddModal(false);
  } catch (err: any) {
    console.error(err);
    alert(err?.message || 'An error occurred');
  }
};

const handleChangeStatus = async (
  paperId: string,
  status: 'to-read' | 'reading' | 'read' | null
) => {

  try {
    if (status === null) {
      await fetch(`${API_BASE}/user-papers/${paperId}`, {
        method: "DELETE",
      });

      setUserPapers((prev) =>
        prev.filter((up) => up.paperId !== paperId)
      );

      return;
    }

    const payload = {
      paperId,
      status,
      dateFinished: status === "read"
        ? new Date().toISOString()
        : null,
    };

    await fetch(`${API_BASE}/user-papers/${paperId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setUserPapers((prev) =>
      prev.map((up) =>
        up.paperId === paperId
          ? { ...up, status }
          : up
      )
    );

  } catch (err) {
    console.error("Failed to update status:", err);
  }
};

  const handleOpenFile = (filePath: string, paperId?: string) => {
    // Open in-app PDF reader + chat
    setOpenedPdfPath(filePath);
    if (paperId) {
      setOpenedPaperId(paperId);
    }
  };

  const handleViewChange = async (viewId: string) => {
    setActiveView(viewId);
    
    // Handle category view
    if (viewId.startsWith('category-')) {
      const categoryId = viewId.replace('category-', '');
      try {
        const res = await fetch(`${API_BASE}/categories/${categoryId}/papers`);
        const papers = await res.json();
        setCategoryPapers(papers);
        
        // Fetch category details for title
        const catRes = await fetch(`${API_BASE}/categories`);
        const categories = await catRes.json();
        const category = categories.find((c: Category) => c.id === categoryId);
        setSelectedCategory(category || null);
      } catch (err) {
        console.error('Failed to fetch category papers:', err);
      }
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      const res = await fetch(`${API_BASE}/papers/${paperId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete paper");
      }

      setPapers(papers.filter((p) => p.id !== paperId));
      setUserPapers(userPapers.filter((up) => up.paperId !== paperId));
      handleCloseDetails();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "An error occurred while deleting the paper");
    }
  };

  const selectedUserPaper = selectedPaper
    ? userPapers.find((up) => up.paperId === selectedPaper.id)
    : undefined;

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        userLists={[]} // not supported
        onCreateList={() => {}}
      />

      <div className="flex-1 overflow-y-auto">
        {activeView === 'home' && (
          <HomeView
            papers={papers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}

        {activeView === 'library' && (
          <LibraryView
            papers={papers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}

        {activeView === 'to-read' && (
          <ToReadView
            papers={papers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}

        {activeView === 'reading' && (
          <ReadingView
            papers={papers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}

        {activeView === 'read' && (
          <ReadView
            papers={papers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}

        {activeView === 'account' && (
          <AccountView
            userBooks={userPapers}
            researchPapers={papers}
          />
        )}

        {activeView.startsWith('category-') && selectedCategory && (
          <CategoryView
            category={selectedCategory}
            papers={categoryPapers}
            userPapers={userPapers}
            onPaperClick={handlePaperClick}
            onAddPaper={() => setShowAddModal(true)}
          />
        )}
      </div>

      {selectedPaper && (
        <PaperDetails
          paper={selectedPaper}
          userPaper={selectedUserPaper}
          onClose={handleCloseDetails}
          onChangeStatus={(status) => handleChangeStatus(selectedPaper.id, status)}
          onOpenFile={() => handleOpenFile(selectedPaper.filePath, selectedPaper.id)}
          onDeletePaper={() => handleDeletePaper(selectedPaper.id)}
        />
      )}

      {showAddModal && (
        <AddPaperModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPaper}
        />
      )}

      {openedPdfPath && (
        <PdfReaderWithChat
          filePath={openedPdfPath}
          paperId={openedPaperId}
          onClose={() => {
            setOpenedPdfPath(null);
            setOpenedPaperId(null);
          }}
          onNotesSaved={() => {
            // Refetch papers to get updated notes
            fetchPapers();
          }}
        />
      )}
    </div>
  );
}

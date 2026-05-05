import { Home, FileText, User, Library, Clock, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserList, Category } from '../types';

const API_BASE = "http://127.0.0.1:8000";

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userLists: UserList[];
  onCreateList: () => void;
}

export function AppSidebar({
  activeView,
  onViewChange,
  userLists,
  onCreateList,
}: AppSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#c97fc5');

  const navItems = [
    { id: 'home', label: 'My Papers', icon: Home },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'to-read', label: 'To Read', icon: FileText },
    { id: 'reading', label: 'Reading', icon: Clock },
    { id: 'read', label: 'Read', icon: CheckCircle },
    { id: 'account', label: 'Account', icon: User },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          color: newCategoryColor,
        }),
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories([newCategory, ...categories]);
        setNewCategoryName('');
        setShowCategoryInput(false);
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCategories(categories.filter((cat) => cat.id !== categoryId));
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6" style={{ color: '#c97fc5' }} />
          <h1 className="text-2xl font-bold text-gray-900">PaperVault</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Manage your research</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeView === item.id
                    ? ''
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={activeView === item.id ? { backgroundColor: '#f5e6f0', color: '#c97fc5' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Categories Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
            <button
              onClick={() => setShowCategoryInput(!showCategoryInput)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Add category"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {showCategoryInput && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCategoryInput(false)}
                  className="flex-1 px-2 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No categories yet</p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => onViewChange(`category-${category.id}`)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                    activeView === `category-${category.id}`
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-700 flex-1 truncate">{category.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                    title="Delete category"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e0b4df' }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">Researcher</p>
            <p className="text-xs text-gray-500">researcher@email.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

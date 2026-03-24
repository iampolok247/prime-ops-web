import { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Calendar, 
  TrendingUp, 
  ListChecks, 
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  MessageSquare,
  Tag
} from 'lucide-react';

export default function DMDailyChecklist() {
  const [checklist, setChecklist] = useState(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [currentTaskIndex, setCurrentTaskIndex] = useState(null);
  const [taskForm, setTaskForm] = useState({ task: '', category: 'General' });
  const [doneComment, setDoneComment] = useState('');

  const categories = [
    'Lead Management',
    'Content Creation',
    'Social Media',
    'Paid Campaigns',
    'Analytics & Reporting',
    'Market Research',
    'General'
  ];

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async (forceReset = false) => {
    try {
      setLoading(true);
      setError('');
      const baseUrl = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
      const resetParam = forceReset ? '?reset=true' : '';
      const res = await api.authFetch(`${baseUrl}/api/dm/daily-checklist${resetParam}`);
      const data = await res.json();
      setChecklist(data.checklist);
      setCompletionPercentage(data.completionPercentage);
    } catch (err) {
      setError(err.message || 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const baseUrl = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
      const res = await api.authFetch(`${baseUrl}/api/dm/daily-checklist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm)
      });
      const data = await res.json();
      setChecklist(data.checklist);
      setCompletionPercentage(data.completionPercentage);
      setShowAddModal(false);
      setTaskForm({ task: '', category: 'General' });
    } catch (err) {
      alert(err.message || 'Failed to add task');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const baseUrl = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
      const res = await api.authFetch(`${baseUrl}/api/dm/daily-checklist/edit/${currentTaskIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm)
      });
      const data = await res.json();
      setChecklist(data.checklist);
      setCompletionPercentage(data.completionPercentage);
      setShowEditModal(false);
      setTaskForm({ task: '', category: 'General' });
      setCurrentTaskIndex(null);
    } catch (err) {
      alert(err.message || 'Failed to edit task');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const baseUrl = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
      const res = await api.authFetch(`${baseUrl}/api/dm/daily-checklist/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskIndex: currentTaskIndex, 
          comment: doneComment 
        })
      });
      const data = await res.json();
      setChecklist(data.checklist);
      setCompletionPercentage(data.completionPercentage);
      setShowDoneModal(false);
      setDoneComment('');
      setCurrentTaskIndex(null);
    } catch (err) {
      alert(err.message || 'Failed to complete task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      setUpdating(true);
      const baseUrl = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
      const res = await api.authFetch(`${baseUrl}/api/dm/daily-checklist/delete/${currentTaskIndex}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setChecklist(data.checklist);
      setCompletionPercentage(data.completionPercentage);
      setShowDeleteModal(false);
      setCurrentTaskIndex(null);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (index) => {
    const task = checklist.items[index];
    setCurrentTaskIndex(index);
    setTaskForm({ task: task.task, category: task.category || 'General' });
    setShowEditModal(true);
  };

  const openDoneModal = (index) => {
    setCurrentTaskIndex(index);
    setDoneComment('');
    setShowDoneModal(true);
  };

  const openDeleteModal = (index) => {
    setCurrentTaskIndex(index);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => loadChecklist()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const completedCount = checklist?.items.filter(item => item.completed).length || 0;
  const totalCount = checklist?.items.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Daily Task Checklist
            </h1>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">{today}</span>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Today's Progress</h2>
                <p className="text-sm text-gray-600">
                  {completedCount} of {totalCount} tasks completed
                </p>
              </div>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {completionPercentage}%
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Tasks List */}
        {totalCount === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No tasks yet</h3>
            <p className="text-gray-500 mb-4">Click "Add Task" to get started with your daily checklist</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Your First Task
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center gap-2 text-white">
                <ListChecks className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Daily Responsibilities</h2>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {checklist?.items.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 transition-all ${
                    item.completed ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium mb-1 ${
                        item.completed ? 'line-through text-gray-500' : 'text-gray-800'
                      }`}>
                        {item.task}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          <Tag className="w-3 h-3" />
                          {item.category || 'General'}
                        </span>
                        {item.completed && item.completedAt && (
                          <span className="text-gray-500">
                            Completed: {new Date(item.completedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {item.comment && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>{item.comment}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!item.completed && (
                        <>
                          <button
                            onClick={() => openDoneModal(index)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as done"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openEditModal(index)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openDeleteModal(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add New Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description *
                </label>
                <textarea
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                  placeholder="Enter task description..."
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {updating ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Task</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description *
                </label>
                <textarea
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Done Modal */}
      {showDoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Mark as Done</h3>
              <button
                onClick={() => setShowDoneModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCompleteTask}>
              <div className="mb-4">
                <p className="text-gray-700 mb-4">
                  <strong>Task:</strong> {checklist.items[currentTaskIndex]?.task}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Comment (Optional)
                </label>
                <textarea
                  value={doneComment}
                  onChange={(e) => setDoneComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  placeholder="Add notes about how you completed this task..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDoneModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Mark as Done'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Delete Task</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this task?
              <br /><br />
              <strong>"{checklist.items[currentTaskIndex]?.task}"</strong>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {updating ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

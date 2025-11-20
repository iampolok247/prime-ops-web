import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Users, 
  Tag, 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  Flag,
  Clock,
  User,
  Plus,
  Send,
  Download,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS = {
  Low: '#60A5FA',
  Medium: '#FBBF24',
  High: '#F97316',
  Critical: '#EF4444'
};

const STATUS_COLORS = {
  'To Do': '#9CA3AF',
  'In Progress': '#3B82F6',
  'In Review': '#8B5CF6',
  'Completed': '#22C55E',
  'Backlog': '#6B7280'
};

const TAG_OPTIONS = ['Admission', 'Accounting', 'Recruitment', 'Digital Marketing', 'Motion Graphics', 'SEO', 'Social Media', 'Content Creation', 'Administration', 'Management'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS = ['To Do', 'In Progress', 'In Review', 'Completed'];

export default function TaskDetailModal({ task: initialTask, taskId, isOpen, onClose, onUpdate }) {
  const { user } = useAuth();
  const [task, setTask] = useState(initialTask || null);
  const [loading, setLoading] = useState(!initialTask);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Set task from prop if provided
  useEffect(() => {
    if (initialTask) {
      setTask(initialTask);
      setEditForm({
        title: initialTask.title,
        description: initialTask.description,
        status: initialTask.status,
        priority: initialTask.priority,
        dueDate: initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '',
        tags: initialTask.tags || [],
        assignedTo: initialTask.assignedTo?.map(u => u._id || u) || []
      });
      setLoading(false);
    }
  }, [initialTask]);

  useEffect(() => {
    if (isOpen && (taskId || initialTask)) {
      if (!initialTask) {
        loadTask();
      }
      loadUsers();
    }
  }, [isOpen, taskId, initialTask]);

  const loadTask = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const isAdmin = ['SuperAdmin', 'Admin'].includes(user?.role);
      const response = isAdmin ? await api.listAllTasks() : await api.listMyTasks();
      const foundTask = (response.tasks || []).find(t => t._id === taskId);
      
      if (foundTask) {
        setTask(foundTask);
        setEditForm({
          title: foundTask.title,
          description: foundTask.description,
          status: foundTask.status,
          priority: foundTask.priority,
          dueDate: foundTask.dueDate ? foundTask.dueDate.split('T')[0] : '',
          tags: foundTask.tags || [],
          assignedTo: foundTask.assignedTo?.map(u => u._id || u) || []
        });
      }
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.listUsers();
      const usersList = response.users || response.data || [];
      setAllUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUpdateTask = async () => {
    try {
      await api.updateTask(taskId, editForm);
      await loadTask();
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.addTaskComment(taskId, { text: newComment });
      setNewComment('');
      await loadTask();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleToggleChecklist = async (itemId, completed) => {
    try {
      await api.updateChecklistItem(taskId, itemId, completed);
      await loadTask();
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    try {
      const updatedChecklist = [...(task.checklist || []), { text: newChecklistItem, completed: false }];
      await api.updateTask(taskId, { checklist: updatedChecklist });
      setNewChecklistItem('');
      await loadTask();
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const isAssignedUser = task?.assignedTo?.some(u => u._id === user?._id);
  const canEdit = isAdmin || task?.assignedBy?._id === user?._id || isAssignedUser;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : !task ? (
          <div className="p-8 text-center">Task not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
              )}
            </div>

            {/* Status, Priority, Due Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Flag size={16} /> Status
                </label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: STATUS_COLORS[task.status] }}
                  >
                    {task.status}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Flag size={16} /> Priority
                </label>
                {isEditing ? (
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  >
                    {task.priority}
                  </span>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} /> Due Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : task.dueDate ? (
                  <p className="text-gray-900">{format(new Date(task.dueDate), 'MMM dd, yyyy')}</p>
                ) : (
                  <p className="text-gray-400">No due date</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              )}
            </div>

            {/* Assigned To */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} /> Assigned To
              </label>
              {isEditing ? (
                <select
                  multiple
                  value={editForm.assignedTo}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    assignedTo: Array.from(e.target.selectedOptions, opt => opt.value) 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={5}
                >
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.name || u.fullName}</option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {task.assignedTo?.map(u => (
                    <span key={u._id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      <User size={14} />
                      {u.name || u.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag size={16} /> Tags
              </label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <label key={tag} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.tags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({ ...editForm, tags: [...editForm.tags, tag] });
                          } else {
                            setEditForm({ ...editForm, tags: editForm.tags.filter(t => t !== tag) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{tag}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {task.tags?.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CheckSquare size={16} /> Checklist 
                {task.checklist?.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({task.checklist.filter(item => item.completed).length}/{task.checklist.length} completed)
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {task.checklist?.map(item => (
                  <div key={item._id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleToggleChecklist(item._id, e.target.checked)}
                      disabled={!canEdit}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.text}
                      </p>
                      {item.completed && item.completedBy && (
                        <p className="text-xs text-gray-400 mt-1">
                          Completed by {item.completedBy.name || item.completedBy.fullName} on {format(new Date(item.completedAt), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                      placeholder="Add checklist item..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddChecklistItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {task.attachments?.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip size={16} /> Attachments
                </label>
                <div className="space-y-2">
                  {task.attachments.map(attachment => (
                    <div key={attachment._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                      <Paperclip size={16} className="text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded by {attachment.uploadedBy?.name || attachment.uploadedBy?.fullName} on {format(new Date(attachment.uploadedAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare size={16} /> Comments ({task.comments?.length || 0})
              </label>
              <div className="space-y-4 mb-4">
                {task.comments?.map(comment => (
                  <div key={comment._id} className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-gray-500" />
                      <span className="font-medium text-sm text-gray-900">
                        {comment.author?.name || comment.author?.fullName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                    {comment.mentions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {comment.mentions.map(mention => (
                          <span key={mention._id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            @{mention.name || mention.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4 mt-6">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Assigned By:</span> {task.assignedBy?.name || task.assignedBy?.fullName}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!loading && task && (
          <div className="border-t p-4 flex items-center justify-between bg-gray-50">
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={handleDeleteTask}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete Task
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
                        tags: task.tags || [],
                        assignedTo: task.assignedTo?.map(u => u._id) || []
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Task
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

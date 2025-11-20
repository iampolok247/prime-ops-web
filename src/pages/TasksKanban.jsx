import React, { useEffect, useState } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskCreateModal from '../components/TaskCreateModal';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  User,
  MessageSquare,
  Paperclip,
  MoreVertical
} from 'lucide-react';

// Color coding constants
const STATUS_COLORS = {
  'Backlog': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' },
  'To Do': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', dot: 'bg-gray-500' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  'In Review': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  'Overdue': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-600' }
};

const PRIORITY_COLORS = {
  'Low': { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-400' },
  'Medium': { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  'High': { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
  'Critical': { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' }
};

const TAG_OPTIONS = ['Admission', 'Accounting', 'Recruitment', 'Digital Marketing', 'Motion Graphics', 'SEO', 'Social Media', 'Content Creation', 'Administration', 'Management'];

const BOARD_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Completed'];

// Helper function to get deadline color based on how close the due date is
function getDeadlineColor(dueDate, status) {
  if (!dueDate || status === 'Completed') return null;
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Overdue (red)
  if (diffDays < 0) {
    return { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-600', label: 'Overdue' };
  }
  // Due today or tomorrow (red warning)
  if (diffDays <= 1) {
    return { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500', label: diffDays === 0 ? 'Due Today' : 'Due Tomorrow' };
  }
  // Due within 3 days (orange warning)
  if (diffDays <= 3) {
    return { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500', label: `${diffDays} days left` };
  }
  // Due within a week (yellow warning)
  if (diffDays <= 7) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-500', label: `${diffDays} days left` };
  }
  // More than a week (normal)
  return { bg: 'bg-gray-50', text: 'text-gray-600', icon: 'text-gray-500', label: null };
}

function TaskCard({ task, onClick, isDragging }) {
  // Add safety check for task
  if (!task) return null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.dueDate && task.status !== 'Completed' && new Date(task.dueDate) < new Date();
  const statusColor = isOverdue ? STATUS_COLORS['Overdue'] : (STATUS_COLORS[task.status] || STATUS_COLORS['To Do']);
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium'];
  const deadlineColor = getDeadlineColor(task.dueDate, task.status);

  const checklistProgress = task.checklist?.length > 0
    ? `${task.checklist.filter(item => item.completed).length}/${task.checklist.length}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md border-l-4 ${priorityColor?.dot?.replace('bg-', 'border-') || 'border-gray-400'} p-3 mb-2.5 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all hover:scale-[1.01]`}
    >
      {/* Header: Priority & Status */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-full ${priorityColor?.bg || 'bg-gray-100'} ${priorityColor?.text || 'text-gray-700'} font-bold uppercase tracking-wide`}>
          {task.priority || 'Medium'}
        </span>
        {isOverdue && (
          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-semibold flex items-center gap-1 animate-pulse">
            <AlertCircle size={12} /> Overdue
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-navy mb-3 text-sm leading-tight">{task.title}</h3>

      {/* Assignment Info - More Prominent */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2.5 mb-3 space-y-1.5">
        {/* Assigned By */}
        {task.assignedBy && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
              <User size={13} className="text-blue-600" />
              <span className="text-gray-600">From:</span>
            </div>
            <span className="font-semibold text-blue-900">{task.assignedBy.name || task.assignedBy.fullName}</span>
          </div>
        )}

        {/* Assigned To */}
        {task.assignedTo?.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-purple-700 font-medium">
              <Users size={13} className="text-purple-600" />
              <span className="text-gray-600">To:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {task.assignedTo.map((user, idx) => (
                <span key={user._id || idx} className="font-semibold text-purple-900 bg-white px-2 py-0.5 rounded">
                  {user.name || user.fullName || 'Unknown'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 italic">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-medium border border-gray-300">
              <Tag size={10} className="inline mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="space-y-2 text-xs pt-3 border-t border-gray-200">
        {/* Due Date with Color Indicator */}
        {task.dueDate && (
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${deadlineColor?.bg || 'bg-gray-50'} border ${deadlineColor?.bg?.replace('bg-', 'border-').replace('-100', '-200') || 'border-gray-200'}`}>
            <Calendar size={14} className={`${deadlineColor?.icon || 'text-gray-500'} flex-shrink-0`} />
            <div className="flex items-center gap-2 flex-1">
              <span className={`font-semibold ${deadlineColor?.text || 'text-gray-600'}`}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {deadlineColor?.label && (
                <span className={`px-2 py-0.5 rounded-full font-bold ${deadlineColor.bg} ${deadlineColor.text}`}>
                  {deadlineColor.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Activity Indicators */}
        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-3 text-gray-600">
            {/* Checklist Progress */}
            {checklistProgress && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-green-200">
                <CheckCircle2 size={13} className="text-green-600" />
                <span className="font-semibold text-green-700">{checklistProgress}</span>
              </div>
            )}

            {/* Comments Count */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-blue-200" title="Comments">
              <MessageSquare size={13} className="text-blue-600" />
              <span className="font-semibold text-blue-700">{task.comments?.length || 0}</span>
            </div>

            {/* Attachments Count */}
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-purple-200">
                <Paperclip size={13} className="text-purple-600" />
                <span className="font-semibold text-purple-700">{task.attachments.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onCardClick, onAddTask, activeId, isAdmin }) {
  const columnTasks = tasks.filter(t => t.boardColumn === column);
  const taskCount = columnTasks.length;
  const taskIds = columnTasks.map(t => t._id);

  const { setNodeRef, isOver } = useSortable({
    id: column,
    data: {
      type: 'column',
      accepts: ['task']
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] max-w-[280px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-3 transition-all ${
        isOver ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-400 shadow-lg' : 'border-2 border-gray-200'
      }`}
    >
      {/* Column Header */}
      <div className="mb-4 pb-3 border-b-2 border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[column]?.dot || 'bg-gray-400'} shadow-md`}></div>
            <h2 className="font-bold text-navy text-base">{column}</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[column]?.bg || 'bg-gray-200'} ${STATUS_COLORS[column]?.text || 'text-gray-700'}`}>
              {taskCount}
            </span>
          </div>
          <button
            onClick={() => onAddTask(column)}
            className="p-2 hover:bg-white rounded-lg transition shadow-sm border border-gray-300 hover:border-blue-400 hover:shadow-md"
            title={isAdmin ? 'Assign task' : 'Create task'}
          >
            <Plus size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
          {columnTasks.map(task => (
            <TaskCard 
              key={task._id} 
              task={task} 
              onClick={(e) => onCardClick(task, e)}
              isDragging={activeId === task._id}
            />
          ))}
          {taskCount === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TasksKanban() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [filterAssignedBy, setFilterAssignedBy] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadTasks = async () => {
    try {
      setLoading(true);
      const isAdmin = ['SuperAdmin', 'Admin'].includes(user?.role);
      const data = isAdmin ? await api.listAllTasks() : await api.listMyTasks();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Check if we need to open a specific task (from notification click)
  useEffect(() => {
    const taskIdToOpen = sessionStorage.getItem('openTaskId');
    const taskDataToOpen = sessionStorage.getItem('openTaskData');
    
    if (taskIdToOpen) {
      // First try to find task in current tasks
      if (tasks.length > 0) {
        const task = tasks.find(t => t._id === taskIdToOpen);
        if (task) {
          setSelectedTask(task);
          sessionStorage.removeItem('openTaskId');
          sessionStorage.removeItem('openTaskData');
          return;
        }
      }
      
      // If task not found in current tasks but we have the data, use it
      if (taskDataToOpen) {
        try {
          const taskData = JSON.parse(taskDataToOpen);
          setSelectedTask(taskData);
          sessionStorage.removeItem('openTaskId');
          sessionStorage.removeItem('openTaskData');
        } catch (e) {
          console.error('Failed to parse task data:', e);
          sessionStorage.removeItem('openTaskId');
          sessionStorage.removeItem('openTaskData');
        }
      }
    }
  }, [tasks]);

  // Get unique users for filters
  const allUsers = React.useMemo(() => {
    const userMap = new Map();
    tasks.forEach(task => {
      if (task.assignedBy) {
        userMap.set(task.assignedBy._id, task.assignedBy);
      }
      task.assignedTo?.forEach(user => {
        if (user) userMap.set(user._id, user);
      });
    });
    return Array.from(userMap.values()).sort((a, b) => 
      (a.name || a.fullName || '').localeCompare(b.name || b.fullName || '')
    );
  }, [tasks]);

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    if (filterTags.length > 0 && !filterTags.some(tag => task.tags?.includes(tag))) return false;
    if (filterAssignedBy && task.assignedBy?._id !== filterAssignedBy) return false;
    if (filterAssignedTo && !task.assignedTo?.some(user => user._id === filterAssignedTo)) return false;
    return true;
  });

  const handleCardClick = (task, e) => {
    // Prevent opening modal when dragging
    if (e?.defaultPrevented) return;
    setSelectedTask(task);
  };

  const handleAddTask = (column) => {
    setShowCreateModal(true);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id;
    const targetColumn = over.id;

    // Find the task being dragged
    const task = tasks.find(t => t._id === taskId);
    if (!task || task.boardColumn === targetColumn) return;

    try {
      // Update board position
      await api.updateBoardPosition(taskId, {
        boardColumn: targetColumn,
        boardPosition: 0
      });

      // Reload tasks to reflect changes
      await loadTasks();
    } catch (error) {
      console.error('Error moving task:', error);
      alert('Failed to move task');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-royal">Loading tasks...</div>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Task Board
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  {['SuperAdmin', 'Admin'].includes(user?.role) 
                    ? `Manage and track all team tasks • ${filteredTasks.length} tasks` 
                    : `Your assigned tasks • ${filteredTasks.length} tasks`}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus size={20} />
                {['SuperAdmin', 'Admin'].includes(user?.role) ? 'Assign Task' : 'New Task'}
              </button>
            </div>
            
            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">🟦 Low</option>
                  <option value="Medium">🟨 Medium</option>
                  <option value="High">🟧 High</option>
                  <option value="Critical">🟥 Critical</option>
                </select>

                {/* Tags Filter */}
                <select
                  value={filterTags[0] || ''}
                  onChange={(e) => setFilterTags(e.target.value ? [e.target.value] : [])}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="">All Tags</option>
                  {TAG_OPTIONS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>

                {/* Assigned By Filter - Only for Admin/SuperAdmin */}
                {['SuperAdmin', 'Admin'].includes(user?.role) && (
                  <select
                    value={filterAssignedBy}
                    onChange={(e) => setFilterAssignedBy(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">👤 Assigned By: All</option>
                    {allUsers.filter(u => tasks.some(t => t.assignedBy?._id === u._id)).map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name || user.fullName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Assigned To Filter - Only for Admin/SuperAdmin */}
                {['SuperAdmin', 'Admin'].includes(user?.role) && (
                  <select
                    value={filterAssignedTo}
                    onChange={(e) => setFilterAssignedTo(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">👥 Assigned To: All</option>
                    {allUsers.filter(u => tasks.some(t => t.assignedTo?.some(a => a._id === u._id))).map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name || user.fullName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Clear Filters Button */}
                {(searchQuery || filterPriority || filterTags.length > 0 || filterAssignedBy || filterAssignedTo) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterPriority('');
                      setFilterTags([]);
                      setFilterAssignedBy('');
                      setFilterAssignedTo('');
                    }}
                    className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Active Filters Summary */}
              {(filterPriority || filterTags.length > 0 || filterAssignedBy || filterAssignedTo) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">Active Filters:</span>
                  {filterPriority && (
                    <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      Priority: {filterPriority}
                    </span>
                  )}
                  {filterTags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      Tag: {tag}
                    </span>
                  ))}
                  {filterAssignedBy && (
                    <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      From: {allUsers.find(u => u._id === filterAssignedBy)?.name || 'Unknown'}
                    </span>
                  )}
                  {filterAssignedTo && (
                    <span className="text-xs px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                      To: {allUsers.find(u => u._id === filterAssignedTo)?.name || 'Unknown'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {BOARD_COLUMNS.map(column => (
                <KanbanColumn
                  key={column}
                  column={column}
                  tasks={filteredTasks}
                  onCardClick={handleCardClick}
                  onAddTask={handleAddTask}
                  activeId={activeId}
                  isAdmin={['SuperAdmin', 'Admin'].includes(user?.role)}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <TaskCard 
              task={tasks.find(t => t._id === activeId)} 
              onClick={() => {}}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          taskId={selectedTask._id}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadTasks}
        />
      )}

      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadTasks}
      />
    </>
  );
}

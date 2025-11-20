import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter,
  Download,
  TrendingUp,
  ListChecks,
  AlertCircle,
  Users,
  Search
} from 'lucide-react';

export default function AdminTaskReport() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, daily, weekly, monthly, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, completed, pending
  const [selectedUserId, setSelectedUserId] = useState('all'); // all or specific user ID
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filterType, customStartDate, customEndDate, statusFilter, selectedUserId]);

  const loadUsers = async () => {
    try {
      const data = await api.listUsers();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.listAllTasks();
      let allTasks = data.tasks || [];
      
      // Filter by user if selected
      if (selectedUserId !== 'all') {
        allTasks = allTasks.filter(task => 
          task.assignedTo && task.assignedTo.includes(selectedUserId)
        );
      }
      
      // Apply date filter
      let filtered = filterTasksByDate(allTasks);
      
      // Apply status filter
      if (statusFilter === 'completed') {
        filtered = filtered.filter(t => t.status === 'Completed');
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(t => t.status !== 'Completed');
      }
      
      // Sort by due date (most recent first)
      filtered.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt);
        const dateB = new Date(b.dueDate || b.createdAt);
        return dateB - dateA;
      });
      
      setTasks(filtered);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasksByDate = (tasks) => {
    const now = new Date();
    
    switch (filterType) {
      case 'daily': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate || task.createdAt);
          return taskDate >= today;
        });
      }
      
      case 'weekly': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate || task.createdAt);
          return taskDate >= weekAgo;
        });
      }
      
      case 'monthly': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate || task.createdAt);
          return taskDate >= monthAgo;
        });
      }
      
      case 'custom': {
        if (!customStartDate || !customEndDate) return tasks;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999); // Include end date fully
        
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate || task.createdAt);
          return taskDate >= start && taskDate <= end;
        });
      }
      
      default:
        return tasks;
    }
  };

  // Calculate statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    pending: tasks.filter(t => t.status !== 'Completed').length,
    overdue: tasks.filter(t => {
      if (t.status === 'Completed') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'On Hold': return 'bg-yellow-100 text-yellow-700';
      case 'Blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleExport = () => {
    const selectedUser = selectedUserId !== 'all' 
      ? allUsers.find(u => u._id === selectedUserId)
      : null;
    
    const filename = selectedUser
      ? `task-report-${selectedUser.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      : `task-report-all-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Convert tasks to CSV
    const headers = ['Title', 'Status', 'Priority', 'Due Date', 'Assigned To', 'Assigned By', 'Tags'];
    const rows = tasks.map(task => [
      task.title,
      task.status,
      task.priority,
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
      task.assignedTo?.map(id => {
        const u = allUsers.find(user => user._id === id);
        return u?.name || 'Unknown';
      }).join(', ') || 'N/A',
      task.assignedBy?.name || 'N/A',
      task.tags?.join(', ') || 'N/A'
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUserName = selectedUserId === 'all' 
    ? 'All Employees' 
    : allUsers.find(u => u._id === selectedUserId)?.name || 'Unknown';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Admin Task Report</h1>
          <p className="text-gray-600 mt-1">View and analyze employee task performance</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Employee Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
          <Users size={20} />
          Select Employee
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Box */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Employee</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Employee Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee ({selectedUserName})
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Employees</option>
              {filteredUsers.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} - {user.designation || user.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-navy mt-1">{stats.total}</p>
            </div>
            <ListChecks size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-navy mt-1">{stats.completed}</p>
            </div>
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-navy mt-1">{stats.pending}</p>
            </div>
            <Clock size={32} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-navy mt-1">{stats.overdue}</p>
            </div>
            <AlertCircle size={32} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
            <TrendingUp size={20} />
            Completion Rate - {selectedUserName}
          </h3>
          <span className="text-2xl font-bold text-navy">{completionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
          <Filter size={20} />
          Filters
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed Only</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filterType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-navy">
            Task List ({tasks.length} {statusFilter === 'completed' ? 'Completed' : statusFilter === 'pending' ? 'Pending' : ''} Tasks)
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Clock size={48} className="mx-auto mb-3 animate-spin" />
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ListChecks size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No tasks found for the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-navy">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {task.assignedTo?.map(userId => {
                          const assignedUser = allUsers.find(u => u._id === userId);
                          return assignedUser ? (
                            <div key={userId} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              <img 
                                src={assignedUser.avatar} 
                                alt={assignedUser.name} 
                                className="w-4 h-4 rounded-full"
                              />
                              {assignedUser.name}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">No due date</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.assignedBy?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {task.tags?.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ListTodo, Plus, CheckCircle, Circle, Clock, User, Calendar, Trash2, Edit2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
  category: 'operational' | 'maintenance' | 'inventory' | 'client';
  createdAt: string;
}

const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Restock Tattoo Needles',
    description: 'Order more round liner and magnum needles from Pro Needle Co.',
    assignedTo: 'u2',
    assignedToName: 'Mike Johnson',
    dueDate: '2026-02-08',
    priority: 'high',
    status: 'todo',
    category: 'inventory',
    createdAt: '2026-02-06'
  },
  {
    id: 't2',
    title: 'Clean and Sterilize Equipment',
    description: 'Daily sterilization of all tattoo machines and piercing tools',
    assignedTo: 'u3',
    assignedToName: 'Alex Rivera',
    dueDate: '2026-02-07',
    priority: 'high',
    status: 'completed',
    category: 'maintenance',
    createdAt: '2026-02-07'
  },
  {
    id: 't3',
    title: 'Follow up with Emma Wilson',
    description: 'Call to confirm appointment details and send aftercare instructions',
    assignedTo: 'u2',
    assignedToName: 'Mike Johnson',
    dueDate: '2026-02-08',
    priority: 'medium',
    status: 'in-progress',
    category: 'client',
    createdAt: '2026-02-06'
  },
  {
    id: 't4',
    title: 'Update Portfolio Gallery',
    description: 'Upload new photos from recent sessions to portfolio',
    assignedTo: 'u4',
    assignedToName: 'Jamie Chen',
    dueDate: '2026-02-10',
    priority: 'low',
    status: 'todo',
    category: 'operational',
    createdAt: '2026-02-05'
  },
  {
    id: 't5',
    title: 'Inspect Autoclave Machine',
    description: 'Monthly inspection and maintenance of autoclave sterilization machine',
    assignedTo: 'u2',
    assignedToName: 'Mike Johnson',
    dueDate: '2026-02-09',
    priority: 'high',
    status: 'todo',
    category: 'maintenance',
    createdAt: '2026-02-05'
  },
  {
    id: 't6',
    title: 'Review Client Feedback',
    description: 'Review and respond to recent client reviews and feedback',
    assignedTo: 'u2',
    assignedToName: 'Mike Johnson',
    dueDate: '2026-02-08',
    priority: 'medium',
    status: 'in-progress',
    category: 'client',
    createdAt: '2026-02-06'
  },
  {
    id: 't7',
    title: 'Order Aftercare Products',
    description: 'Restock aftercare cream and antibacterial soap inventory',
    assignedTo: 'u2',
    assignedToName: 'Mike Johnson',
    dueDate: '2026-02-11',
    priority: 'medium',
    status: 'todo',
    category: 'inventory',
    createdAt: '2026-02-06'
  }
];

export function TaskManagement() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filter, setFilter] = useState<'all' | Task['status']>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

  const toggleTaskStatus = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newStatus = 
          task.status === 'todo' ? 'in-progress' :
          task.status === 'in-progress' ? 'completed' :
          'todo';
        return { ...task, status: newStatus };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getCategoryColor = (category: Task['category']) => {
    switch (category) {
      case 'operational':
        return 'bg-blue-100 text-blue-700';
      case 'maintenance':
        return 'bg-purple-100 text-purple-700';
      case 'inventory':
        return 'bg-orange-100 text-orange-700';
      case 'client':
        return 'bg-teal-100 text-teal-700';
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date('2026-02-07');
    const due = new Date(dueDate);
    return due < today;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-500 mt-1">Manage and track studio tasks</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Circle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">To Do</p>
              <p className="text-2xl font-bold text-gray-900">{todoCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 text-red-600 p-3 rounded-lg">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">{highPriorityCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inventory">Inventory</option>
                  <option value="client">Client</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter task description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Mike Johnson</option>
                  <option>Alex Rivera</option>
                  <option>Jamie Chen</option>
                  <option>Taylor Brooks</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                onClick={(e) => { e.preventDefault(); setShowAddForm(false); alert('Task created!'); }}
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 inline-flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('todo')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'todo'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          To Do ({todoCount})
        </button>
        <button
          onClick={() => setFilter('in-progress')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'in-progress'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white border-2 rounded-xl p-6 transition-all ${
              task.status === 'completed'
                ? 'border-gray-200 opacity-60'
                : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleTaskStatus(task.id)}
                className="mt-1 flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 fill-green-100" />
                ) : task.status === 'in-progress' ? (
                  <Clock className="w-6 h-6 text-yellow-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400 hover:text-purple-600" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${
                      task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                  </span>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                    {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                  </span>

                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    {task.assignedToName}
                  </span>

                  <span className={`flex items-center gap-1 text-sm ${
                    isOverdue(task.dueDate) && task.status !== 'completed'
                      ? 'text-red-600 font-medium'
                      : 'text-gray-600'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    {new Date(task.dueDate).toLocaleDateString()}
                    {isOverdue(task.dueDate) && task.status !== 'completed' && (
                      <span className="ml-1 text-xs">(Overdue)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No tasks found</p>
            <p className="text-sm mt-1">Create a new task to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

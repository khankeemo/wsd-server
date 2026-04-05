"use strict";
// C:\websmith\app\tasks\services\taskService.ts
// Task Service - Handles all API calls for tasks
// Features: Create, Read, Update, Delete operations
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTask = exports.getTasks = void 0;
const apiService_1 = __importDefault(require("../../../core/services/apiService"));
// Get all tasks
const getTasks = async () => {
    try {
        const response = await apiService_1.default.get('/tasks');
        return response.data.data || response.data;
    }
    catch (error) {
        console.error('Get tasks error:', error);
        throw error.response?.data?.message || 'Failed to fetch tasks';
    }
};
exports.getTasks = getTasks;
// Get single task
const getTask = async (id) => {
    try {
        const response = await apiService_1.default.get(`/tasks/${id}`);
        return response.data.data || response.data;
    }
    catch (error) {
        console.error('Get task error:', error);
        throw error.response?.data?.message || 'Failed to fetch task';
    }
};
exports.getTask = getTask;
// Create task
const createTask = async (task) => {
    try {
        const response = await apiService_1.default.post('/tasks', task);
        return response.data.data || response.data;
    }
    catch (error) {
        console.error('Create task error:', error);
        throw error.response?.data?.message || 'Failed to create task';
    }
};
exports.createTask = createTask;
// Update task
const updateTask = async (id, task) => {
    try {
        const response = await apiService_1.default.put(`/tasks/${id}`, task);
        return response.data.data || response.data;
    }
    catch (error) {
        console.error('Update task error:', error);
        throw error.response?.data?.message || 'Failed to update task';
    }
};
exports.updateTask = updateTask;
// Delete task
const deleteTask = async (id) => {
    try {
        await apiService_1.default.delete(`/tasks/${id}`);
    }
    catch (error) {
        console.error('Delete task error:', error);
        throw error.response?.data?.message || 'Failed to delete task';
    }
};
exports.deleteTask = deleteTask;

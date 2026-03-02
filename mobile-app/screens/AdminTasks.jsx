import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminTasks = ({ navigation }) => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Sanitize Station 1', assignedTo: 'Mike', completed: false },
    { id: 2, title: 'Order Paper Towels', assignedTo: 'Admin', completed: true },
    { id: 3, title: 'Confirm Appointments for Tomorrow', assignedTo: 'Sarah', completed: false },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="checkbox" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {tasks.map(task => (
        <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => toggleTask(task.id)}>
          <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
            {task.completed && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <View style={styles.taskContent}>
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
            <Text style={styles.taskAssignee}>Assigned to: {task.assignedTo}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { padding: 20 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#f59e0b', marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#f59e0b' },
  taskContent: { flex: 1 },
  taskTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#6b7280' },
  taskAssignee: { color: '#9ca3af', fontSize: 12 },
});

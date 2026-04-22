/**
 * AdminTasks.jsx -- Studio Task Checklist
 * Local state task management with themed checkboxes.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { ArrowLeft, CheckSquare, Square, ClipboardList } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { EmptyState } from '../src/components/shared/EmptyState';

export const AdminTasks = ({ navigation }) => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Sanitize Station 1', assignedTo: 'Mike', completed: false },
    { id: 2, title: 'Order Paper Towels', assignedTo: 'Admin', completed: true },
    { id: 3, title: 'Confirm Appointments for Tomorrow', assignedTo: 'Sarah', completed: false },
    { id: 4, title: 'Restock Ink Cartridges', assignedTo: 'Admin', completed: false },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completed = tasks.filter(t => t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{completed}/{tasks.length} completed</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRail}>
          <View style={[styles.progressFill, { width: `${tasks.length > 0 ? (completed / tasks.length) * 100 : 0}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tasks.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tasks" subtitle="All studio tasks will appear here" />
        ) : (
          tasks.map(task => (
            <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => toggleTask(task.id)} activeOpacity={0.7}>
              {task.completed ? (
                <CheckSquare size={22} color={colors.success} />
              ) : (
                <Square size={22} color={colors.textTertiary} />
              )}
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
                <Text style={styles.taskAssignee}>Assigned to: {task.assignedTo}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  progressWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff' },
  progressRail: { height: 6, backgroundColor: colors.lightBgSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  taskContent: { flex: 1 },
  taskTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textTertiary },
  taskAssignee: { ...typography.bodyXSmall, color: colors.textTertiary },
});

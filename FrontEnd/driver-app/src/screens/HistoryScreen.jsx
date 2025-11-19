import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, cancelled

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // For now, we'll use sample data since the backend endpoint might not exist
      // In a real app, this would be: const response = await api.get('/driver/history');
      
      const sampleHistory = [
        {
          id: '1',
          patientName: 'Robert Wilson',
          emergencyType: 'Cardiac Arrest',
          completedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          responseTime: 6,
          distance: 2.5,
          rating: 5,
          status: 'completed'
        },
        {
          id: '2',
          patientName: 'Emma Davis',
          emergencyType: 'Road Accident',
          completedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          responseTime: 8,
          distance: 3.2,
          rating: 4,
          status: 'completed'
        },
        {
          id: '3',
          patientName: 'James Thompson',
          emergencyType: 'Stroke',
          completedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          responseTime: 5,
          distance: 5.1,
          rating: 5,
          status: 'completed'
        }
      ];
      
      setHistory(sampleHistory);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load emergency history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getEmergencyIcon = (type) => {
    const icons = {
      'Cardiac Arrest': 'heart-circle',
      'Road Accident': 'car-sport',
      'Stroke': 'pulse',
      'Allergic Reaction': 'alert-circle',
      'Diabetic Emergency': 'water',
      'Pregnancy Complications': 'woman'
    };
    return icons[type] || 'medical';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0A6CF1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency History</Text>
        <Text style={styles.headerSubtitle}>Your completed emergency responses</Text>
      </View>

      <View style={styles.content}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>No emergency history yet</Text>
            <Text style={styles.emptySubtext}>
              Completed emergencies will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Ionicons 
                      name={getEmergencyIcon(item.emergencyType)} 
                      size={24} 
                      color="#0A6CF1" 
                    />
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <Text style={styles.emergencyType}>{item.emergencyType}</Text>
                    </View>
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{formatDate(item.completedAt)}</Text>
                  </View>
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.statText}>{item.responseTime} min</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="navigate" size={16} color="#666" />
                    <Text style={styles.statText}>{item.distance} km</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.statText}>{item.rating}/5</Text>
                  </View>
                </View>

                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, styles.completedBadge]}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#0A6CF1',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  historyList: {
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A6CF1',
    marginBottom: 2,
  },
  emergencyType: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
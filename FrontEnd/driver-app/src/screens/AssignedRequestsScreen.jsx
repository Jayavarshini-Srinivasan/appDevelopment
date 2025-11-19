import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function AssignedRequestsScreen({ navigation }) {
  const [assigned, setAssigned] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      const [assignedRes, pendingRes] = await Promise.all([
        api.get('/driver/requests/assigned'),
        api.get('/driver/requests/pending'),
      ]);
      const assignedData = assignedRes.data.data || [];
      const pendingData = pendingRes.data.data || [];

      setAssigned(assignedData);
      setPending(pendingData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render data exactly as returned by backend

  const handleAccept = async (emergencyId) => {
    try {
      await api.post(`/driver/requests/${emergencyId}/accept`);
      Alert.alert('Success', 'Request accepted');
      loadRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleReject = async (emergencyId) => {
    try {
      await api.post(`/driver/requests/${emergencyId}/reject`);
      Alert.alert('Success', 'Request rejected');
      loadRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const handleComplete = async (emergencyId) => {
    try {
      await api.post(`/driver/requests/${emergencyId}/complete`);
      Alert.alert('Success', 'Request completed');
      loadRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete request');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0A6CF1" />
      </View>
    );
  }

  const requests = activeTab === 'pending' ? pending : assigned;

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

  const getSeverityColor = (severity) => {
    const colors = {
      'Critical': '#FF3B3B',
      'Severe': '#FF9500',
      'Moderate': '#FFCC00',
      'Low': '#34C759'
    };
    return colors[severity] || '#0A6CF1';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': '#FF3B3B',
      'high': '#FF9500',
      'moderate': '#FFCC00',
      'low': '#34C759'
    };
    return colors[priority] || '#0A6CF1';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Requests</Text>
        <Text style={styles.headerSubtitle}>Manage your emergency assignments</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons name="time-outline" size={20} color={activeTab === 'pending' ? '#fff' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assigned' && styles.tabActive]}
          onPress={() => setActiveTab('assigned')}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={activeTab === 'assigned' ? '#fff' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'assigned' && styles.tabTextActive]}>
            Assigned ({assigned.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {requests.map((request) => (
          <TouchableOpacity key={request.id} style={styles.card} activeOpacity={0.8} onPress={() => {
            if (activeTab === 'assigned') {
              navigation.navigate('Navigation', { request });
            }
          }}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons 
                  name={getEmergencyIcon(request.emergencyType)} 
                  size={24} 
                  color={getSeverityColor(request.severity)} 
                />
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{request.patientName || 'Patient'}</Text>
                  <Text style={styles.cardSubtitle}>{request.emergencyType}</Text>
                </View>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) }]}>
                <Text style={styles.priorityText}>{request.priority?.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Ionicons name="warning" size={16} color={getSeverityColor(request.severity)} />
                <Text style={[styles.infoText, { color: getSeverityColor(request.severity) }]}>
                  {request.severity} Severity
                </Text>
              </View>

              {request.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#0A6CF1" />
                  <Text style={styles.infoText}>{request.location.address}</Text>
                </View>
              )}

              {request.location?.landmark && (
                <View style={styles.infoRow}>
                  <Ionicons name="flag" size={16} color="#666" />
                  <Text style={styles.landmarkText}>{request.location.landmark}</Text>
                </View>
              )}

              {request.patientAge && (
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text style={styles.infoText}>Age: {request.patientAge}</Text>
                </View>
              )}

              {request.estimatedDistance && (
                <View style={styles.infoRow}>
                  <Ionicons name="navigate" size={16} color="#0A6CF1" />
                  <Text style={styles.infoText}>
                    {request.estimatedDistance} km • {request.estimatedTime} min away
                  </Text>
                </View>
              )}

              {request.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Text style={styles.descriptionText}>{request.description}</Text>
                </View>
              )}
            </View>
            
            {activeTab === 'pending' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAccept(request.id)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(request.id)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {activeTab === 'assigned' && request.status !== 'completed' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => navigation.navigate('Navigation', { request })}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleComplete(request.id)}
                >
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
        
        {requests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>No emergency requests available</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'pending' 
                ? 'New emergency requests will appear here'
                : 'Accepted emergencies will appear here'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A6CF1',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#0A6CF1',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A6CF1',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  landmarkText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  descriptionContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#FF3B3B',
  },
  completeButton: {
    backgroundColor: '#0A6CF1',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 14,
  },
});


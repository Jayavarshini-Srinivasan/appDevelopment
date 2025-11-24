import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalCompleted: 0, completedToday: 0, rating: 0 });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [assignedRequests, setAssignedRequests] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setStats({ totalCompleted: 0, completedToday: 0, rating: 0 });
      setCurrentLocation(null);
      setPendingRequests(0);
      setAssignedRequests(0);
      setIsOnDuty(false);
      return;
    }

    loadDashboardData();
    loadEmergencyRequests();
    loadDutyStatus();

    const interval = setInterval(() => {
      loadDashboardData();
      loadEmergencyRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isOnDuty) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnDuty]);

  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!user) return;
      loadEmergencyRequests();
      loadDashboardData();
      loadDutyStatus();
    });
    return unsubscribe;
  }, [navigation, user]);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, locationResponse] = await Promise.all([
        api.get('/driver/stats'),
        api.get('/driver/location/current')
      ]);

      if (statsResponse.data.data) {
        setStats(statsResponse.data.data);
      }

      if (locationResponse && locationResponse.data && typeof locationResponse.data.data !== 'undefined') {
        setCurrentLocation(locationResponse.data.data);
      } else {
        setCurrentLocation(null);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error.message || error);
    }
  };

  const loadEmergencyRequests = async () => {
    try {
      const [pendingResponse, assignedResponse] = await Promise.all([
        api.get('/driver/requests/pending'),
        api.get('/driver/requests/assigned')
      ]);

      setPendingRequests(pendingResponse.data.data?.length || 0);
      setAssignedRequests(assignedResponse.data.data?.length || 0);
    } catch (error) {
      console.error('Error loading emergency requests:', error);
    }
  };

  const loadDutyStatus = async () => {
    try {
      const profileResponse = await api.get('/driver/profile');
      if (profileResponse.data.data) {
        const dutyStatus = profileResponse.data.data.isOnDuty || false;
        setIsOnDuty(dutyStatus);
      }
    } catch (error) {
      console.error('Error loading duty status:', error);
    }
  };

  const toggleDuty = async () => {
    setLoading(true);
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await api.post('/driver/duty/toggle', { isOnDuty: newStatus });
      Alert.alert('Status Updated', newStatus ? 'You are now ON DUTY' : 'You are now OFF DUTY');
    } catch (error) {
      console.error('Error toggling duty:', error.response?.data || error.message);
      setIsOnDuty(!newStatus); // Revert on error
      Alert.alert('Error', 'Failed to update duty status');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    if (!user) {
      Alert.alert('Authentication required', 'Please log in to start location tracking');
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for duty mode.');
        setIsOnDuty(false);
        return;
      }

      setIsTracking(true);

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      await updateDriverLocation(currentLocation.coords);

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 20,
        },
        async (location) => {
          await updateDriverLocation(location.coords);
        }
      );

      if (watchRef.current) {
        try { await watchRef.current.remove(); } catch { }
      }
      watchRef.current = sub;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
      setIsOnDuty(false);
    }
  };

  const stopLocationTracking = () => {
    setIsTracking(false);
    if (watchRef.current) {
      try {
        watchRef.current.remove();
      } catch { }
      watchRef.current = null;
    }
  };

  const updateDriverLocation = async (coords) => {
    if (!user) return;
    try {
      const { latitude, longitude } = coords;
      await api.post('/driver/location', {
        latitude,
        longitude,
        isOnDuty: isOnDuty
      });
      setCurrentLocation({ latitude, longitude });
    } catch (error) {
      console.error('Error updating location:', error.message);
    }
  };

  const handleViewRequests = () => {
    navigation.navigate('AssignedRequests');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const getLocationStatus = () => {
    if (!isOnDuty) return 'Offline';
    if (currentLocation) return 'Active';
    if (isTracking) return 'Acquiring...';
    return 'Unavailable';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A6CF1" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.driverName}>{user?.email?.split('@')[0] || 'Driver'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
            <Text style={styles.profileButtonText}>{user?.email?.[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>

        {/* Duty Status Card */}
        <View style={styles.dutyCard}>
          <View style={styles.dutyHeader}>
            <View style={styles.dutyStatusContainer}>
              <View style={[styles.statusDot, isOnDuty ? styles.statusDotActive : styles.statusDotInactive]} />
              <Text style={styles.dutyStatusText}>
                {isOnDuty ? 'You are Online' : 'You are Offline'}
              </Text>
            </View>
            {isOnDuty && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>GPS {getLocationStatus()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.dutyDescription}>
            {isOnDuty
              ? 'You are visible to nearby emergencies. Stay alert for incoming requests.'
              : 'Go online to start receiving emergency requests.'}
          </Text>

          <TouchableOpacity
            style={[styles.dutyButton, isOnDuty ? styles.dutyButtonActive : styles.dutyButtonInactive]}
            onPress={toggleDuty}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.dutyButtonText}>
                {isOnDuty ? 'GO OFFLINE' : 'GO ONLINE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completedToday}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.rating || '4.8'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{assignedRequests}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Emergency Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests</Text>

          {isOnDuty ? (
            <View>
              <TouchableOpacity
                style={styles.requestCard}
                onPress={handleViewRequests}
              >
                <View style={[styles.iconContainer, styles.iconPending]}>
                  <Text style={styles.iconText}>🚨</Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>New Emergencies</Text>
                  <Text style={styles.requestSubtitle}>{pendingRequests} waiting for acceptance</Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.requestCard}
                onPress={handleViewRequests}
              >
                <View style={[styles.iconContainer, styles.iconActive]}>
                  <Text style={styles.iconText}>📍</Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>Active Missions</Text>
                  <Text style={styles.requestSubtitle}>{assignedRequests} currently in progress</Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.offlineState}>
              <Text style={styles.offlineStateText}>Go online to view requests</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleViewProfile}>
              <View style={styles.actionIconBg}>
                <Text style={styles.actionIcon}>👤</Text>
              </View>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('History')}>
              <View style={styles.actionIconBg}>
                <Text style={styles.actionIcon}>📊</Text>
              </View>
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AssignedRequests')}>
              <View style={styles.actionIconBg}>
                <Text style={styles.actionIcon}>🗺️</Text>
              </View>
              <Text style={styles.actionLabel}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#0A6CF1',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeLabel: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dutyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  dutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dutyStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusDotInactive: {
    backgroundColor: '#EF4444',
  },
  dutyStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  locationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  dutyDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  dutyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dutyButtonActive: {
    backgroundColor: '#EF4444',
  },
  dutyButtonInactive: {
    backgroundColor: '#10B981',
  },
  dutyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '23%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A6CF1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconPending: {
    backgroundColor: '#FEF2F2',
  },
  iconActive: {
    backgroundColor: '#EFF6FF',
  },
  iconText: {
    fontSize: 24,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  requestSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  offlineState: {
    backgroundColor: '#F1F5F9',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  offlineStateText: {
    color: '#64748B',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
});
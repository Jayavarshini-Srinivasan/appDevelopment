import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const { userData, logout } = useAuth();
  const [driverProfile, setDriverProfile] = useState(null);
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Connectivity states
  const [backendStatus, setBackendStatus] = useState('unknown'); // 'ok' | 'failed' | 'checking'
  const [firestoreBackendStatus, setFirestoreBackendStatus] = useState('unknown'); // backend view of Firestore
  const [firestoreClientStatus, setFirestoreClientStatus] = useState('unknown'); // client SDK connection
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      console.log('Loading profile data...');
      console.log('API baseURL:', api.defaults.baseURL);
      
      // Load user profile from auth/me
      console.log('Calling /auth/me...');
      const userResponse = await api.get('/auth/me');
      console.log('Auth me response:', userResponse.data);
      
      if (userResponse.data.data) {
        const userInfo = userResponse.data.data;
        console.log('User info:', userInfo);
        setName(userInfo.name || userInfo.displayName || '');
        setLicense(userInfo.license || userInfo.driverLicense || '');
        setPhone(userInfo.phone || userInfo.phoneNumber || '');
      }

      // Load driver-specific profile
      console.log('Calling /driver/profile...');
      const driverResponse = await api.get('/driver/profile');
      console.log('Driver profile response:', driverResponse.data);
      
      if (driverResponse.data.data) {
        const driverInfo = driverResponse.data.data;
        console.log('Driver info:', driverInfo);
        setDriverProfile(driverInfo);
        setVehicleType(driverInfo.vehicleType || '');
        setVehicleNumber(driverInfo.vehicleNumber || '');
        // Prefer driver profile for core fields if present
        setName((driverInfo.name ?? name) || '');
        setLicense((driverInfo.license ?? license) || '');
        setPhone((driverInfo.phone ?? phone) || '');
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error config:', error.config);
      const fallbackUser = userData || (auth.currentUser ? { email: auth.currentUser.email } : null);
      if (fallbackUser) {
        setName(fallbackUser.name || fallbackUser.email || '');
        setLicense(fallbackUser.license || '');
        setPhone(fallbackUser.phone || '');
        setDriverProfile({
          vehicleType: '',
          vehicleNumber: '',
          stats: { totalCompleted: 0, completedToday: 0 },
          isOnDuty: false,
        });
      } else {
        Alert.alert('Error', `Failed to load profile data: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setFetching(false);
      // Run connectivity check after we fetch profile
      checkConnectivity();
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !license.trim()) {
      Alert.alert('Error', 'Name and License are required fields');
      return;
    }

    setLoading(true);
    try {
      // Update user profile
      await api.put('/auth/profile', {
        name: name.trim(),
        license: license.trim(),
        phone: phone.trim()
      });

      // Update driver profile
      if (vehicleType.trim() || vehicleNumber.trim()) {
        await api.put('/driver/profile', {
          vehicleType: vehicleType.trim(),
          vehicleNumber: vehicleNumber.trim()
        });
      }

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      const status = error?.response?.status;
      const backendMsg = error?.response?.data?.message || error?.message || 'Unknown error';
      Alert.alert('Error', `Failed to update profile: ${backendMsg}${status ? ` (status ${status})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel editing - reload original data
      loadProfile();
    }
    setIsEditing(!isEditing);
  };

  const checkConnectivity = async () => {
    setCheckingConnectivity(true);
    setBackendStatus('checking');
    setFirestoreBackendStatus('checking');
    setFirestoreClientStatus('checking');

    try {
      // Backend health check - call root /health (not under /api)
      try {
        const baseHost = api.defaults.baseURL.replace(/\/api\/?$/, '');
        const backendHealthUrl = `${baseHost}/health`;
        const res = await fetch(backendHealthUrl);
        setBackendStatus(res.ok ? 'ok' : 'failed');
      } catch (err) {
        setBackendStatus('failed');
        console.error('Backend health check failed:', err);
      }

      // Backend's Firestore connectivity check, via API endpoint
      try {
        const healthFs = await api.get('/health/firestore');
        setFirestoreBackendStatus(healthFs?.data?.status === 'ok' ? 'ok' : 'failed');
      } catch (err) {
        setFirestoreBackendStatus('failed');
        console.error('Backend firestore check failed:', err);
      }

      // Client-side Firestore SDK check (attempt to read users/<uid>)
      try {
        if (!db) {
          throw new Error('Firestore client not configured');
        }
        const uid = auth?.currentUser?.uid;
        if (!uid) {
          // If not logged in, we still consider client SDK initialized
          setFirestoreClientStatus('ok');
        } else {
          const userDocRef = doc(db, 'users', uid);
          const docSnap = await getDoc(userDocRef);
          setFirestoreClientStatus(docSnap.exists() ? 'ok' : 'failed');
        }
      } catch (err) {
        setFirestoreClientStatus('failed');
        console.error('Client Firestore check failed:', err);
      }

      setLastChecked(new Date());
    } finally {
      setCheckingConnectivity(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0A6CF1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Profile</Text>
        <TouchableOpacity 
          style={[styles.editButton, isEditing && styles.cancelButton]} 
          onPress={handleToggleEdit}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Connectivity Status */}
      <View style={styles.connectivityContainer}>
        <View style={styles.connectivityItem}>
          <View style={[styles.connectivityDot, backendStatus === 'ok' ? styles.connected : styles.disconnected]} />
          <Text style={styles.connectivityLabel}>Backend</Text>
          <Text style={styles.connectivityValue}>{backendStatus}</Text>
        </View>
        <View style={styles.connectivityItem}>
          <View style={[styles.connectivityDot, firestoreBackendStatus === 'ok' ? styles.connected : styles.disconnected]} />
          <Text style={styles.connectivityLabel}>Backend → Firestore</Text>
          <Text style={styles.connectivityValue}>{firestoreBackendStatus}</Text>
        </View>
        <View style={styles.connectivityItem}>
          <View style={[styles.connectivityDot, firestoreClientStatus === 'ok' ? styles.connected : styles.disconnected]} />
          <Text style={styles.connectivityLabel}>Firestore (Client)</Text>
          <Text style={styles.connectivityValue}>{firestoreClientStatus}</Text>
        </View>
        <TouchableOpacity style={styles.checkButton} onPress={checkConnectivity} disabled={checkingConnectivity}>
          {checkingConnectivity ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkButtonText}>Check</Text>}
        </TouchableOpacity>
      </View>
      <Text style={styles.lastChecked}>Last checked: {lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}</Text>

      {/* Driver Summary Card */}
      {driverProfile && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Driver Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{driverProfile.stats?.totalCompleted || 0}</Text>
              <Text style={styles.summaryLabel}>Total Emergencies</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{driverProfile.stats?.completedToday || 0}</Text>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{driverProfile.stats?.averageRating || driverProfile.rating || 0}</Text>
              <Text style={styles.summaryLabel}>Rating</Text>
            </View>
          </View>
        </View>
      )}

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.disabled]}
          value={userData?.email || ''}
          editable={false}
        />
        
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          editable={isEditing}
        />
        
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 123-4567"
          editable={isEditing}
          keyboardType="phone-pad"
        />
        
        <Text style={styles.label}>License Number *</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          value={license}
          onChangeText={setLicense}
          placeholder="Enter your driver license number"
          editable={isEditing}
        />
      </View>

      {/* Vehicle Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        
        <Text style={styles.label}>Vehicle Type</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          value={vehicleType}
          onChangeText={setVehicleType}
          placeholder="e.g., Ambulance, Medical Transport"
          editable={isEditing}
        />
        
        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="e.g., AMB001, MED002"
          editable={isEditing}
        />
      </View>

      {/* Emergency Statistics */}
      {driverProfile && (driverProfile.stats?.emergencyTypes || driverProfile.emergencyTypes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Response Statistics</Text>
          <View style={styles.statsContainer}>
            {Object.entries(driverProfile.stats?.emergencyTypes || driverProfile.emergencyTypes || {}).map(([type, count]) => (
              <View key={type} style={styles.statItem}>
                <Text style={styles.statType}>{type}</Text>
                <Text style={styles.statCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {isEditing ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A6CF1',
  },
  editButton: {
    backgroundColor: '#0A6CF1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  connectivityContainer: {
    marginHorizontal: 15,
    marginTop: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectivityItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectivityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  connected: {
    backgroundColor: '#16A34A',
  },
  disconnected: {
    backgroundColor: '#EF4444',
  },
  connectivityLabel: {
    fontSize: 12,
    color: '#374151',
  },
  connectivityValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkButton: {
    backgroundColor: '#0A6CF1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  lastChecked: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 15,
    marginTop: 8,
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A6CF1',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  disabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statType: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A6CF1',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  button: {
    backgroundColor: '#0A6CF1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
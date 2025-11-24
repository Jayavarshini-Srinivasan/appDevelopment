import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { auth } from '../../firebaseConfig';

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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userResponse = await api.get('/auth/me');
      if (userResponse.data.data) {
        const userInfo = userResponse.data.data;
        setName(userInfo.name || userInfo.displayName || '');
        setLicense(userInfo.license || userInfo.driverLicense || '');
        setPhone(userInfo.phone || userInfo.phoneNumber || '');
      }

      const driverResponse = await api.get('/driver/profile');
      if (driverResponse.data.data) {
        const driverInfo = driverResponse.data.data;
        setDriverProfile(driverInfo);
        setVehicleType(driverInfo.vehicleType || '');
        setVehicleNumber(driverInfo.vehicleNumber || '');
        setName((driverInfo.name ?? name) || '');
        setLicense((driverInfo.license ?? license) || '');
        setPhone((driverInfo.phone ?? phone) || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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
      }
    } finally {
      setFetching(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !license.trim()) {
      Alert.alert('Error', 'Name and License are required fields');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/profile', {
        name: name.trim(),
        license: license.trim(),
        phone: phone.trim()
      });

      if (vehicleType.trim() || vehicleNumber.trim()) {
        await api.put('/driver/profile', {
          vehicleType: vehicleType.trim(),
          vehicleNumber: vehicleNumber.trim()
        });
      }

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      loadProfile();
    }
    setIsEditing(!isEditing);
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A6CF1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <TouchableOpacity
            style={[styles.editButton, isEditing && styles.cancelButton]}
            onPress={handleToggleEdit}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Driver Summary Card */}
        {driverProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Performance Summary</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{driverProfile.stats?.totalCompleted || 0}</Text>
                <Text style={styles.statLabel}>Total Trips</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{driverProfile.stats?.completedToday || 0}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{driverProfile.stats?.averageRating || driverProfile.rating || '4.8'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userData?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              editable={isEditing}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={license}
              onChangeText={setLicense}
              placeholder="Driver License Number"
              editable={isEditing}
            />
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={vehicleType}
              onChangeText={setVehicleType}
              placeholder="e.g. Ambulance"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. AMB-001"
              editable={isEditing}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {isEditing ? (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  editButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    borderColor: 'transparent',
    color: '#334155',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
    borderColor: 'transparent',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
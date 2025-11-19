import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

export default function NavigationScreen({ route }) {
  const { request } = route.params || {};
  const [driverCoords, setDriverCoords] = useState(null);
  const [patientCoords, setPatientCoords] = useState(null);
  const [loading, setLoading] = useState(true);

  const patientPhone = request?.patientPhone || request?.phone || null;
  const loc = request?.location || {};
  const lat = loc?.latitude;
  const lng = loc?.longitude;

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const d = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setDriverCoords(d);
        if (typeof lat === 'number' && typeof lng === 'number') {
          setPatientCoords({ latitude: lat, longitude: lng });
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleCall = () => {
    if (!patientPhone) {
      Alert.alert('Unavailable', 'Patient phone not available');
      return;
    }
    Linking.openURL(`tel:${patientPhone}`);
  };

  const openGoogleMaps = () => {
    if (!driverCoords || !patientCoords) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverCoords.latitude},${driverCoords.longitude}&destination=${patientCoords.latitude},${patientCoords.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0A6CF1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}> 
        <Text style={styles.info}>Open directions in Google Maps on web.</Text>
        {driverCoords && patientCoords && (
          <TouchableOpacity style={[styles.callButton, { marginTop: 12 }]} onPress={openGoogleMaps}>
            <Text style={styles.callText}>Open Google Maps Directions</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.title}>{request?.patientName || 'Patient'}</Text>
          <Text style={styles.subtitle}>{loc?.address || ''}</Text>
        </View>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  info: { color: '#666' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  footerInfo: { flex: 1, paddingRight: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  callButton: { backgroundColor: '#0A6CF1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  callText: { color: '#fff', fontWeight: '600' },
});
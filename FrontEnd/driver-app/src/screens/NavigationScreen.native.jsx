import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

export default function NavigationScreen({ route }) {
  const { request } = route.params || {};
  const [driverCoords, setDriverCoords] = useState(null);
  const [patientCoords, setPatientCoords] = useState(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  const patientPhone = request?.patientPhone || request?.phone || null;
  const loc = request?.location || {};
  const lat = loc?.latitude;
  const lng = loc?.longitude;

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Location permission is needed');
          setLoading(false);
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const d = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setDriverCoords(d);
        let p = null;
        if (typeof lat === 'number' && typeof lng === 'number') {
          p = { latitude: lat, longitude: lng };
        }
        if (p) {
          setPatientCoords(p);
          const midLat = (d.latitude + p.latitude) / 2;
          const midLng = (d.longitude + p.longitude) / 2;
          const latDelta = Math.abs(d.latitude - p.latitude) + 0.05;
          const lngDelta = Math.abs(d.longitude - p.longitude) + 0.05;
          setInitialRegion({ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta });
          const haversineKm = (a, b) => {
            const toRad = x => x * Math.PI / 180;
            const dLat = toRad(b.latitude - a.latitude);
            const dLng = toRad(b.longitude - a.longitude);
            const la1 = toRad(a.latitude);
            const la2 = toRad(b.latitude);
            const h = Math.sin(dLat/2)**2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng/2)**2;
            return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
          };
          const dist = haversineKm(d, p);
          setDistanceKm(Number(dist.toFixed(2)));
          const eta = Math.round((dist / 30) * 60);
          setEtaMinutes(eta);
        } else {
          setInitialRegion({ latitude: d.latitude, longitude: d.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to get location');
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

  const simulateTravel = async () => {
    if (!driverCoords || !patientCoords || simulating) return;
    setSimulating(true);
    const steps = 20;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    try {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const lat = driverCoords.latitude + (patientCoords.latitude - driverCoords.latitude) * t;
        const lng = driverCoords.longitude + (patientCoords.longitude - driverCoords.longitude) * t;
        const next = { latitude: lat, longitude: lng };
        setDriverCoords(next);
        try {
          const api = require('../services/api').default;
          await api.post('/driver/location', { latitude: lat, longitude: lng });
        } catch {}
        await sleep(1000);
      }
      try {
        if (request?.id) {
          const api = require('../services/api').default;
          await api.post(`/driver/requests/${request.id}/complete`, {});
        }
      } catch {}
    } finally {
      setSimulating(false);
    }
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
      {initialRegion ? (
        <MapView style={styles.map} initialRegion={initialRegion}>
          {driverCoords && (
            <Marker coordinate={driverCoords} title="Your Location" pinColor="#0A6CF1" />
          )}
          {patientCoords && (
            <Marker coordinate={patientCoords} title="Patient Location" pinColor="#FF3B3B" />
          )}
          {driverCoords && patientCoords && (
            <Polyline coordinates={[driverCoords, patientCoords]} strokeColor="#0A6CF1" strokeWidth={4} />
          )}
        </MapView>
      ) : (
        <View style={styles.center}><Text style={styles.info}>Location unavailable</Text></View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.title}>{request?.patientName || 'Patient'}</Text>
          <Text style={styles.subtitle}>{loc?.address || ''}</Text>
          {distanceKm != null && etaMinutes != null && (
            <Text style={styles.meta}>{distanceKm} km • ~{etaMinutes} min</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={[styles.callButton, { marginRight: 10 }]} onPress={handleCall}>
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callButton, simulating && { opacity: 0.6 }]} disabled={simulating} onPress={simulateTravel}>
            <Text style={styles.callText}>{simulating ? 'Navigating…' : 'Start'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { color: '#666' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  footerInfo: { flex: 1, paddingRight: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  callButton: { backgroundColor: '#0A6CF1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  callText: { color: '#fff', fontWeight: '600' },
});
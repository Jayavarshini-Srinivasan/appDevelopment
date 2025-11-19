import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';

const dLat = (meters, lat) => meters / 111320;
const dLng = (meters, lat) => meters / (111320 * Math.cos((lat * Math.PI) / 180));

const decodePolyline = (str) => {
  let index = 0, lat = 0, lng = 0, coords = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
};

const MapNative = ({ location }) => {
  const [driver, setDriver] = useState(null);
  const [route, setRoute] = useState([]);
  const [etaMin, setEtaMin] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const timerRef = useRef(null);
  const mapRef = useRef(null);
  const driverAnimRef = useRef(null);

  const initialRegion = useMemo(() => {
    const lat = location?.latitude ?? 19.076;
    const lng = location?.longitude ?? 72.8777;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }, [location]);

  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;
    const lat = location.latitude;
    const lng = location.longitude;
    const br = Math.random() * 2 * Math.PI;
    const dv = { latitude: lat + dLat(2000, lat) * Math.cos(br), longitude: lng + dLng(2000, lat) * Math.sin(br) };
    setDriver(dv);
    driverAnimRef.current = new AnimatedRegion({ latitude: dv.latitude, longitude: dv.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      const straight = interpolatePath([dv, { latitude: lat, longitude: lng }]);
      setRoute(straight);
      const distKm = computeDistanceKm(dv, { latitude: lat, longitude: lng });
      setDistanceKm(distKm.toFixed(2));
      const avgSpeedKmh = 30;
      setEtaMin(Math.round((distKm / avgSpeedKmh) * 60));
      return;
    }
    (async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${dv.latitude},${dv.longitude}&destination=${lat},${lng}&mode=driving&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        const leg = data?.routes?.[0]?.legs?.[0];
        const points = data?.routes?.[0]?.overview_polyline?.points;
        if (leg && points) {
          setEtaMin(Math.round((leg.duration.value || 0) / 60));
          setDistanceKm(((leg.distance.value || 0) / 1000).toFixed(2));
          setRoute(decodePolyline(points));
        } else {
          const straight = interpolatePath([dv, { latitude: lat, longitude: lng }]);
          setRoute(straight);
        }
      } catch {
        const straight = interpolatePath([dv, { latitude: lat, longitude: lng }]);
        setRoute(straight);
      }
    })();
  }, [location]);

  useEffect(() => {
    if (!route.length || !driver) return;
    let idx = 0;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= route.length) {
        clearInterval(timerRef.current);
        return;
      }
      const next = route[idx];
      setDriver(next);
      if (driverAnimRef.current?.timing) {
        driverAnimRef.current.timing({ latitude: next.latitude, longitude: next.longitude, duration: 550, useNativeDriver: false }).start();
      }
      if (mapRef.current?.animateCamera) {
        mapRef.current.animateCamera({ center: { latitude: next.latitude, longitude: next.longitude } }, { duration: 500 });
      }
    }, 600);
    if (mapRef.current?.fitToCoordinates) {
      try {
        const coords = [...route, driver, location].filter(Boolean);
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 80, bottom: 120, left: 80 }, animated: true });
      } catch {}
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [route]);

  const interpolatePath = (points) => {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const steps = 30;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        out.push({ latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t });
      }
    }
    return out;
  };

  const computeDistanceKm = (a, b) => {
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad((b.latitude || 0) - (a.latitude || 0));
    const dLng = toRad((b.longitude || 0) - (a.longitude || 0));
    const la1 = toRad(a.latitude || 0);
    const la2 = toRad(b.latitude || 0);
    const h = Math.sin(dLat/2)**2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation={true}>
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="Patient" />
        )}
        {driver && driverAnimRef.current ? (
          <Marker.Animated coordinate={driverAnimRef.current} title="Driver" pinColor="#0A6CF1" />
        ) : (
          driver && <Marker coordinate={driver} title="Driver" pinColor="#0A6CF1" />
        )}
        {route.length > 0 && <Polyline coordinates={route} strokeColor="#0A6CF1" strokeWidth={3} />}
      </MapView>
      <View style={styles.overlay}><Text style={styles.overlayText}>ETA {etaMin ?? '-'} min • {distanceKm ?? '-'} km</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },
  map: { flex: 1, width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  overlayText: { color: '#fff', fontSize: 12 }
});

export default MapNative;
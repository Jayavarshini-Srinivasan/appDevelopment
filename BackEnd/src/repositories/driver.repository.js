const { db } = require('../config/firebase');

const isMock = !db;

// Mock data store
let mockLiveLocations = {};
let mockDriverStats = {};

const updateDutyStatus = async (driverId, isOnDuty) => {
  if (isMock) {
    console.log('[Mock] Updating duty status:', driverId, isOnDuty);
    return { success: true };
  }
  // Update duty status in the users collection instead of drivers collection
  const userRef = db.collection('users').doc(driverId);
  await userRef.set({
    isOnDuty,
    updatedAt: new Date(),
  }, { merge: true });
  return userRef.get();
};

const updateLiveLocation = async (driverId, location) => {
  if (isMock) {
    mockLiveLocations[driverId] = {
      driverId,
      ...location,
      timestamp: new Date()
    };
    return { success: true };
  }
  const locationRef = db.collection('liveLocations').doc(driverId);
  await locationRef.set({
    driverId,
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: new Date(),
  });
  return locationRef.get();
};

const getLiveLocation = async (driverId) => {
  if (isMock) {
    return mockLiveLocations[driverId] || {
      driverId,
      latitude: 28.6139,
      longitude: 77.2090, // Default to New Delhi
      timestamp: new Date()
    };
  }
  const locationRef = db.collection('liveLocations').doc(driverId);
  const doc = await locationRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const getAllLiveLocations = async () => {
  if (isMock) {
    return Object.values(mockLiveLocations);
  }
  const locationsRef = db.collection('liveLocations');
  const snapshot = await locationsRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getDriverStats = async (driverId) => {
  if (isMock) {
    return mockDriverStats[driverId] || {
      totalCompleted: 15,
      completedToday: 3,
      completedThisWeek: 8,
      averageRating: 4.8,
      totalDistance: 125.5,
      totalHours: 42,
      emergencyTypes: { 'Cardiac': 5, 'Accident': 3, 'Other': 7 }
    };
  }

  // Prefer precomputed driverStats doc if available
  try {
    const statsRef = db.collection('driverStats').doc(driverId);
    const statsDoc = await statsRef.get();
    if (statsDoc.exists) {
      const data = statsDoc.data();
      // Normalize fields if necessary
      return {
        totalCompleted: data.totalCompleted || 0,
        completedToday: data.completedToday || 0,
        completedThisWeek: data.completedThisWeek || 0,
        averageRating: data.averageRating || 0,
        totalDistance: data.totalDistance || 0,
        totalHours: data.totalHours || 0,
        emergencyTypes: data.emergencyTypes || {}
      };
    }
  } catch (err) {
    // Ignore and fallback to on-the-fly computation
    console.warn('driver.repository.getDriverStats: driverStats lookup failed', err?.message || err);
  }

  // Compute from emergency documents as a fallback
  const emergenciesRef = db.collection('emergencies');
  const completed = await emergenciesRef
    .where('driverId', '==', driverId)
    .where('status', '==', 'completed')
    .get();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = completed.docs.filter(doc => {
    const data = doc.data();
    return data.completedAt && data.completedAt.toDate() >= today;
  });

  // Build emergencyType counts as best effort from emergencies list
  const emergencyTypes = {};
  completed.docs.forEach(docSnapshot => {
    const data = docSnapshot.data();
    const type = data.emergencyType || data.type || 'Other';
    emergencyTypes[type] = (emergencyTypes[type] || 0) + 1;
  });

  return {
    totalCompleted: completed.size,
    completedToday: completedToday.length,
    emergencyTypes,
    averageRating: 0,
    completedThisWeek: 0,
    totalDistance: 0,
    totalHours: 0
  };
};

const createDriverStats = async (driverId, statsData) => {
  if (isMock) {
    mockDriverStats[driverId] = statsData;
    return { id: driverId, ...statsData };
  }
  const statsRef = db.collection('driverStats').doc(driverId);
  await statsRef.set(statsData);
  return statsRef.get();
};

module.exports = {
  updateDutyStatus,
  updateLiveLocation,
  getLiveLocation,
  getAllLiveLocations,
  getDriverStats,
  createDriverStats,
};

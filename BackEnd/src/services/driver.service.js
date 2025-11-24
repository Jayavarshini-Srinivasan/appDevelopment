const driverRepository = require('../repositories/driver.repository');
const userRepository = require('../repositories/user.repository');
const emergencyRepository = require('../repositories/emergency.repository');

const toggleDutyStatus = async (driverId, isOnDuty) => {
  return await driverRepository.updateDutyStatus(driverId, isOnDuty);
};

const updateLocation = async (driverId, location) => {
  return await driverRepository.updateLiveLocation(driverId, location);
};

const getCurrentLocation = async (driverId) => {
  return await driverRepository.getLiveLocation(driverId);
};

const haversineKm = (a, b) => {
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad((b.latitude || 0) - (a.latitude || 0));
  const dLng = toRad((b.longitude || 0) - (a.longitude || 0));
  const la1 = toRad(a.latitude || 0);
  const la2 = toRad(b.latitude || 0);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const offsetNear = (origin, km = 2) => {
  const latOff = km / 111;
  const lngOff = km / (111 * Math.cos((origin.latitude || 0) * Math.PI / 180));
  const signLat = Math.random() < 0.5 ? -1 : 1;
  const signLng = Math.random() < 0.5 ? -1 : 1;
  return {
    latitude: origin.latitude + signLat * Math.random() * latOff,
    longitude: origin.longitude + signLng * Math.random() * lngOff,
  };
};

const computeRoute = (from, to, steps = 10) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    });
  }
  return pts;
};

const enrichAndPersist = async (driverLoc, emergency) => {
  const loc = emergency.location || {};
  let dest = (typeof loc.latitude === 'number' && typeof loc.longitude === 'number')
    ? { latitude: loc.latitude, longitude: loc.longitude }
    : null;
  if (!driverLoc || !driverLoc.latitude || !driverLoc.longitude) return emergency;
  const origin = { latitude: driverLoc.latitude, longitude: driverLoc.longitude };
  if (!dest) dest = offsetNear(origin, 2);
  let distanceKm = haversineKm(origin, dest);
  if (distanceKm > 2) {
    dest = offsetNear(origin, 2);
    distanceKm = haversineKm(origin, dest);
  }
  const avgSpeedKmh = 30;
  const etaMin = Math.round((distanceKm / avgSpeedKmh) * 60);
  const route = computeRoute(origin, dest, 12);

  await emergencyRepository.updateEmergency(emergency.id, {
    location: { latitude: dest.latitude, longitude: dest.longitude, address: loc.address || emergency.address || '', landmark: loc.landmark || emergency.landmark || '' },
    estimatedDistance: Number(distanceKm.toFixed(2)),
    estimatedTime: etaMin,
    route,
  });

  return { ...emergency, location: { latitude: dest.latitude, longitude: dest.longitude }, estimatedDistance: Number(distanceKm.toFixed(2)), estimatedTime: etaMin, route };
};

const getAssignedRequests = async (driverId) => {
  const list = await emergencyRepository.getEmergenciesByDriverId(driverId);
  const driverLoc = await driverRepository.getLiveLocation(driverId);
  const enriched = [];
  for (const e of list) {
    enriched.push(await enrichAndPersist(driverLoc, e));
  }
  return enriched;
};

const getPendingRequests = async (driverId) => {
  const list = await emergencyRepository.getPendingEmergencies();
  const driverLoc = await driverRepository.getLiveLocation(driverId);
  const enriched = [];
  for (const e of list) {
    enriched.push(await enrichAndPersist(driverLoc, e));
  }
  return enriched;
};

const acceptRequest = async (driverId, emergencyId) => {
  const emergency = await emergencyRepository.getEmergencyById(emergencyId);
  if (!emergency) {
    throw new Error('Emergency not found');
  }
  if (emergency.status !== 'pending') {
    throw new Error('Emergency already assigned');
  }

  await emergencyRepository.updateEmergency(emergencyId, {
    driverId,
    status: 'accepted',
    acceptedAt: new Date(),
  });

  return await emergencyRepository.getEmergencyById(emergencyId);
};

const rejectRequest = async (emergencyId) => {
  await emergencyRepository.updateEmergency(emergencyId, {
    status: 'rejected',
    rejectedAt: new Date(),
  });
  return await emergencyRepository.getEmergencyById(emergencyId);
};

const completeRequest = async (emergencyId) => {
  await emergencyRepository.updateEmergency(emergencyId, {
    status: 'completed',
    completedAt: new Date(),
  });
  return await emergencyRepository.getEmergencyById(emergencyId);
};

const getStats = async (driverId) => {
  const stats = await driverRepository.getDriverStats(driverId);
  // Return default stats if none exist
  if (!stats) {
    return {
      totalCompleted: 0,
      completedToday: 0,
      completedThisWeek: 0,
      averageRating: 0,
      totalDistance: 0,
      totalHours: 0,
      emergencyTypes: {}
    };
  }
  return stats;
};

const createStats = async (driverId, statsData) => {
  // Check if stats already exist for this driver
  const existingStats = await driverRepository.getDriverStats(driverId);
  if (existingStats) {
    throw new Error('Driver stats already exist');
  }

  // Create initial stats document
  const initialStats = {
    driverId,
    totalCompleted: statsData.totalCompleted || 0,
    completedToday: statsData.completedToday || 0,
    completedThisWeek: statsData.completedThisWeek || 0,
    averageRating: statsData.averageRating || 0,
    totalDistance: statsData.totalDistance || 0,
    totalHours: statsData.totalHours || 0,
    emergencyTypes: statsData.emergencyTypes || {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return await driverRepository.createDriverStats(driverId, initialStats);
};

const getDriverProfile = async (driverId) => {
  // Get driver data from users collection using repository
  const userData = await userRepository.getUserById(driverId);
  if (!userData) {
    throw new Error('Driver profile not found');
  }

  // Get driver stats
  const stats = await getStats(driverId);

  // Get current duty status from user document
  const isOnDuty = userData.isOnDuty || false;

  return {
    ...userData,
    stats,
    isOnDuty,
    id: driverId
  };
};

const updateDriverProfile = async (driverId, updateData) => {
  // Remove fields that shouldn't be updated directly
  const { id, stats, isOnDuty, email, role, createdAt, ...safeUpdateData } = updateData;

  await userRepository.updateUser(driverId, {
    ...safeUpdateData,
    updatedAt: new Date()
  });

  // Return updated profile
  return getDriverProfile(driverId);
};

module.exports = {
  toggleDutyStatus,
  updateLocation,
  getAssignedRequests,
  getPendingRequests,
  acceptRequest,
  rejectRequest,
  completeRequest,
  getStats,
  createStats,
  getDriverProfile,
  updateDriverProfile,
  getCurrentLocation,
};

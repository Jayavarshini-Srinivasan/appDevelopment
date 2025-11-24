const { db } = require('../config/firebase');

const isMock = !db;

// Mock data
let mockEmergencies = [
  {
    id: 'mock-emergency-1',
    patientId: 'mock-patient-1',
    type: 'Cardiac Arrest',
    status: 'pending',
    location: { latitude: 28.6129, longitude: 77.2295, address: 'India Gate, New Delhi' },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'mock-emergency-2',
    patientId: 'mock-patient-2',
    type: 'Road Accident',
    status: 'assigned',
    driverId: 'mock-driver-id',
    location: { latitude: 28.6270, longitude: 77.2160, address: 'CP, New Delhi' },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const createEmergency = async (emergencyData) => {
  if (isMock) {
    const newEmergency = {
      id: `mock-emergency-${Date.now()}`,
      ...emergencyData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockEmergencies.push(newEmergency);
    return {
      id: newEmergency.id,
      data: () => newEmergency,
      exists: true
    };
  }
  const emergencyRef = db.collection('emergencies');
  const docRef = await emergencyRef.add({
    ...emergencyData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.get();
};

const getEmergencyById = async (emergencyId) => {
  if (isMock) {
    const found = mockEmergencies.find(e => e.id === emergencyId);
    return found ? { id: found.id, ...found } : null;
  }
  const emergencyRef = db.collection('emergencies').doc(emergencyId);
  const doc = await emergencyRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const getEmergenciesByPatientId = async (patientId) => {
  if (isMock) {
    return mockEmergencies.filter(e => e.patientId === patientId);
  }
  const emergenciesRef = db.collection('emergencies');
  const snapshot = await emergenciesRef.where('patientId', '==', patientId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getEmergenciesByDriverId = async (driverId) => {
  if (isMock) {
    return mockEmergencies.filter(e => e.driverId === driverId || e.status === 'assigned'); // Return some assigned for testing
  }
  const emergenciesRef = db.collection('emergencies');
  const snapshot = await emergenciesRef.where('driverId', '==', driverId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getPendingEmergencies = async () => {
  if (isMock) {
    return mockEmergencies.filter(e => e.status === 'pending');
  }
  const emergenciesRef = db.collection('emergencies');
  const snapshot = await emergenciesRef.where('status', '==', 'pending').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getAllEmergencies = async () => {
  if (isMock) {
    return mockEmergencies;
  }
  const emergenciesRef = db.collection('emergencies');
  const snapshot = await emergenciesRef.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const updateEmergency = async (emergencyId, updateData) => {
  if (isMock) {
    const index = mockEmergencies.findIndex(e => e.id === emergencyId);
    if (index !== -1) {
      mockEmergencies[index] = { ...mockEmergencies[index], ...updateData, updatedAt: new Date() };
      return {
        id: emergencyId,
        data: () => mockEmergencies[index],
        exists: true
      };
    }
    return null;
  }
  const emergencyRef = db.collection('emergencies').doc(emergencyId);
  await emergencyRef.update({
    ...updateData,
    updatedAt: new Date(),
  });
  return emergencyRef.get();
};

module.exports = {
  createEmergency,
  getEmergencyById,
  getEmergenciesByPatientId,
  getEmergenciesByDriverId,
  getPendingEmergencies,
  getAllEmergencies,
  updateEmergency,
};

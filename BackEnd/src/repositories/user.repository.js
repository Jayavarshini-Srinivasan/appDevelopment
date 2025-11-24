const { db } = require('../config/firebase');

const isMock = !db;

const mockUser = {
  id: 'mock-user-id',
  name: 'Test Patient',
  email: 'patient1@rapidaid.com',
  role: 'patient',
  age: 34,
  bloodType: 'A+',
  conditions: ['Asthma'],
  allergies: ['Penicillin'],
  medications: ['Albuterol'],
  emergencyContact: 'Raj Patel (+15550001111)',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createUser = async (uid, userData) => {
  if (isMock) {
    console.log('[Mock] Creating user:', uid);
    Object.assign(mockUser, userData);
    return {
      id: uid,
      data: () => mockUser,
      exists: true
    };
  }
  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return userRef.get();
};

const getUserById = async (uid) => {
  if (isMock) {
    console.log('[Mock] Getting user:', uid);
    return { ...mockUser, id: uid };
  }
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const getUserByEmail = async (email) => {
  if (isMock) {
    console.log('[Mock] Getting user by email:', email);
    return mockUser;
  }
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const updateUser = async (uid, userData) => {
  if (isMock) {
    console.log('[Mock] Updating user:', uid);
    Object.assign(mockUser, userData);
    return {
      id: uid,
      data: () => mockUser,
      exists: true
    };
  }
  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    ...userData,
    updatedAt: new Date(),
  }, { merge: true });
  return userRef.get();
};

const getAllUsersByRole = async (role) => {
  if (isMock) {
    return [mockUser];
  }
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', role).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  getAllUsersByRole,
};

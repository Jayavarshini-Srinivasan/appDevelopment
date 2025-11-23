const { admin, db } = require('../config/firebase');
const userRepository = require('../repositories/user.repository');
const driverRepository = require('../repositories/driver.repository');

const register = async (email, password, userData) => {
  console.log('📝 Backend register service called for:', email);

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    console.log('ℹ️ Existing Firebase Auth user found:', userRecord.uid);
  } catch (e) {
    if (!password) {
      throw new Error('Password required to create new user');
    }
    userRecord = await admin.auth().createUser({ email, password });
    console.log('✅ Firebase Auth user created:', userRecord.uid);
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, {
    role: userData.role || 'patient',
  });
  console.log('✅ Custom claims set for role:', userData.role || 'patient');

  await userRepository.createUser(userRecord.uid, {
    email,
    role: userData.role || 'patient',
    ...userData,
  });
  console.log('✅ User data stored in Firestore');

  if (userData.role === 'driver') {
    console.log('🚛 Ensuring driver stats exist...');
    const initialStats = {
      driverId: userRecord.uid,
      totalCompleted: 0,
      completedToday: 0,
      completedThisWeek: 0,
      averageRating: 0,
      totalDistance: 0,
      totalHours: 0,
      emergencyTypes: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    try {
      await driverRepository.createDriverStats(userRecord.uid, initialStats);
      console.log('✅ Driver stats created');
    } catch {}
  }

  const token = await admin.auth().createCustomToken(userRecord.uid);
  console.log('✅ Custom token created');
  return { uid: userRecord.uid, token };
};

const login = async (email, password) => {
  // Firebase Auth handles login on client side
  // This service just verifies and returns user data
  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const getCurrentUser = async (uid) => {
  const existing = await userRepository.getUserById(uid);
  if (existing) return existing;

  const firebaseUser = await admin.auth().getUser(uid);
  const bootstrapData = {
    email: firebaseUser.email || '',
    role: 'driver',
    isActive: true,
  };
  const created = await userRepository.createUser(uid, bootstrapData);
  const doc = await created;
  return { id: doc.id, ...doc.data() };
};

const updateUserProfile = async (userId, profileData) => {
  const { name, license, phone } = profileData;
  
  // Update user document in Firestore
  const userRef = db.collection('users').doc(userId);
  const updateData = {
    name,
    license,
    phone,
    updatedAt: new Date()
  };
  
  await userRef.set(updateData, { merge: true });
  
  // Return updated user data
  const updatedDoc = await userRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
};

const createTestUser = async (email, password, userData) => {
  console.log('🧪 Creating test user:', email);
  
  // For development: create a mock user in Firestore without Firebase Auth
  // This allows testing without Admin SDK credentials
  
  const uid = Buffer.from(email).toString('base64').substring(0, 28);
  
  const userRef = db.collection('users').doc(uid);
  const userData_final = {
    email,
    role: userData.role || 'patient',
    name: userData.name || email.split('@')[0],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...userData
  };
  
  await userRef.set(userData_final, { merge: true });
  console.log('✅ Test user created in Firestore:', uid);
  
  // Generate a mock token for development
  const mockToken = Buffer.from(JSON.stringify({
    uid,
    email,
    role: userData.role || 'patient'
  })).toString('base64');
  
  return { uid, email, token: mockToken, ...userData_final };
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateUserProfile,
  createTestUser,
};


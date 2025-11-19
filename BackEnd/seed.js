const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test driver data
const testDrivers = [
  {
    email: 'driver1@rapidaid.com',
    password: 'RapidAidDriver2024!@#',
    name: 'John Smith',
    phone: '+15551234567',
    license: 'DRV123456',
    role: 'driver',
    isActive: true,
    isOnDuty: false,
    vehicleType: 'Ambulance',
    vehicleNumber: 'AMB001',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY'
    }
  },
  {
    email: 'driver2@rapidaid.com',
    password: 'RapidAidDriver2024!@#',
    name: 'Sarah Johnson',
    phone: '+15551234568',
    license: 'DRV789012',
    role: 'driver',
    isActive: true,
    isOnDuty: false,
    vehicleType: 'Medical Transport',
    vehicleNumber: 'MED002',
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'Manhattan, NY'
    }
  },
  {
    email: 'driver3@rapidaid.com',
    password: 'RapidAidDriver2024!@#',
    name: 'Michael Brown',
    phone: '+15551234569',
    license: 'DRV345678',
    role: 'driver',
    isActive: true,
    isOnDuty: false,
    vehicleType: 'Emergency Response',
    vehicleNumber: 'EMR003',
    location: {
      latitude: 40.6500,
      longitude: -73.9496,
      address: 'Brooklyn, NY'
    }
  }
];

// Function to create a test driver
async function createTestDriver(driverData) {
  try {
    console.log(`Creating test driver: ${driverData.email}`);
    
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: driverData.email,
      password: driverData.password,
      displayName: driverData.name,
      phoneNumber: driverData.phone,
      emailVerified: true,
      disabled: false
    });
    
    console.log(`✓ Firebase Auth user created: ${userRecord.uid}`);
    
    // Create user document in Firestore
    const userDoc = {
      uid: userRecord.uid,
      email: driverData.email,
      name: driverData.name,
      phone: driverData.phone,
      role: driverData.role,
      isActive: driverData.isActive,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userRecord.uid).set(userDoc);
    console.log(`✓ User document created in Firestore`);
    
    // Create driver document in Firestore
    const driverDoc = {
      userId: userRecord.uid,
      email: driverData.email,
      name: driverData.name,
      phone: driverData.phone,
      license: driverData.license,
      vehicleType: driverData.vehicleType,
      vehicleNumber: driverData.vehicleNumber,
      isActive: driverData.isActive,
      isOnDuty: driverData.isOnDuty,
      isAvailable: true,
      currentLocation: {
        latitude: driverData.location.latitude,
        longitude: driverData.location.longitude,
        address: driverData.location.address,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      totalCompleted: 0,
      completedToday: 0,
      rating: 5.0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('drivers').doc(userRecord.uid).set(driverDoc);
    console.log(`✓ Driver document created in Firestore`);
    
    // Create initial location document
    const locationDoc = {
      driverId: userRecord.uid,
      latitude: driverData.location.latitude,
      longitude: driverData.location.longitude,
      address: driverData.location.address,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('liveLocations').doc(userRecord.uid).set(locationDoc);
    console.log(`✓ Location document created in Firestore`);
    
    console.log(`✅ Test driver created successfully: ${driverData.email}`);
    return { success: true, uid: userRecord.uid };
    
  } catch (error) {
    console.error(`❌ Error creating test driver ${driverData.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to clear existing test data
async function clearTestData() {
  console.log('🧹 Clearing existing test data...');
  
  try {
    // Delete test users from Firebase Auth
    for (const driver of testDrivers) {
      try {
        const user = await auth.getUserByEmail(driver.email);
        await auth.deleteUser(user.uid);
        console.log(`✓ Deleted Firebase Auth user: ${driver.email}`);
      } catch (error) {
        // User doesn't exist, continue
      }
    }
    
    // Delete test documents from Firestore
    const batch = db.batch();
    
    for (const driver of testDrivers) {
      try {
        const user = await auth.getUserByEmail(driver.email);
        
        // Delete user document
        const userRef = db.collection('users').doc(user.uid);
        batch.delete(userRef);
        
        // Delete driver document
        const driverRef = db.collection('drivers').doc(user.uid);
        batch.delete(driverRef);
        
        // Delete location document
        const locationRef = db.collection('liveLocations').doc(user.uid);
        batch.delete(locationRef);
        
        console.log(`✓ Queued deletion for: ${driver.email}`);
      } catch (error) {
        // User doesn't exist, continue
      }
    }
    
    await batch.commit();
    console.log('✅ Test data cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
  }
}

// Main function
async function seedDatabase() {
  console.log('🚀 Starting RapidAid Driver Database Seeding...\n');
  
  try {
    // Clear existing test data first
    await clearTestData();
    console.log('');
    
    // Create test drivers
    console.log('👥 Creating test drivers...\n');
    
    const results = [];
    for (const driver of testDrivers) {
      const result = await createTestDriver(driver);
      results.push(result);
      console.log(''); // Add spacing between drivers
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('📊 Seeding Complete!');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('');
    
    // Display test credentials
    console.log('📝 Test Driver Credentials:');
    console.log('═══════════════════════════════════════════');
    for (const driver of testDrivers) {
      console.log(`Email: ${driver.email}`);
      console.log(`Password: ${driver.password}`);
      console.log(`Name: ${driver.name}`);
      console.log(`License: ${driver.license}`);
      console.log('───────────────────────────────────────────');
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    // Clean up
    await admin.app().delete();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase, createTestDriver, clearTestData };
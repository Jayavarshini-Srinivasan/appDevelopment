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

// Sample emergency requests data
const sampleEmergencies = [
  {
    id: 'emergency_001',
    patientName: 'Robert Wilson',
    patientAge: 45,
    emergencyType: 'Cardiac Arrest',
    severity: 'Critical',
    description: 'Patient experiencing chest pain and shortness of breath',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Broadway, New York, NY 10007',
      landmark: 'Near Times Square'
    },
    patientContact: '+15551234567',
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    estimatedDistance: 2.5,
    estimatedTime: 8,
    priority: 'high'
  },
  {
    id: 'emergency_002',
    patientName: 'Emma Davis',
    patientAge: 28,
    emergencyType: 'Road Accident',
    severity: 'Severe',
    description: 'Car accident victim with possible fractures',
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: '456 5th Ave, New York, NY 10018',
      landmark: 'Near Empire State Building'
    },
    patientContact: '+15551234568',
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    estimatedDistance: 3.2,
    estimatedTime: 12,
    priority: 'high'
  },
  {
    id: 'emergency_003',
    patientName: 'James Thompson',
    patientAge: 67,
    emergencyType: 'Stroke',
    severity: 'Critical',
    description: 'Elderly patient showing stroke symptoms - facial drooping, arm weakness',
    location: {
      latitude: 40.6500,
      longitude: -73.9496,
      address: '789 Brooklyn Ave, Brooklyn, NY 11225',
      landmark: 'Near Prospect Park'
    },
    patientContact: '+15551234569',
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    estimatedDistance: 5.1,
    estimatedTime: 15,
    priority: 'critical'
  },
  {
    id: 'emergency_004',
    patientName: 'Maria Garcia',
    patientAge: 34,
    emergencyType: 'Allergic Reaction',
    severity: 'Moderate',
    description: 'Severe allergic reaction to peanuts, difficulty breathing',
    location: {
      latitude: 40.7282,
      longitude: -73.9942,
      address: '321 Park Ave, New York, NY 10016',
      landmark: 'Near Grand Central'
    },
    patientContact: '+15551234570',
    status: 'assigned',
    assignedDriverId: 'YsPwTL0nD4fwr8nNEUQtiNb78zu1', // John Smith
    assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    estimatedDistance: 1.8,
    estimatedTime: 6,
    priority: 'high'
  },
  {
    id: 'emergency_005',
    patientName: 'David Lee',
    patientAge: 52,
    emergencyType: 'Diabetic Emergency',
    severity: 'Moderate',
    description: 'Diabetic patient with low blood sugar, confusion and weakness',
    location: {
      latitude: 40.6892,
      longitude: -74.0445,
      address: '555 Liberty St, New York, NY 10006',
      landmark: 'Near Statue of Liberty Ferry'
    },
    patientContact: '+15551234571',
    status: 'assigned',
    assignedDriverId: 'czZg9yt5meROtpcPl9bYOmU1jo63', // Sarah Johnson
    assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    estimatedDistance: 4.3,
    estimatedTime: 18,
    priority: 'moderate'
  },
  {
    id: 'emergency_006',
    patientName: 'Jennifer White',
    patientAge: 29,
    emergencyType: 'Pregnancy Complications',
    severity: 'Severe',
    description: 'Pregnant woman experiencing severe abdominal pain and bleeding',
    location: {
      latitude: 40.8176,
      longitude: -73.9782,
      address: '888 Harlem Blvd, New York, NY 10027',
      landmark: 'Near Columbia University'
    },
    patientContact: '+15551234572',
    status: 'completed',
    assignedDriverId: '6M30cAnxT3PLRdgZQTGlXYug17N2', // Michael Brown
    assignedAt: new Date(Date.now() - 3600000), // 1 hour ago
    completedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    estimatedDistance: 6.7,
    estimatedTime: 22,
    priority: 'critical'
  }
];

// Sample driver statistics
const sampleDriverStats = [
  {
    driverId: 'YsPwTL0nD4fwr8nNEUQtiNb78zu1', // John Smith
    totalCompleted: 47,
    completedToday: 3,
    completedThisWeek: 18,
    averageRating: 4.8,
    totalDistance: 342.5,
    totalHours: 156,
    emergencyTypes: {
      'Cardiac Arrest': 8,
      'Road Accident': 12,
      'Stroke': 5,
      'Allergic Reaction': 7,
      'Diabetic Emergency': 9,
      'Pregnancy Complications': 6
    }
  },
  {
    driverId: 'czZg9yt5meROtpcPl9bYOmU1jo63', // Sarah Johnson
    totalCompleted: 52,
    completedToday: 4,
    completedThisWeek: 21,
    averageRating: 4.9,
    totalDistance: 398.2,
    totalHours: 178,
    emergencyTypes: {
      'Cardiac Arrest': 10,
      'Road Accident': 14,
      'Stroke': 7,
      'Allergic Reaction': 8,
      'Diabetic Emergency': 6,
      'Pregnancy Complications': 7
    }
  },
  {
    driverId: '6M30cAnxT3PLRdgZQTGlXYug17N2', // Michael Brown
    totalCompleted: 38,
    completedToday: 2,
    completedThisWeek: 15,
    averageRating: 4.7,
    totalDistance: 287.3,
    totalHours: 134,
    emergencyTypes: {
      'Cardiac Arrest': 6,
      'Road Accident': 9,
      'Stroke': 8,
      'Allergic Reaction': 5,
      'Diabetic Emergency': 7,
      'Pregnancy Complications': 3
    }
  }
];

// Function to create sample emergency requests
async function createSampleEmergencies() {
  console.log('🚨 Creating sample emergency requests...');
  
  try {
    for (const emergency of sampleEmergencies) {
      await db.collection('emergencies').doc(emergency.id).set(emergency);
      console.log(`✓ Created emergency: ${emergency.id} - ${emergency.patientName}`);
    }
    
    console.log('✅ Sample emergencies created successfully');
  } catch (error) {
    console.error('❌ Error creating emergencies:', error.message);
  }
}

// Function to create sample driver statistics
async function createSampleDriverStats() {
  console.log('📊 Creating sample driver statistics...');
  
  try {
    for (const stats of sampleDriverStats) {
      await db.collection('driverStats').doc(stats.driverId).set(stats);
      console.log(`✓ Created stats for driver: ${stats.driverId}`);
    }
    
    console.log('✅ Sample driver statistics created successfully');
  } catch (error) {
    console.error('❌ Error creating driver stats:', error.message);
  }
}

// Function to create sample emergency history
async function createSampleEmergencyHistory() {
  console.log('📚 Creating sample emergency history...');
  
  const historyData = [
    {
      driverId: 'YsPwTL0nD4fwr8nNEUQtiNb78zu1',
      emergencyId: 'emergency_001',
      patientName: 'Robert Wilson',
      emergencyType: 'Cardiac Arrest',
      completedAt: new Date(Date.now() - 7200000), // 2 hours ago
      responseTime: 6,
      distance: 2.5,
      rating: 5,
      feedback: 'Excellent response time, very professional'
    },
    {
      driverId: 'czZg9yt5meROtpcPl9bYOmU1jo63',
      emergencyId: 'emergency_002',
      patientName: 'Emma Davis',
      emergencyType: 'Road Accident',
      completedAt: new Date(Date.now() - 5400000), // 1.5 hours ago
      responseTime: 8,
      distance: 3.2,
      rating: 4,
      feedback: 'Good service, could be faster'
    },
    {
      driverId: '6M30cAnxT3PLRdgZQTGlXYug17N2',
      emergencyId: 'emergency_003',
      patientName: 'James Thompson',
      emergencyType: 'Stroke',
      completedAt: new Date(Date.now() - 3600000), // 1 hour ago
      responseTime: 5,
      distance: 5.1,
      rating: 5,
      feedback: 'Outstanding emergency response'
    }
  ];
  
  try {
    for (const history of historyData) {
      const docId = `${history.driverId}_${history.emergencyId}`;
      await db.collection('emergencyHistory').doc(docId).set(history);
      console.log(`✓ Created history: ${docId}`);
    }
    
    console.log('✅ Sample emergency history created successfully');
  } catch (error) {
    console.error('❌ Error creating emergency history:', error.message);
  }
}

// Main function
async function seedEmergencyData() {
  console.log('🚀 Starting RapidAid Emergency Data Seeding...\n');
  
  try {
    await createSampleEmergencies();
    console.log('');
    
    await createSampleDriverStats();
    console.log('');
    
    await createSampleEmergencyHistory();
    console.log('');
    
    console.log('📊 Emergency Data Seeding Complete!');
    console.log('✅ Sample emergencies: 6');
    console.log('✅ Driver statistics: 3');
    console.log('✅ Emergency history: 3');
    
  } catch (error) {
    console.error('❌ Emergency data seeding failed:', error.message);
  } finally {
    await admin.app().delete();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seeding
if (require.main === module) {
  seedEmergencyData().catch(console.error);
}

module.exports = { seedEmergencyData, createSampleEmergencies, createSampleDriverStats };
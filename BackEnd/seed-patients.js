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

const samplePatients = [
  {
    email: 'patient1@rapidaid.com',
    password: 'RapidAidPatient2025!@#',
    name: 'Alice Patel',
    phone: '+15550001111',
    role: 'patient',
    age: 34,
    bloodType: 'A+',
    emergencyContact: 'Raj Patel',
    allergies: ['Penicillin'],
    conditions: ['Asthma'],
    medications: ['Albuterol'],
    location: { latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place, New Delhi' },
  },
  {
    email: 'patient2@rapidaid.com',
    password: 'RapidAidPatient2025!@#',
    name: 'Brian Chen',
    phone: '+15550002222',
    role: 'patient',
    age: 29,
    bloodType: 'O-',
    emergencyContact: 'Lily Chen',
    allergies: ['Peanuts'],
    conditions: ['Diabetes Type 1'],
    medications: ['Insulin'],
    location: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
  },
];

async function ensurePatient(patient) {
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(patient.email);
      console.log(`Found existing user for ${patient.email}: ${userRecord.uid}`);
    } catch (e) {
      userRecord = await auth.createUser({
        email: patient.email,
        password: patient.password,
        displayName: patient.name,
        phoneNumber: patient.phone,
        emailVerified: true,
        disabled: false,
      });
      console.log(`Created Firebase Auth user: ${userRecord.uid}`);
    }

    await auth.setCustomUserClaims(userRecord.uid, { role: 'patient' });

    const userDoc = {
      email: patient.email,
      name: patient.name,
      phone: patient.phone,
      role: 'patient',
      age: patient.age,
      bloodType: patient.bloodType,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      conditions: patient.conditions,
      medications: patient.medications,
      location: patient.location,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
    console.log(`Upserted user profile for ${patient.email}`);

    // Optional: also create a document in 'patients' collection for front-end utilities
    try {
      await db.collection('patients').doc(userRecord.uid).set({ id: userRecord.uid, ...userDoc });
    } catch {}

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error(`Error ensuring patient ${patient.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function seedPatients() {
  console.log('🚀 Seeding sample patient accounts...');
  const results = [];
  for (const p of samplePatients) {
    const res = await ensurePatient(p);
    results.push(res);
  }
  const ok = results.filter(r => r.success).length;
  const fail = results.filter(r => !r.success).length;
  console.log(`✅ Patients seeded: ${ok} | ❌ Failed: ${fail}`);
}

if (require.main === module) {
  seedPatients()
    .catch(err => console.error('Seeding error:', err))
    .finally(async () => {
      try { await admin.app().delete(); } catch {}
      console.log('✅ Closed Firebase Admin');
    });
}

module.exports = { seedPatients };
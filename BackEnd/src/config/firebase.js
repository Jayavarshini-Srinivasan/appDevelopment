const admin = require('firebase-admin');
require('dotenv').config();

let adminApp = null;
let db = null;
let auth = null;

const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    adminApp = admin;
    db = admin.firestore();
    auth = admin.auth();
    if (__DEV__) console.log('[Firebase Admin] Initialized for project:', FIREBASE_PROJECT_ID);
  } catch (err) {
    console.warn('[Firebase Admin] Initialization failed:', err?.message || err);
    adminApp = null; db = null; auth = null;
  }
} else {
  console.warn('[Firebase Admin] Missing credentials in environment variables. Firebase REST admin features will be disabled.');
}

module.exports = { admin: adminApp, db, auth };


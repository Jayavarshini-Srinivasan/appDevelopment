const admin = require('firebase-admin');
require('dotenv').config();

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
const args = process.argv.slice(2);

const parseArgs = () => {
  let email = null;
  let uid = null;
  let role = null;
  let name = null;
  let phone = null;
  for (const a of args) {
    const m = String(a);
    if (m.startsWith('email=')) email = m.split('=')[1];
    else if (m.startsWith('uid=')) uid = m.split('=')[1];
    else if (!role) role = m;
    else if (!email && m.includes('@')) email = m;
    else if (!name) name = m;
    else if (!phone) phone = m;
  }
  return { email, uid, role, name, phone };
};

const run = async () => {
  const { email, uid: argUid, role, name, phone } = parseArgs();
  if (!role) {
    console.error('Usage: node set-user-role.js uid=<UID> patient [name] [phone] OR node set-user-role.js email=<EMAIL> patient [name] [phone]');
    process.exit(1);
  }

  let uid = argUid;
  let authUser = null;
  if (!uid && email) {
    try {
      authUser = await admin.auth().getUserByEmail(email);
      uid = authUser.uid;
    } catch (e) {
      console.error('User not found in Firebase Auth for email:', email);
      process.exit(1);
    }
  }
  if (!uid) {
    console.error('UID or email is required');
    process.exit(1);
  }

  await admin.auth().setCustomUserClaims(uid, { role });
  const userRef = db.collection('users').doc(uid);
  const docSnap = await userRef.get();
  const update = {
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (email) update.email = email;
  if (name) update.name = name;
  if (phone) update.phone = phone;
  if (!docSnap.exists) update.createdAt = admin.firestore.FieldValue.serverTimestamp();
  await userRef.set(update, { merge: true });

  console.log('Set role and ensured Firestore user document for UID:', uid);
};

run()
  .catch(err => { console.error('Error:', err?.message || err); process.exit(1); })
  .finally(async () => { try { await admin.app().delete(); } catch {} });
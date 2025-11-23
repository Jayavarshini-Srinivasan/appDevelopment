const { admin } = require('../config/firebase');
const { errorResponse } = require('../utils/response');
const userRepository = require('../repositories/user.repository');

const verifyToken = async (req, res, next) => {
  try {
    // If Firebase admin is not initialized, allow dev bypass if explicitly enabled
    if (!admin) {
      const bypass = process.env.DEV_AUTH_BYPASS === 'true';
      if (!bypass) {
        console.warn('verifyToken requested but Firebase admin is not initialized');
        return errorResponse(res, 'Authentication unavailable (server admin configuration missing)', 503);
      }
    }

    if (req.method === 'OPTIONS') {
      return next();
    }
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    let decodedToken;
    if (admin) {
      decodedToken = await admin.auth().verifyIdToken(token);
    } else {
      // Dev bypass: weakly decode JWT payload without verification
      try {
        const payload = token.split('.')[1];
        const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        decodedToken = JSON.parse(json);
      } catch (e) {
        return errorResponse(res, 'Invalid token', 401);
      }
    }

    const firestoreUser = await userRepository.getUserById(decodedToken.uid);

    req.user = {
      uid: decodedToken.uid || decodedToken.user_id,
      email: decodedToken.email,
      role: (decodedToken.role || firestoreUser?.role || 'patient'),
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid token', 401);
  }
};

module.exports = { verifyToken };


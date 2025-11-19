const { admin } = require('../config/firebase');
const { errorResponse } = require('../utils/response');
const userRepository = require('../repositories/user.repository');

const verifyToken = async (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    const firestoreUser = await userRepository.getUserById(decodedToken.uid);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken.role || firestoreUser?.role || 'patient'),
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid token', 401);
  }
};

module.exports = { verifyToken };


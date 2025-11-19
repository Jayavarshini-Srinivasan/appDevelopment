const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res) => {
  try {
    console.log('📨 Auth register controller called');
    const { email, password, ...userData } = req.body;
    console.log('📧 Registering user:', email, 'Role:', userData.role);
    
    const result = await authService.register(email, password, userData);
    console.log('✅ User registered successfully:', result.uid);
    
    return successResponse(res, result, 'User registered successfully', 201);
  } catch (error) {
    console.error('❌ Registration error:', error);
    return errorResponse(res, error.message, 400);
  }
};

const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await authService.login(email);
    return successResponse(res, user, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, 401);
  }
};

const getMe = async (req, res) => {
  try {
    console.log('👤 getMe controller called for UID:', req.user.uid);
    const user = await authService.getCurrentUser(req.user.uid);
    if (!user) {
      console.log('❌ User not found:', req.user.uid);
      return errorResponse(res, 'User not found', 404);
    }
    console.log('✅ User retrieved:', user.email);
    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    console.error('❌ getMe error:', error);
    return errorResponse(res, error.message, 400);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, license, phone } = req.body;
    const userId = req.user.uid;
    
    const updatedUser = await authService.updateUserProfile(userId, { name, license, phone });
    return successResponse(res, updatedUser, 'Profile updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

module.exports = { register, login, getMe, updateProfile };


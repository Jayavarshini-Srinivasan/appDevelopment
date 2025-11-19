const driverService = require('../services/driver.service');
const { successResponse, errorResponse } = require('../utils/response');

const toggleDutyStatus = async (req, res) => {
  try {
    const { isOnDuty } = req.body;
    console.log('🔄 toggleDutyStatus called for UID:', req.user.uid, 'New status:', isOnDuty);
    
    const result = await driverService.toggleDutyStatus(req.user.uid, isOnDuty);
    console.log('✅ Duty status updated successfully');
    
    return successResponse(res, { isOnDuty }, 'Duty status updated');
  } catch (error) {
    console.error('❌ toggleDutyStatus error:', error);
    return errorResponse(res, error.message, 400);
  }
};

const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await driverService.updateLocation(req.user.uid, { latitude, longitude });
    return successResponse(res, null, 'Location updated');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getCurrentLocation = async (req, res) => {
  try {
    const location = await driverService.getCurrentLocation(req.user.uid);
    return successResponse(res, location, 'Current location retrieved');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getAssignedRequests = async (req, res) => {
  try {
    const requests = await driverService.getAssignedRequests(req.user.uid);
    return successResponse(res, requests, 'Assigned requests retrieved');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const requests = await driverService.getPendingRequests(req.user.uid);
    return successResponse(res, requests, 'Pending requests retrieved');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const acceptRequest = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await driverService.acceptRequest(req.user.uid, emergencyId);
    return successResponse(res, emergency, 'Request accepted');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await driverService.rejectRequest(emergencyId);
    return successResponse(res, emergency, 'Request rejected');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const completeRequest = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await driverService.completeRequest(emergencyId);
    return successResponse(res, emergency, 'Request completed');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await driverService.getStats(req.user.uid);
    return successResponse(res, stats, 'Stats retrieved');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const createStats = async (req, res) => {
  try {
    const { driverId, ...statsData } = req.body;
    
    // Ensure the driver can only create their own stats
    if (driverId !== req.user.uid) {
      return errorResponse(res, 'Unauthorized to create stats for this driver', 403);
    }
    
    const result = await driverService.createStats(driverId, statsData);
    return successResponse(res, result, 'Driver stats created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getDriverProfile = async (req, res) => {
  try {
    console.log('🚛 getDriverProfile controller called for UID:', req.user.uid);
    const driverProfile = await driverService.getDriverProfile(req.user.uid);
    console.log('✅ Driver profile retrieved:', driverProfile.email);
    return successResponse(res, driverProfile, 'Driver profile retrieved');
  } catch (error) {
    console.error('❌ getDriverProfile error:', error);
    return errorResponse(res, error.message, 400);
  }
};

const updateDriverProfile = async (req, res) => {
  try {
    const updateData = req.body;
    const updatedProfile = await driverService.updateDriverProfile(req.user.uid, updateData);
    return successResponse(res, updatedProfile, 'Driver profile updated');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

module.exports = {
  toggleDutyStatus,
  updateLocation,
  getAssignedRequests,
  getPendingRequests,
  acceptRequest,
  rejectRequest,
  completeRequest,
  getStats,
  createStats,
  getDriverProfile,
  updateDriverProfile,
  getCurrentLocation,
};


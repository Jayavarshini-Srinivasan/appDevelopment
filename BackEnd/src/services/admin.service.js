const userRepository = require('../repositories/user.repository');
const emergencyRepository = require('../repositories/emergency.repository');
const driverRepository = require('../repositories/driver.repository');

const getAllDrivers = async () => {
  return await userRepository.getAllUsersByRole('driver');
};

const getAllPatients = async () => {
  return await userRepository.getAllUsersByRole('patient');
};

const getAllEmergencies = async () => {
  return await emergencyRepository.getAllEmergencies();
};

const getAllLiveLocations = async () => {
  return await driverRepository.getAllLiveLocations();
};

const getDashboardMetrics = async () => {
  const drivers = await getAllDrivers();
  const patients = await getAllPatients();
  const emergencies = await getAllEmergencies();
  const liveLocations = await getAllLiveLocations();

  const activeEmergencies = emergencies.filter(e => 
    ['pending', 'accepted', 'in_progress'].includes(e.status)
  );
  const onDutyDrivers = drivers.filter(d => d.isOnDuty);

  return {
    totalDrivers: drivers.length,
    onDutyDrivers: onDutyDrivers.length,
    totalPatients: patients.length,
    totalEmergencies: emergencies.length,
    activeEmergencies: activeEmergencies.length,
    completedEmergencies: emergencies.filter(e => e.status === 'completed').length,
    liveTracking: liveLocations.length,
  };
};

module.exports = {
  getAllDrivers,
  getAllPatients,
  getAllEmergencies,
  getAllLiveLocations,
  getDashboardMetrics,
};


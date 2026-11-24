const {
  getOrgUsers,
  createDriver,
  updateUserRole,
  updateUserPermissions,
  resetUserPassword,
} = require('./admin/adminUserController');

const {
  assignVehicleToDriver,
  unassignVehicle,
  getOrganization,
  updateOrganization,
} = require('./admin/adminOrgAssignmentController');

module.exports = {
  getOrgUsers,
  createDriver,
  assignVehicleToDriver,
  updateUserRole,
  updateUserPermissions,
  resetUserPassword,
  unassignVehicle,
  getOrganization,
  updateOrganization,
};

const {
  getOrgUsers,
  createDriver,
  updateUserRole,
  updateUserPermissions,
  resetUserPassword,
} = require('./admin/adminUserController');
const { updateUserStatus } = require('./admin/adminUserStatusController');

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
  updateUserStatus,
  unassignVehicle,
  getOrganization,
  updateOrganization,
};

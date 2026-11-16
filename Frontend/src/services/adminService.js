import api from './api';

const adminService = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data?.users || [];
  },

  createDriver: async (driverData) => {
    const response = await api.post('/admin/users', driverData);
    return response.data;
  },

  assignVehicle: async (assignData) => {
    const response = await api.post('/admin/assign', assignData);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserPermissions: async (userId, yetkiler) => {
    const response = await api.put(`/admin/users/${userId}/permissions`, { yetkiler });
    return response.data;
  },
};

export default adminService;

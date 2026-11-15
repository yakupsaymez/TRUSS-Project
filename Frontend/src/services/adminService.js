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
};

export default adminService;

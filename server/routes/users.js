const express = require('express');
const UserManagementService = require('../services/user-management');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const userService = new UserManagementService();

// All user management routes require super admin access
router.use(authMiddleware);
router.use(requireRole('super_admin'));

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message 
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { email, password, role, organization_id, first_name, last_name } = req.body;
    
    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ 
        error: 'Email, password, and role are required' 
      });
    }

    const user = await userService.createUser({
      email,
      password,
      role,
      organization_id,
      first_name,
      last_name
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, password, role, organization_id, first_name, last_name } = req.body;

    const user = await userService.updateUser(userId, {
      email,
      password,
      role,
      organization_id,
      first_name,
      last_name
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message 
    });
  }
});

// Delete user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.deleteUser(userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message 
    });
  }
});

// Get users by organization
router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const users = await userService.getUsersByOrganization(organizationId);
    res.json(users);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


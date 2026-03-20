const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// Map the POST request to our controller function
router.post('/register', registerUser);

module.exports = router;
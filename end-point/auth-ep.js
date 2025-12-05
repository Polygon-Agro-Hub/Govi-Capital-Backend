const authDAO = require("../dao/Auth-dao");
const authValidation = require("../validations/Auth-validation");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.test = async (req, res) => {
  try {
    res.send("Test working.......");
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while fetching data.");
  }
};

// Check if user exists by email or phone
exports.checkUserExists = async (req, res) => {
  try {
    const { email, phoneNumber, phoneCode } = req.body;

    // Validate input
    if (!email && !phoneNumber) {
      return res.status(400).json({
        status: false,
        message: "Email or phone number is required"
      });
    }

    let existingUser = null;

    // Check by email
    if (email) {
      existingUser = await authDAO.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          status: false,
          type: "email_exists",
          message: "This email address is already registered. Please use a different email or try logging in."
        });
      }
    }

    // Check by phone number
    if (phoneNumber) {
      const normalizedPhone = phoneNumber.replace(/^0+/, '').substring(0, 9);
      existingUser = await authDAO.loginUserByPhone(normalizedPhone);
      if (existingUser) {
        return res.status(409).json({
          status: false,
          type: "phone_exists",
          message: "This phone number is already registered. Please use a different phone number or try logging in."
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "User details verified. Proceed with registration."
    });

  } catch (err) {
    console.error("Error checking user existence:", err);
    res.status(500).json({
      status: false,
      message: "An error occurred while verifying user details."
    });
  }
};

// Register new user
exports.registerUser = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);

    // Validate input using Joi schema
    const validateSchema = await authValidation.registerSchema.validateAsync(req.body);
    
    const {
      title,
      userName,
      phoneNumber,
      nic,
      email,
      address,
      password
    } = validateSchema;

    // Normalize phone number (remove leading zeros, take last 9 digits)
    const normalizedPhone = phoneNumber.replace(/^0+/, '').substring(0, 9);

    // Check if user already exists
    const existingUserByEmail = await authDAO.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({
        status: false,
        type: "email_exists",
        message: "This email address is already registered."
      });
    }

    const existingUserByPhone = await authDAO.loginUserByPhone(normalizedPhone);
    if (existingUserByPhone) {
      return res.status(409).json({
        status: false,
        type: "phone_exists",
        message: "This phone number is already registered."
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const userData = {
      title,
      userName,
      phoneNumber: normalizedPhone,
      phoneCode: '+94', // Default to Sri Lanka
      nic,
      email,
      address,
      password: hashedPassword
    };

    // Insert user into database
    const newUserId = await authDAO.createUser(userData);

    console.log('User registered successfully with ID:', newUserId);

    return res.status(201).json({
      status: true,
      message: "User registered successfully.",
      userId: newUserId
    });

  } catch (err) {
    console.error("Error during registration:", err);

    if (err.name === 'ValidationError' || err.isJoi) {
      return res.status(400).json({
        status: false,
        message: "Invalid input data.",
        details: err.details || err.message
      });
    }

    res.status(500).json({
      status: false,
      message: "An error occurred during registration."
    });
  }
};

exports.userLogin = async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log(fullUrl);

  try {
    console.log('Request body---', req.body);
    
    // Validate input
    const validateSchema = await authValidation.loginSchema.validateAsync(req.body);
    const { phoneNumber, password } = validateSchema;
    
    console.log('Login attempt with phone:', phoneNumber);
    
    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/^0+/, '').substring(0, 9);
    
    // Get user from database
    const user = await authDAO.loginUserByPhone(normalizedPhone);
    
    console.log('User found:', user ? { 
      id: user.id, 
      userName: user.userName,
      phone: user.phoneCode ? `${user.phoneCode}${user.phoneNumber}` : 'N/A',
      hasPassword: user.password !== null,
      passwordLength: user.password ? user.password.length : 0
    } : null);

    if (!user) {
      return res.status(401).json({ 
        status: false, 
        message: "User not found." 
      });
    }

    // Check if user has a password
    if (!user.password || user.password === null) {
      return res.status(401).json({ 
        status: false, 
        message: "Account found but no password is set. Please contact support to set up your password." 
      });
    }

    console.log('Verifying password...');
    
    // Verify password
    const verify_password = bcrypt.compareSync(password, user.password);
    console.log('Password verification result:', verify_password);

    if (!verify_password) {
      return res.status(401).json({ 
        status: false, 
        message: "Incorrect password." 
      });
    }

    // Calculate token expiration time
    const expirationTime = Math.floor(Date.now() / 1000) + (5 * 60 * 60);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        userName: user.userName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        phoneCode: user.phoneCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    console.log('Token generated successfully');

    // Remove password from user object
    delete user.password;

    return res.status(200).json({
      success: true,
      message: "User login successful.",
      token: token,
      tokenExpiration: expirationTime,
      userData: {
        id: user.id,
        title: user.title,
        userName: user.userName,
        phoneCode: user.phoneCode,
        phoneNumber: user.phoneNumber,
        email: user.email,
        nic: user.nic,
        address: user.address,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error("Error during login:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        status: false, 
        message: "Invalid input data.",
        details: err.details 
      });
    }
    
    res.status(500).json({ 
      status: false, 
      error: "An error occurred during login." 
    });
  }
};
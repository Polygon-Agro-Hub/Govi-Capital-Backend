const authDAO = require("../dao/Auth-dao")
const authValidation = require("../validations/Auth-validation");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


exports.test = async (req, res) => {
  try {

    res.send("Test working.......");
  } catch (err) {
    if (err.isJoi) {
      // Validation error
      return res.status(400).json({ error: err.details[0].message });
    }

    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while fetching data.");
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
    
    // Get user from database
    const user = await authDAO.loginUserByPhone(phoneNumber);
    
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
    console.log('Password hash from DB:', user.password.substring(0, 20) + '...');
    
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

exports.userRegister = async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log(fullUrl);

  try {
    console.log('Request body---', req.body);
    
    // Validate input
    const validateSchema = await authValidation.registerSchema.validateAsync(req.body);
    const { title, userName, phoneNumber, nic, email, address, password, confirmPassword } = validateSchema;
    
    console.log('Registration attempt with phone:', phoneNumber);

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        status: false, 
        message: "Passwords do not match." 
      });
    }

    // Check if user already exists by phone
    const phoneExists = await authDAO.checkUserExistsByPhone(phoneNumber);
    if (phoneExists) {
      return res.status(409).json({ 
        status: false, 
        message: "User with this phone number already exists." 
      });
    }

    // Check if user already exists by email
    const emailExists = await authDAO.checkUserExistsByEmail(email);
    if (emailExists) {
      return res.status(409).json({ 
        status: false, 
        message: "User with this email already exists." 
      });
    }

    // Check if user already exists by NIC
    const nicExists = await authDAO.checkUserExistsByNIC(nic);
    if (nicExists) {
      return res.status(409).json({ 
        status: false, 
        message: "User with this NIC already exists." 
      });
    }

    console.log('Hashing password...');
    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user data object
    const userData = {
      title,
      userName,
      phoneNumber,
      phoneCode: '+94',
      nic,
      email,
      address,
      password: hashedPassword
    };

    // Create user in database
    const newUser = await authDAO.createUser(userData);
    console.log('User created successfully with ID:', newUser.id);

    // Get full user data without password
    const createdUser = await authDAO.getUserById(newUser.id);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      userData: {
        id: createdUser.id,
        title: createdUser.title,
        userName: createdUser.userName,
        phoneCode: createdUser.phoneCode,
        phoneNumber: createdUser.phoneNumber,
        email: createdUser.email,
        nic: createdUser.nic,
        address: createdUser.address,
        createdAt: createdUser.createdAt
      }
    });

  } catch (err) {
    console.error("Error during registration:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        status: false, 
        message: "Invalid input data.",
        details: err.details 
      });
    }
    
    res.status(500).json({ 
      status: false, 
      error: "An error occurred during registration." 
    });
  }
};

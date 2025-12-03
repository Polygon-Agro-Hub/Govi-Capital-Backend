const { admin, plantcare, collectionofficer, marketPlace, dash } = require("../startup/database");

exports.loginUserByPhone = async (phoneNumber) => {
  return new Promise((resolve, reject) => {
    // Extract last 9 digits from input (e.g., 077xxxxxxxx -> 7xxxxxxxx)
    const normalizedPhone = phoneNumber.replace(/^0+/, '').substring(0, 9);
    
    const sql = `
      SELECT id, title, userName, password, phoneCode, phoneNumber, 
             nic, email, address, createdAt 
      FROM investmentusers 
      WHERE phoneNumber = ?
    `;
    
    plantcare.query(sql, [normalizedPhone], (err, results) => {
      if (err) {
        return reject(err);
      }
      
      if (results.length === 0) {
        return resolve(null);
      }
      
      resolve(results[0]);
    });
  });
};


// Check if user exists by phone number
exports.checkUserExistsByPhone = async (phoneNumber) => {
  return new Promise((resolve, reject) => {
    const normalizedPhone = phoneNumber.replace(/^0+/, '').substring(0, 9);
    
    const sql = `SELECT id FROM investmentusers WHERE phoneNumber = ?`;
    
    plantcare.query(sql, [normalizedPhone], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results.length > 0);
    });
  });
};

// Check if user exists by email
exports.checkUserExistsByEmail = async (email) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id FROM investmentusers WHERE email = ?`;
    
    plantcare.query(sql, [email], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results.length > 0);
    });
  });
};

// Check if user exists by NIC
exports.checkUserExistsByNIC = async (nic) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id FROM investmentusers WHERE nic = ?`;
    
    plantcare.query(sql, [nic], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results.length > 0);
    });
  });
};

// Create new user
exports.createUser = async (userData) => {
  return new Promise((resolve, reject) => {
    const normalizedPhone = userData.phoneNumber.replace(/^0+/, '').substring(0, 9);
    
    const sql = `
      INSERT INTO investmentusers 
      (title, userName, password, phoneCode, phoneNumber, nic, email, address) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      userData.title,
      userData.userName,
      userData.password,
      userData.phoneCode || '+94',
      normalizedPhone,
      userData.nic,
      userData.email,
      userData.address
    ];
    
    plantcare.query(sql, values, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve({
        id: results.insertId,
        ...userData,
        phoneNumber: normalizedPhone
      });
    });
  });
};

// Get user by ID
exports.getUserById = async (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, title, userName, phoneCode, phoneNumber, 
             nic, email, address, createdAt 
      FROM investmentusers 
      WHERE id = ?
    `;
    
    plantcare.query(sql, [userId], (err, results) => {
      if (err) {
        return reject(err);
      }
      
      if (results.length === 0) {
        return resolve(null);
      }
      
      resolve(results[0]);
    });
  });
};

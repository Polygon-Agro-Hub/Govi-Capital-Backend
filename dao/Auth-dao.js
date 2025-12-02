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


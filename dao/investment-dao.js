const { admin, plantcare, collectionofficer, marketPlace, dash } = require("../startup/database");


exports.test = async () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, title, userName, password, phoneCode, phoneNumber, 
             nic, email, address, createdAt 
      FROM investmentusers 
      WHERE email = ?
    `;
    
    
    plantcare.query(sql, [email], (err, results) => {
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
const { admin, collectionofficer, marketPlace, investment } = require("../startup/database");
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const { resolve } = require("path");
const { rejects } = require("assert");
const { connected } = require("process");

// Get user by phone number
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

    investment.query(sql, [normalizedPhone], (err, results) => {
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

// Get user by email
exports.getUserByEmail = (email) => {
  console.log("Checking for user with email:", email);
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM investmentusers WHERE email = ?";
    investment.query(sql, [email], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
    console.log("Query executed for email:", email);
  });
};

// Create new user
exports.createUser = async (userData) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO investmentusers 
      (title, userName, phoneCode, phoneNumber, nic, email, address, password, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      userData.title,
      userData.userName,
      userData.phoneCode || '+94',
      userData.phoneNumber,
      userData.nic,
      userData.email,
      userData.address,
      userData.password
    ];

    investment.query(sql, values, (err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result.insertId);
    });
  });
};

exports.createPasswordResetToken = (email) => {
  return new Promise((resolve, reject) => {
    const getUserSql = "SELECT id FROM investmentusers WHERE email = ?";

    investment.query(getUserSql, [email], (err, userResults) => {
      if (err) {
        return reject(err);
      }

      if (userResults.length === 0) {
        return reject(new Error("User not found"));
      }

      const userId = userResults[0].id;

      // Check if token already exists for this user
      const checkTokenSql = "SELECT * FROM resetpasswordtoken WHERE userId = ?";

      investment.query(checkTokenSql, [userId], (err, tokenResults) => {
        if (err) {
          return reject(err);
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        console.log("Generated token:", resetToken);
        // Set token expiry (2 minutes from now)
        const resetTokenExpiry = new Date(Date.now() + 2 * 60 * 1000);

        // Hash the token for security before storing it
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        console.log("Hashed token when creating :", hashedToken);

        if (tokenResults.length > 0) {
          // Token exists - update it
          const updateSql = `
            UPDATE resetpasswordtoken 
            SET resetPasswordToken = ?, resetPasswordExpires = ?
            WHERE userId = ?
          `;

          investment.query(updateSql, [hashedToken, resetTokenExpiry, userId], (err) => {
            if (err) {
              return reject(err);
            }
            resolve(resetToken);
          });
        } else {
          // No token exists - insert new one
          const insertSql = `
            INSERT INTO resetpasswordtoken 
            (userId, resetPasswordToken, resetPasswordExpires) 
            VALUES (?, ?, ?)
          `;

          investment.query(insertSql, [userId, hashedToken, resetTokenExpiry], (err) => {
            if (err) {
              return reject(err);
            }
            resolve(resetToken);
          });
        }
      });
    });
  });
};

exports.verifyResetToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error("Token is required"));
    }

    // Hash the provided token for comparison
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log("Hashed token when verifying:", hashedToken);

    const sql = `
      SELECT r.userId, u.email 
      FROM resetpasswordtoken r
      JOIN investmentusers u ON r.userId = u.id
      WHERE r.resetPasswordToken = ? 
      AND r.resetPasswordExpires > NOW()
    `;

    investment.query(sql, [hashedToken], (err, results) => {
      if (err) {
        return reject(err);
      }
      if (results.length === 0) {
        return resolve(null);
      }
      resolve({
        userId: results[0].userId,
        email: results[0].email
      });
    });
  });
};

exports.resetPassword = (token, newPassword) => {
  return new Promise((resolve, reject) => {
    investment.getConnection((err, connection) => {
      if (err) return reject(err);
      console.log("token--------", token);


      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          return reject(err);
        }

        // First verify the token and get user info
        const hashedToken = crypto
          .createHash('sha256')
          .update(token)
          .digest('hex');

        console.log("Hashed token when resetting:", hashedToken);

        const getTokenSql = `
          SELECT userId FROM resetpasswordtoken 
          WHERE resetPasswordToken = ? 
          AND resetPasswordExpires > NOW()
        `;

        console.log("has", hashedToken);

        connection.query(getTokenSql, [hashedToken], (err, tokenResults) => {
          if (err || tokenResults.length === 0) {
            return connection.rollback(() => {
              connection.release();
              reject(err || new Error("Invalid or expired token"));
            });
          }

          const userId = tokenResults[0].userId;

          // Hash the new password
          bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                reject(err);
              });
            }

            // Update user password
            const updatePasswordSql = "UPDATE investmentusers SET password = ? WHERE id = ?";
            connection.query(updatePasswordSql, [hashedPassword, userId], (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                });
              }

              // Clear the reset token
              const clearTokenSql = `
                DELETE FROM resetpasswordtoken 
                WHERE userId = ?
              `;
              connection.query(clearTokenSql, [userId], (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(err);
                  });
                }

                connection.commit(err => {
                  connection.release();
                  if (err) {
                    return connection.rollback(() => {
                      reject(err);
                    });
                  }

                  resolve({
                    success: true,
                    message: "Password updated successfully"
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

exports.getUserByPhoneNumberAuth = (phoneNumber) => {
  console.log("Checking for user with phone number:", phoneNumber);
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM investmentusers WHERE phoneNumber = ?";
    investment.query(sql, [phoneNumber], (err, results) => {
      if (err) {
        console.error('Database error in getUserByPhoneNumber:', err);
        reject({
          status: false,
          message: 'Database error while checking phone number',
          error: err.message
        });
      } else {
        console.log('Phone number query results:', results);
        resolve(results[0] || null);
      }
    });
  });
};

exports.updatePasswordByPhoneNumber = (phoneNumber, newPassword) => {
  console.log("Updating password for phone number:", phoneNumber);
  return new Promise((resolve, reject) => {
    // Hash the password before saving
    const hashedPassword = bcrypt.hashSync(newPassword, parseInt(process.env.SALT_ROUNDS));

    const sql = "UPDATE investmentusers SET password = ? WHERE phoneNumber = ?";
    investment.query(sql, [hashedPassword, phoneNumber], (err, results) => {
      if (err) {
        console.error('Database error in updatePasswordByPhoneNumber:', err);
        reject({
          status: false,
          message: 'Database error while updating password',
          error: err.message
        });
      } else {
        console.log('Password update results:', results);
        if (results.affectedRows > 0) {
          resolve({
            status: true,
            message: 'Password updated successfully',
            affectedRows: results.affectedRows
          });
        } else {
          resolve({
            status: false,
            message: 'No user found with the provided phone number'
          });
        }
      }
    });
  });
};

exports.createResetPasswordInstance = (userId) => {
  return new Promise((resolve, reject) => {
    investment.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.beginTransaction((beginErr) => {
        if (beginErr) {
          connection.release();
          return reject(beginErr);
        }

        // Validate userId (optional but recommended)
        if (!userId) {
          connection.release();
          return reject(new Error('User ID is required'));
        }

        const expiryTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

        // Step 1: Delete any existing reset token for this user
        const deleteExistingSql = "DELETE FROM resetpasswordtoken WHERE userId = ?";
        
        connection.query(deleteExistingSql, [userId], (deleteErr) => {
          if (deleteErr) {
            return rollbackAndRelease(connection, deleteErr, reject);
          }

          // Step 2: Insert new reset token
          const insertSql = `
            INSERT INTO resetpasswordtoken (userId, resetPasswordExpires) 
            VALUES (?, ?)
          `;

          connection.query(insertSql, [userId, expiryTime], (insertErr, insertResults) => {
            if (insertErr) {
              return rollbackAndRelease(connection, insertErr, reject);
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return rollbackAndRelease(connection, commitErr, reject);
              }

              connection.release();
              resolve({
                success: true,
                userId: userId,
                expiresAt: expiryTime,
                message: 'Reset token created successfully'
              });
            });
          });
        });
      });
    });
  });
};

// Helper function for rollback
function rollbackAndRelease(connection, error, reject) {
  connection.rollback(() => {
    connection.release();
    reject(error);
  });
}



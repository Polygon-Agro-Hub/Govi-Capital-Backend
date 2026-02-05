const e = require("express");
const authDAO = require("../dao/Auth-dao");
const authValidation = require("../validations/Auth-validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

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
        message: "Email or phone number is required",
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
          message:
            "This email address is already registered. Please use a different email or try logging in.",
        });
      }
    }

    // Check by phone number
    if (phoneNumber) {
      const normalizedPhone = phoneNumber.replace(/^0+/, "").substring(0, 9);
      existingUser = await authDAO.loginUserByPhone(normalizedPhone);
      if (existingUser) {
        return res.status(409).json({
          status: false,
          type: "phone_exists",
          message:
            "This phone number is already registered. Please use a different phone number or try logging in.",
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "User details verified. Proceed with registration.",
    });
  } catch (err) {
    console.error("Error checking user existence:", err);
    res.status(500).json({
      status: false,
      message: "An error occurred while verifying user details.",
    });
  }
};

// Register new user
exports.registerUser = async (req, res) => {
  try {
    console.log("Registration request body:", req.body);

    // Validate input using Joi schema
    const validateSchema = await authValidation.registerSchema.validateAsync(
      req.body,
    );

    const { title, userName, phoneNumber, nic, email, address, password } =
      validateSchema;

    // Normalize phone number (remove leading zeros, take last 9 digits)
    const normalizedPhone = phoneNumber.replace(/^0+/, "").substring(0, 9);

    // Check if user already exists
    const existingUserByEmail = await authDAO.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({
        status: false,
        type: "email_exists",
        message: "This email address is already registered.",
      });
    }

    const existingUserByPhone = await authDAO.loginUserByPhone(normalizedPhone);
    if (existingUserByPhone) {
      return res.status(409).json({
        status: false,
        type: "phone_exists",
        message: "This phone number is already registered.",
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
      phoneCode: "+94", // Default to Sri Lanka
      nic,
      email,
      address,
      password: hashedPassword,
    };

    // Insert user into database
    const newUserId = await authDAO.createUser(userData);

    console.log("User registered successfully with ID:", newUserId);

    return res.status(201).json({
      status: true,
      message: "User registered successfully.",
      userId: newUserId,
    });
  } catch (err) {
    console.error("Error during registration:", err);

    if (err.name === "ValidationError" || err.isJoi) {
      return res.status(400).json({
        status: false,
        message: "Invalid input data.",
        details: err.details || err.message,
      });
    }

    res.status(500).json({
      status: false,
      message: "An error occurred during registration.",
    });
  }
};

exports.userLogin = async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log(fullUrl);

  try {
    console.log("Request body---", req.body);

    // Validate input
    const validateSchema = await authValidation.loginSchema.validateAsync(
      req.body,
    );
    const { phoneNumber, password } = validateSchema;

    console.log("Login attempt with phone:", phoneNumber);

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/^0+/, "").substring(0, 9);

    // Get user from database
    const user = await authDAO.loginUserByPhone(normalizedPhone);

    console.log(
      "User found:",
      user
        ? {
            id: user.id,
            userName: user.userName,
            phone: user.phoneCode
              ? `${user.phoneCode}${user.phoneNumber}`
              : "N/A",
            hasPassword: user.password !== null,
            passwordLength: user.password ? user.password.length : 0,
          }
        : null,
    );

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found.",
      });
    }

    // Check if user has a password
    if (!user.password || user.password === null) {
      return res.status(401).json({
        status: false,
        message:
          "Account found but no password is set. Please contact support to set up your password.",
      });
    }

    console.log("Verifying password...");

    // Verify password
    const verify_password = bcrypt.compareSync(password, user.password);
    console.log("Password verification result:", verify_password);

    if (!verify_password) {
      return res.status(401).json({
        status: false,
        message: "Incorrect password.",
      });
    }

    // Calculate token expiration time
    const expirationTime = Math.floor(Date.now() / 1000) + 5 * 60 * 60;

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
      { expiresIn: "5h" },
    );

    console.log("Token generated successfully");

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
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        status: false,
        message: "Invalid input data.",
        details: err.details,
      });
    }

    res.status(500).json({
      status: false,
      error: "An error occurred during login.",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("email:", email);

  // DEBUG: Log environment variables (remove in production)
  console.log("Environment check:", {
    EMAIL_USER: process.env.EMAIL_USER ? "SET" : "NOT SET",
    EMAIL_PASS: process.env.EMAIL_PASS ? "SET" : "NOT SET",
    EMAIL_HOST: process.env.EMAIL_HOST || "NOT SET",
    EMAIL_FROM: process.env.EMAIL_FROM || "NOT SET",
  });

  try {
    const user = await authDAO.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email address",
      });
    }

    console.log("User found:", user);
    const resetToken = await authDAO.createPasswordResetToken(email);

    const resetUrl = `${process.env.FRONTEND_URL}reset-password/${resetToken}`;
    console.log("Reset URL:", resetUrl);

    // Validate email credentials before attempting to send
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("CRITICAL: Email credentials not configured");
      console.error(
        "EMAIL_USER:",
        process.env.EMAIL_USER ? "exists" : "missing",
      );
      console.error(
        "EMAIL_PASS:",
        process.env.EMAIL_PASS ? "exists" : "missing",
      );

      return res.status(500).json({
        error: "Email service is not configured. Please contact support.",
        debug:
          process.env.NODE_ENV === "development"
            ? "Missing EMAIL_USER or EMAIL_PASS"
            : undefined,
      });
    }

    const currentDate = new Date().toLocaleDateString();

    // Check if logo file exists
    const logoPath = path.join(
      __dirname,
      "..",
      "assets",
      "GoViCapitalLogo.png",
    );
    console.log("------------------------", logoPath, "----------------");
    // assets\GoViCapitalLogo.png

    const logoExists = fs.existsSync(logoPath);

    if (!logoExists) {
      console.warn("Logo file not found at:", logoPath);
    }

    // Primary transporter configuration
    const transporterConfig = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: process.env.NODE_ENV === "development", // Enable debug in development
      logger: process.env.NODE_ENV === "development", // Enable logging in development
    };

    console.log("Creating transporter with config:", {
      host: transporterConfig.host,
      port: transporterConfig.port,
      user: transporterConfig.auth.user,
      secure: transporterConfig.secure,
    });

    const transporter = nodemailer.createTransport(transporterConfig);

    const mailOptions = {
      from: {
        name: "GoviCapital",
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      },
      to: email,
      subject: "GoviCapital Password Reset Link",
      text: `
GOVICAPITAL PASSWORD RESET

Hello from GoviCapital,

You requested to reset your password. Please click the link below:

${resetUrl}

If you didn't request this, you can safely ignore this email.

Thank you,
GoviCapital Team
${currentDate}

---
This is a transactional email regarding your GoviCapital account.
      `,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
                <!-- Logo Section -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    ${
                      logoExists
                        ? `<img src="cid:logo" alt="GoViMart" style="max-width: 200px; height: auto;" />`
                        : `<h2 style="color: #FF7F00; margin: 0;">GoViMart</h2>`
                    }
                  </td>
                </tr>
          
                <!-- Header -->
                <tr>
                  <td style="padding: 0 40px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #02072C;">Reset your password</h1>
                  </td>
                </tr>
          
                <!-- Divider -->
                <tr>
                  <td style="padding: 0;">
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;" />
                  </td>
                </tr>
          
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 15px; font-size: 16px; color: #333; font-weight: 600;">Hello,</p>
              
                    <p style="margin: 0 0 15px; font-size: 15px; color: #333;">We received a request to reset your password for your GoVi Capital account. Click the button below to reset it:</p>
              
                <!-- Button -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding: 25px 0;">
                      <a href="${resetUrl}" style="display: inline-block; background-color: #3177FF; color: #ffffff; font-weight: 600; padding: 14px 50px; text-decoration: none; border-radius: 6px; font-size: 16px;">Reset my password</a>
                    </td>
                  </tr>
                  </table>

                  <p style="margin: 0 0 10px; font-size: 15px; color: #333;">If the button doesn't work, copy and paste the link into your browser :</p>

                  <p style="margin: 0 0 30px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
                    <a href="${resetUrl}" style="color: #2196F3; font-size: 13px; word-break: break-all; text-decoration: none;">${resetUrl}</a>
                  </p>
              
                  <p style="margin: 0 0 5px; font-size: 15px; color: #333;">Thank you,</p>
                  <p style="margin: 0; font-size: 15px; color: #333; font-weight: 600;">The Customer Support Team</p>
                </td>
              </tr>
          
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; text-align: center; background-color: #fafafa; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0 0 10px; font-size: 13px; color: #666;">© ${new Date().getFullYear()} Polygon Holdings Limited. All Rights Reserved.</p>
                  <p style="margin: 0; font-size: 12px; color: #999;">Please note that this is an automated message.</p>
                </td>
              </tr>
          
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
    };

    // Only add attachment if logo exists
    if (logoExists) {
      mailOptions.attachments = [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logo",
        },
      ];
    }

    // Add essential headers
    mailOptions.headers = {
      "X-Auto-Response-Suppress": "OOF, AutoReply",
      Precedence: "bulk",
      "X-Mailer": "GoviMart Service (Node.js)",
      "List-Unsubscribe": "<mailto:support@govimart.com?subject=unsubscribe>",
    };

    mailOptions.messageId = `<password-reset-${Date.now()}@govimart.com>`;
    mailOptions.priority = "high";

    try {
      console.log("Attempting to send email...");
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      console.log("Response:", info.response);

      res.status(200).json({
        message:
          "Please check your emails, a password reset link has been sent.",
      });
    } catch (emailError) {
      console.error("Primary email sending failed:", emailError.message);
      console.error("Error code:", emailError.code);
      console.error("Full error:", emailError);

      // Try simplified Gmail configuration as fallback
      try {
        console.log("Attempting fallback Gmail transport...");

        const simpleTransporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          debug: process.env.NODE_ENV === "development",
          logger: process.env.NODE_ENV === "development",
        });

        const simpleMailOptions = {
          from: `GoviMart <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Password Reset Link - GoviMart",
          text: `Click here to reset your password: ${resetUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #FF7F00;">GoviMart Password Reset</h2>
              <p>Hello,</p>
              <p>You requested to reset your password. Click the button below to reset it:</p>
              <p style="margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #FF7F00; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
              </p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2196F3;">${resetUrl}</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>Thank you,<br>GoviMart Team</p>
            </div>
          `,
        };

        const fallbackInfo =
          await simpleTransporter.sendMail(simpleMailOptions);
        console.log(
          "Fallback email sent successfully:",
          fallbackInfo.messageId,
        );

        res.status(200).json({
          message:
            "Please check your emails, a password reset link has been sent.",
        });
      } catch (fallbackError) {
        console.error("Fallback email also failed:", fallbackError.message);
        console.error("Fallback error code:", fallbackError.code);
        console.error("Full fallback error:", fallbackError);

        res.status(500).json({
          error:
            "Failed to send password reset email. Please try again later or contact support.",
          debug:
            process.env.NODE_ENV === "development"
              ? {
                  primaryError: emailError.message,
                  fallbackError: fallbackError.message,
                }
              : undefined,
        });
      }
    }
  } catch (err) {
    console.error("Password reset error:", err);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request." });
  }
};

exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token using the DAO method
    const tokenData = await authDAO.verifyResetToken(token);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Error in validateResetToken:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    console.log("Reset password request:", req.body);

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Get email from token
    const tokenData = await authDAO.verifyResetToken(token);
    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const { email } = tokenData;
    console.log("Email from token:", email);

    // Proceed with password reset
    await authDAO.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: "Your password has been updated successfully.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

exports.checkPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  console.log('Checking phone number:', phoneNumber);

  if (!phoneNumber) {
    return res.status(404).json({
      message: "No account found with this phone number",
    });
  }

  try {
    const user = await authDAO.getUserByPhoneNumberAuth(phoneNumber);
    if (user) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(404).json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking phone number:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.resetPasswordByPhone = async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  console.log('Reset password by phone request:', req.body);

  if (!phoneNumber || !newPassword) {
    return res.status(400).json({ error: "Phone number and new password are required" });
  }

  try {
    const result = await authDAO.updatePasswordByPhoneNumber(phoneNumber, newPassword);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error resetting password by phone:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
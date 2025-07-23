export const getOtpEmailTemplate = (otp: string): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
      .content { padding: 30px; text-align: center; }
      .otp { font-size: 36px; font-weight: bold; color: #00205B; margin: 20px 0; letter-spacing: 5px; }
      .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <h1>Welcome to Fixeify!</h1>
        <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
        <p>This OTP expires in <strong>1 minute</strong>.</p>
      </div>
      <div class="footer">
        <p>© 2025 Fixeify. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

export const getApprovalEmailTemplate = (email: string, name: string, password: string): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Fixeify</title>
    <style>
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
      .content { padding: 30px; text-align: center; }
      .credentials { font-size: 18px; color: #00205B; margin: 20px 0; }
      .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <h1>Welcome to Fixeify!</h1>
        <p>Congratulations ${name}! You have been cleared for duty.</p>
        <p>Your login credentials are:</p>
        <div class="credentials">
          <p><strong>Username:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please change your password after logging in for security.</p>
      </div>
      <div class="footer">
        <p>© 2025 Fixeify. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

export const getRejectionEmailTemplate = (reason: string, pendingProId: string): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fixeify Request Rejected</title>
    <style>
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
      .content { padding: 30px; text-align: center; }
      .reason { font-size: 16px; color: #00205B; margin: 20px 0; }
      .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <h1>Request Rejected</h1>
        <p>We regret to inform you that your request has been rejected.</p>
        <div class="reason">
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>You can reapply by clicking the button below:</p>
        <a 
        href="${process.env.FRONTEND_URL}/become-pro?pendingProId=${pendingProId}" 
        style="display: inline-block; padding: 12px 24px; background-color: #032B44; color: #ffffff !important; text-decoration: none !important;
        border-radius: 5px; font-weight: bold; margin: 20px 0;"> Reapply Now </a>
        <p>If you have any questions, please contact support.</p>
      </div>
      <div class="footer">
        <p>© 2025 Fixeify. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

export const getResetPasswordEmailTemplate = (resetUrl: string): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Fixeify Password</title>
    <style>
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
      .content { padding: 30px; text-align: center; }
      .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #000; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <h1>Reset Your Fixeify Password</h1>
        <p>We received a request to reset your password. Click the button below to set a new password.</p>
        <a href="${resetUrl}"  style="display:inline-block; padding:12px 24px; background-color:#032B44; color:#ffffff; text-decoration:none; border-radius:5px; font-weight:bold; margin:20px 0;">Reset Password</a>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© 2025 Fixeify. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;
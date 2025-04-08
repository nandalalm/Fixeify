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
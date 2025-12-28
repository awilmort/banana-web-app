import nodemailer from 'nodemailer';
import axios from 'axios';

// Email via Microsoft Graph API (preferred when configured)
const isGraphConfigured = () => (
  !!process.env.GRAPH_TENANT_ID &&
  !!process.env.GRAPH_CLIENT_ID &&
  !!process.env.GRAPH_CLIENT_SECRET &&
  !!(process.env.GRAPH_SENDER_UPN || process.env.EMAIL_USER || process.env.EMAIL_FROM)
);

const getGraphAccessToken = async (): Promise<string> => {
  const tenantId = process.env.GRAPH_TENANT_ID!;
  const clientId = process.env.GRAPH_CLIENT_ID!;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET!;

  const form = new URLSearchParams();
  form.append('client_id', clientId);
  form.append('client_secret', clientSecret);
  form.append('grant_type', 'client_credentials');
  form.append('scope', 'https://graph.microsoft.com/.default');

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const resp = await axios.post(tokenUrl, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return resp.data.access_token as string;
};

const sendEmailViaGraph = async (options: EmailOptions): Promise<void> => {
  const accessToken = await getGraphAccessToken();
  const sender = process.env.GRAPH_SENDER_UPN || process.env.EMAIL_USER || process.env.EMAIL_FROM!;

  const bodyContent = options.html || options.text || '';
  const contentType = options.html ? 'HTML' : 'Text';

  const payload = {
    message: {
      subject: options.subject,
      body: {
        contentType,
        content: bodyContent
      },
      from: { emailAddress: { address: process.env.GRAPH_SENDER_UPN } },
      toRecipients: [
        { emailAddress: { address: options.to } }
      ],
      // Optional reply-to
      replyTo: process.env.EMAIL_FROM ? [{ emailAddress: { address: process.env.EMAIL_FROM } }] : undefined
    },
    saveToSentItems: false
  };

  // Application permissions: send as specific user
  const url = `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`;
  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
};

// SMTP transporter fallback (development/local testing)
const createSmtpTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = (process.env.EMAIL_SECURE === 'true') || port === 465;
  const user = process.env.EMAIL_USER || process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Email service is not configured. Set Microsoft Graph env or SMTP env variables.');
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'test@ethereal.email',
      pass: process.env.EMAIL_PASS || 'test123'
    }
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    if (isGraphConfigured()) {
      await sendEmailViaGraph(options);
      return;
    }

    // Fallback to SMTP (dev/local)
    const transporter = createSmtpTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@bananaranch.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Email could not be sent');
  }
};

export const sendVerificationEmail = async (user: any, token: string): Promise<void> => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify Your Email - Banana Ranch Villages</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .btn:hover { background: #218838; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
                <h2>Hello ${user.firstName},</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <p>This ensures you own the email and can continue using it securely for your account.</p>
                
                <div style="text-align: center;">
                    <a href="${verifyUrl}" class="btn">Verify Email Address</a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">${verifyUrl}</p>
                
                <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
                
                <p>If you didn't request this, please ignore this email.</p>
                
                <p>Best regards,<br>The Banana Ranch Villages Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Banana Ranch Villages. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
    Verify Your Email Address - Banana Ranch Villages
    
    Hello ${user.firstName},
    
    Please verify your email address by visiting the following link:
    
    ${verifyUrl}
    
    This verification link will expire in 24 hours.
    
    If you didn't request this, please ignore this email.
    
    Best regards,
    The Banana Ranch Villages Team
  `;

  await sendEmail({
    to: user.pendingEmail || user.email,
    subject: 'Verify Your Email Address - Banana Ranch Villages',
    html,
    text
  });
};

export const sendPasswordResetEmail = async (user: any, token: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset - Banana Ranch Villages</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .btn:hover { background: #c82333; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello ${user.firstName},</h2>
                <p>You requested a password reset for your Banana Ranch Villages account. Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="btn">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                
                <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <p>Best regards,<br>The Banana Ranch Villages Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Banana Ranch Villages. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    Hello ${user.firstName},
    
    You requested a password reset for your Banana Ranch Villages account. Please visit the following link to reset your password:
    
    ${resetUrl}
    
    This password reset link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, please ignore this email.
    
    Best regards,
    The Banana Ranch Villages Team
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request - Banana Ranch Villages',
    html,
    text
  });
};

export const sendReservationConfirmationEmail = async (reservation: any): Promise<void> => {
  const reservationUrl = `${process.env.FRONTEND_URL}/reservation/code/${reservation.reservationCode}`;
  const currentYear = new Date().getFullYear();

  // Determine guest name: prefer reservation.guestName, then user, else generic
  const guestName = (reservation.guestName && reservation.guestName.firstName && reservation.guestName.lastName)
    ? `${reservation.guestName.firstName} ${reservation.guestName.lastName}`
    : (reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : 'Guest');

  const firstName = (reservation.guestName && reservation.guestName.firstName)
    ? reservation.guestName.firstName
    : (reservation.user ? reservation.user.firstName : 'Guest');

  // Format dates
  const checkInDate = new Date(reservation.checkInDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const checkOutDate = reservation.checkOutDate 
    ? new Date(reservation.checkOutDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Build reservation details based on type
  let reservationDetails = '';
  let reservationTypeLabel = '';

  if (reservation.type === 'room') {
    reservationTypeLabel = 'Room Reservation';
    reservationDetails = `
      <p><strong>Check-in:</strong> ${checkInDate}</p>
      <p><strong>Check-out:</strong> ${checkOutDate}</p>
      <p><strong>Nights:</strong> ${reservation.totalNights}</p>
    `;
  } else if (reservation.type === 'daypass') {
    reservationTypeLabel = 'Day Pass Reservation';
    reservationDetails = `
      <p><strong>Visit Date:</strong> ${checkInDate}</p>
    `;
  } else if (reservation.type === 'event') {
    reservationTypeLabel = 'Event Reservation';
    reservationDetails = `
      <p><strong>Event Type:</strong> ${reservation.eventType ? (reservation.eventType.charAt(0).toUpperCase() + reservation.eventType.slice(1)) : 'Event'}</p>
      <p><strong>Event Date:</strong> ${checkInDate}</p>
      ${checkOutDate ? `<p><strong>End Date:</strong> ${checkOutDate}</p>` : ''}
      <p><strong>Expected Attendees:</strong> ${reservation.expectedAttendees || reservation.guests}</p>
      <p><strong>Description:</strong> ${reservation.eventDescription || 'N/A'}</p>
    `;
  }

  // Services list
  let servicesList = '';
  if (reservation.services) {
    const services = [];
    if (reservation.services.breakfast) services.push('Breakfast');
    if (reservation.services.airportTransfer) services.push('Airport Transfer');
    if (reservation.services.spa) services.push('Spa');
    if (reservation.services.aquaPark) services.push('Aqua Park');
    if (reservation.services.catering) services.push('Catering');
    if (reservation.services.decoration) services.push('Decoration');
    if (reservation.services.photography) services.push('Photography');
    if (reservation.services.musicSystem) services.push('Music System');
    
    if (services.length > 0) {
      servicesList = `<p><strong>Additional Services:</strong> ${services.join(', ')}</p>`;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reservation Confirmation - Banana Ranch Villages</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; padding: 12px 24px; background: #28a745; color: #ffffff !important; text-decoration: none !important; border-radius: 5px; margin: 20px 10px; cursor: pointer; }
            .btn-cancel { background: #dc3545; color: #ffffff !important; }
            .btn:hover { opacity: 0.9; }
            .summary-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .total-price { font-size: 24px; color: #28a745; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✓ Reservation Confirmed!</h1>
            </div>
            <div class="content">
                <h2>Hello ${firstName},</h2>
                <p>Thank you for choosing Banana Ranch Villages! Your ${reservationTypeLabel.toLowerCase()} has been confirmed.</p>
                
                <div class="summary-box">
                    <h3>${reservationTypeLabel}</h3>
                    ${reservationDetails}
                    <p><strong>Guest Name:</strong> ${guestName}</p>
                    <p><strong>Guests:</strong> ${reservation.guestDetails.adults} Adults, ${reservation.guestDetails.children} Children, ${reservation.guestDetails.infants} Infants</p>
                    <p><strong>Contact:</strong> ${reservation.contactInfo.email} | ${reservation.contactInfo.phone}</p>
                    ${servicesList}
                    ${reservation.specialRequests ? `<p><strong>Special Requests:</strong> ${reservation.specialRequests}</p>` : ''}
                    <hr>
                    <p class="total-price">Total: $${reservation.totalPrice.toFixed(2)}</p>
                    <p><strong>Status:</strong> ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}</p>
                    ${reservation.reservationCode ? `<p><strong>Reservation Code:</strong> ${reservation.reservationCode}</p>` : ''}
                </div>
                
                <div style="text-align: center;">
                  <a href="${reservationUrl}" class="btn" style="color:#ffffff !important;" target="_blank" rel="noopener noreferrer">View Reservation</a>
                </div>
                
                <p><strong>Important Information:</strong></p>
                <ul>
                    <li>Please arrive at the check-in time specified</li>
                    <li>Bring a valid ID for check-in</li>
                    <li>Cancellations must be made at least 24 hours in advance</li>
                    <li>Contact us at info@bananaranch.com for any questions</li>
                </ul>
                
                <p>We look forward to welcoming you to Banana Ranch Villages!</p>
                
                <p>Best regards,<br>The Banana Ranch Villages Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${currentYear} Banana Ranch Villages. All rights reserved.</p>
                <p>Need help? Contact us at info@bananaranch.com or call +1-234-567-8900</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
    Reservation Confirmed - Banana Ranch Villages
    
    Hello ${firstName},
    
    Thank you for choosing Banana Ranch Villages! Your ${reservationTypeLabel.toLowerCase()} has been confirmed.
    
    RESERVATION SUMMARY
    -------------------
    ${reservationTypeLabel}
    ${reservation.type === 'room' ? `Check-in: ${checkInDate}\nCheck-out: ${checkOutDate}\nNights: ${reservation.totalNights}` : ''}
    ${reservation.type === 'daypass' ? `Visit Date: ${checkInDate}` : ''}
    ${reservation.type === 'event' ? `Event Type: ${reservation.eventType}\nEvent Date: ${checkInDate}\nExpected Attendees: ${reservation.expectedAttendees || reservation.guests}` : ''}
    
    Guest Name: ${guestName}
    Guests: ${reservation.guestDetails.adults} Adults, ${reservation.guestDetails.children} Children, ${reservation.guestDetails.infants} Infants
    Contact: ${reservation.contactInfo.email} | ${reservation.contactInfo.phone}
    
    Total: $${reservation.totalPrice.toFixed(2)}
    Status: ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
    ${reservation.reservationCode ? `Reservation Code: ${reservation.reservationCode}` : ''}
    
    View your reservation:
    ${reservationUrl}
    
    IMPORTANT INFORMATION:
    - Please arrive at the check-in time specified
    - Bring a valid ID for check-in
    - Cancellations must be made at least 24 hours in advance
    - Contact us at info@bananaranch.com for any questions
    
    We look forward to welcoming you to Banana Ranch Villages!
    
    Best regards,
    The Banana Ranch Villages Team
  `;

  await sendEmail({
    to: reservation.contactInfo.email,
    subject: `Reservation Confirmed - Banana Ranch Villages (${reservation.reservationCode || 'CONFIRMED'})`,
    html,
    text
  });
};

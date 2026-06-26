const nodemailer = require('nodemailer');

/**
 * Builds a nodemailer transporter using SMTP settings from environment.
 * Defaults to Gmail on port 587 with STARTTLS. (6.6)
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        requireTLS: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const buildFromAddress = () => {
    const name = process.env.SMTP_FROM_NAME || 'RentoQuick';
    const email = process.env.SMTP_USER || 'noreply@rentoquick.com';
    return `"${name}" <${email}>`;
};

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from: buildFromAddress(), to, subject, html });
    console.log(`Email sent to ${to} - messageId: ${info.messageId}`);
    return info;
};

// 4.9 — Return { ok, error } so caller can surface failures
const sendVerificationEmail = async (email, otp) => {
    try {
        await sendEmail({
            to: email,
            subject: 'Your RentoQuick Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(135deg,#de6b6b,#e8534b); padding: 32px; text-align:center;">
                        <h1 style="color:#fff; margin:0; font-size:24px; letter-spacing:1px;">RentoQuick</h1>
                        <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:13px;">P2P Rental Marketplace</p>
                    </div>
                    <div style="padding: 36px 32px;">
                        <h2 style="color:#222; margin-top:0;">Verify Your Email Address</h2>
                        <p style="color:#555; font-size:15px; line-height:1.6;">Thanks for joining! Enter the code below to verify your email address.</p>
                        <div style="background:#fff5f5; border: 2px dashed #de6b6b; border-radius:12px; padding: 24px; text-align:center; margin: 28px 0;">
                            <p style="margin:0 0 8px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:2px;">Your verification code</p>
                            <div style="font-size:42px; font-weight:800; letter-spacing:12px; color:#de6b6b;">${otp}</div>
                        </div>
                        <p style="color:#888; font-size:13px; text-align:center;">This code expires in <strong>10 minutes</strong>.</p>
                    </div>
                    <div style="background:#f9f9f9; padding: 20px 32px; text-align:center; font-size:12px; color:#aaa;">&copy; ${new Date().getFullYear()} RentoQuick. All rights reserved.</div>
                </div>
            `,
        });
        return { ok: true };
    } catch (err) {
        console.error(`[EMAIL] Failed to send OTP to ${email}:`, err.message);
        return { ok: false, error: err.message };
    }
};

const sendPasswordResetEmail = async (email, resetToken) => {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    try {
        await sendEmail({
            to: email,
            subject: 'Reset Your RentoQuick Password',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(135deg,#de6b6b,#e8534b); padding: 32px; text-align:center;">
                        <h1 style="color:#fff; margin:0; font-size:24px;">RentoQuick</h1>
                    </div>
                    <div style="padding: 36px 32px;">
                        <h2 style="color:#222; margin-top:0;">Password Reset Request</h2>
                        <p style="color:#555; font-size:15px; line-height:1.6;">We received a request to reset your password.</p>
                        <div style="text-align:center; margin: 32px 0;">
                            <a href="${resetUrl}" style="display:inline-block; padding:14px 32px; background:#de6b6b; color:#fff; border-radius:10px; text-decoration:none; font-weight:700; font-size:15px;">Reset Password</a>
                        </div>
                        <p style="color:#888; font-size:13px; text-align:center;">This link expires in <strong>10 minutes</strong>.</p>
                    </div>
                    <div style="background:#f9f9f9; padding: 20px 32px; text-align:center; font-size:12px; color:#aaa;">&copy; ${new Date().getFullYear()} RentoQuick. All rights reserved.</div>
                </div>
            `,
        });
        return { ok: true };
    } catch (err) {
        console.error(`[EMAIL] Failed to send reset email to ${email}:`, err.message);
        return { ok: false, error: err.message };
    }
};

const verifyEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('SMTP connection verified - emails will be delivered via', process.env.SMTP_HOST || 'smtp.gmail.com');
    } catch (err) {
        console.warn('SMTP connection failed:', err.message);
        console.warn('   Email delivery will not work. Check SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    }
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, verifyEmailConfig };

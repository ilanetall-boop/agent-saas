/**
 * Email Service
 * Handles sending emails for verification, password reset, notifications, etc.
 * Uses Resend API: https://resend.com/
 */

const https = require('https');

/**
 * Send email via Resend API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail(to, subject, html) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.RESEND_API_KEY;
        
        if (!apiKey) {
            console.warn('[EMAIL] RESEND_API_KEY not configured - email sending disabled');
            resolve({
                success: false,
                error: 'Email service not configured',
                testMode: true,
                to,
                subject
            });
            return;
        }
        
        const payload = JSON.stringify({
            from: process.env.EMAIL_FROM || 'onboarding@mybestagent.io',
            to,
            subject,
            html
        });
        
        const options = {
            hostname: 'api.resend.com',
            port: 443,
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            success: true,
                            messageId: response.id
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.message || 'Failed to send email'
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: 'Failed to parse email response'
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(payload);
        req.end();
    });
}

/**
 * Send email verification
 * @param {string} email - User's email
 * @param {string} verificationToken - Verification token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendVerificationEmail(email, verificationToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://mybestagent.io';
    const verificationLink = `${frontendUrl}/verify?token=${verificationToken}`;
    
    const subject = 'Vérifiez votre adresse email - My Best Agent';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bienvenue sur My Best Agent! 🎯</h1>
        </div>
        <div class="content">
            <p>Salut,</p>
            <p>Merci de vous être inscrit! Pour commencer, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous:</p>
            <a href="${verificationLink}" class="button">Vérifier mon email</a>
            <p><strong>Ou copiez ce lien:</strong></p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">${verificationLink}</p>
            <p style="color: #999; font-size: 13px;">Ce lien expire dans 24 heures.</p>
        </div>
        <div class="footer">
            <p>© 2026 My Best Agent. Tous droits réservés.</p>
            <p>Si vous n'avez pas créé ce compte, ignorez cet email.</p>
        </div>
    </div>
</body>
</html>
    `;
    
    try {
        const result = await sendEmail(email, subject, html);
        return result;
    } catch (error) {
        console.error('[EMAIL] Error sending verification email:', error);
        return {
            success: false,
            error: 'Failed to send verification email'
        };
    }
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @param {string} resetToken - Password reset token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(email, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://mybestagent.io';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const subject = 'Réinitialiser votre mot de passe - My Best Agent';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
        </div>
        <div class="content">
            <p>Salut,</p>
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer:</p>
            <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            <p style="color: #999; font-size: 13px;">Ce lien expire dans 1 heure.</p>
            <p style="color: #999; font-size: 13px;">Si vous n'avez pas demandé cela, ignorez cet email.</p>
        </div>
        <div class="footer">
            <p>© 2026 My Best Agent. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
    `;
    
    try {
        const result = await sendEmail(email, subject, html);
        return result;
    } catch (error) {
        console.error('[EMAIL] Error sending password reset email:', error);
        return {
            success: false,
            error: 'Failed to send password reset email'
        };
    }
}

/**
 * Send welcome email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendWelcomeEmail(email, name) {
    const subject = 'Bienvenue sur My Best Agent! 🎯';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bienvenue, ${name || 'ami'}! 🎯</h1>
        </div>
        <div class="content">
            <p>Votre compte My Best Agent est maintenant actif!</p>
            <p>Voici ce que vous pouvez faire:</p>
            
            <div class="feature">
                <strong>💬 Chattez avec des IA puissantes</strong>
                <p>Accès à 6 modèles différents: Mistral, Claude, GPT-4, et plus.</p>
            </div>
            
            <div class="feature">
                <strong>🚀 Améliorez vos workflows</strong>
                <p>Automatisez vos tâches avec nos intégrations.</p>
            </div>
            
            <div class="feature">
                <strong>🔐 Sécurité maximale</strong>
                <p>Chiffrement end-to-end, tokens sécurisés, audit logs.</p>
            </div>
            
            <p style="margin-top: 30px;">Questions? Contactez-nous à <strong>support@mybestagent.io</strong></p>
        </div>
        <div class="footer">
            <p>© 2026 My Best Agent. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
    `;
    
    try {
        const result = await sendEmail(email, subject, html);
        return result;
    } catch (error) {
        console.error('[EMAIL] Error sending welcome email:', error);
        return {
            success: false,
            error: 'Failed to send welcome email'
        };
    }
}

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};

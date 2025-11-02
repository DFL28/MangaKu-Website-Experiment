// ===== Vercel Serverless Function - Login =====
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Hardcoded admin credentials (for demo - in production use database)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$10$zkLf6ES3yZg1koNRPxqX9e8uYUY4IXW./CfLlxMdNDFNi2KPpIlyi'; // 'admin123'

// JWT Secret (in production use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'mangaku-secret-key-change-in-production';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token-ID, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password harus diisi'
            });
        }

        // Check if admin login
        if (username === ADMIN_USERNAME) {
            // Generate hash untuk password baru jika dibutuhkan
            // const hash = await bcrypt.hash('admin123', 10);
            // console.log('Hash:', hash);

            const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Username atau password salah'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    username: ADMIN_USERNAME,
                    role: 'admin'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                token,
                role: 'admin',
                message: 'Login berhasil'
            });
        }

        // For regular users (not implemented yet - use localStorage)
        return res.status(401).json({
            success: false,
            message: 'Username atau password salah'
        });

    } catch (error) {
        console.error('[Vercel] Login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

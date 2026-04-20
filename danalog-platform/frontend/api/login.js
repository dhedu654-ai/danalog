import { supabase } from './_supabase.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { username, password } = req.body;

        // Fetch user by username only (no longer comparing plaintext password)
        const { data: users, error } = await supabase
            .from('Users')
            .select('*')
            .eq('username', username);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!users || users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];

        if (user.status === 'INACTIVE') {
            return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }

        // Compare password: support both hashed and legacy plaintext
        let passwordMatch = false;
        if (user.password && user.password.startsWith('$2')) {
            // Bcrypt hash detected
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plaintext fallback (for accounts not yet migrated)
            passwordMatch = (password === user.password);

            // Auto-migrate: hash plaintext password on successful login
            if (passwordMatch) {
                const hashed = await bcrypt.hash(password, 10);
                await supabase.from('Users').update({ password: hashed }).eq('username', username);
            }
        }

        if (passwordMatch) {
            // Don't send password back
            const { password: p, ...userWithoutPassword } = user;
            return res.json({ user: userWithoutPassword, token: 'vercel-session' });
        } else {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (err) {
        console.error("Login server error:", err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

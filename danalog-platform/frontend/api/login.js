import { supabase } from './_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { username, password } = req.body;
        
        const { data: users, error } = await supabase
            .from('Users')
            .select('*')
            .eq('username', username)
            .eq('password', password);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (users && users.length > 0) {
            const user = users[0];
            if (user.status === 'INACTIVE') {
                return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
            }

            // Don't send password back
            const { password: p, ...userWithoutPassword } = user;
            return res.json(userWithoutPassword);
        } else {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (err) {
        console.error("Login server error:", err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

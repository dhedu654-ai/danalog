import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({ error: 'Missing username parameter' });
    }

    if (req.method === 'PUT') {
        // Update user
        try {
            const updates = req.body;
            
            // Remove fields that shouldn't be updated directly
            delete updates.id;
            delete updates.username;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('Users')
                .update(updates)
                .eq('username', username)
                .select();

            if (error) return res.status(500).json({ error: error.message });
            if (!data || data.length === 0) return res.status(404).json({ error: 'User not found' });

            return res.status(200).json(data[0]);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'DELETE') {
        // Delete user
        try {
            const { error } = await supabase
                .from('Users')
                .delete()
                .eq('username', username);

            if (error) return res.status(500).json({ error: error.message });

            return res.status(200).json({ success: true, deleted: username });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

import { supabase } from './_supabase.js';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Create new user
        try {
            const { username, password, role, name, licensePlate, phone, licenseType, employeeCode, fuelCapacity } = req.body;

            if (!username || !password || !role || !name) {
                return res.status(400).json({ error: 'Missing required fields: username, password, role, name' });
            }

            // Check if username already exists
            const { data: existing } = await supabase.from('Users').select('username').eq('username', username).single();
            if (existing) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            const userData = {
                username,
                password, // In production, this should be hashed
                role,
                name,
                licensePlate: licensePlate || null,
                phone: phone || null,
                licenseType: licenseType || null,
                employeeCode: employeeCode || null,
                fuelCapacity: fuelCapacity || null,
            };

            const { data, error } = await supabase.from('Users').insert([userData]).select();
            if (error) return res.status(500).json({ error: error.message });

            return res.status(201).json(data[0]);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'PUT') {
        // Update user
        try {
            const { username } = req.query;
            if (!username) return res.status(400).json({ error: 'Missing username parameter' });

            const updates = req.body;
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
            const { username } = req.query;
            if (!username) return res.status(400).json({ error: 'Missing username parameter' });

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

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  const { data, error } = await supabase
    .from('questions')
    .select('id, text, order, conditions')
    .order('order', { ascending: true });

  if (error) {
    console.error('[questions]', error.message);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }

  return res.status(200).json(data);
}

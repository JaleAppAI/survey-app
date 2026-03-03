import { createClient } from '@supabase/supabase-js';

const MAX_LENGTH = 5000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { questionId, responseText } = req.body ?? {};

  if (!questionId || typeof questionId !== 'string') {
    return res.status(400).json({ error: 'questionId is required' });
  }
  if (!responseText || typeof responseText !== 'string') {
    return res.status(400).json({ error: 'responseText is required' });
  }

  const trimmed = responseText.trim();

  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'responseText cannot be empty' });
  }
  if (trimmed.length > MAX_LENGTH) {
    return res.status(400).json({ error: `responseText exceeds ${MAX_LENGTH} character limit` });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  const { error } = await supabase
    .from('responses')
    .insert({ question_id: questionId, response_text: trimmed });

  if (error) {
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid questionId' });
    }
    console.error('[submit]', error.message);
    return res.status(500).json({ error: 'Failed to save response' });
  }

  return res.status(201).json({ success: true });
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasSupabase = supabaseUrl && supabaseKey;
export const supabase = hasSupabase ? createClient(supabaseUrl, supabaseKey) : null;

if (!hasSupabase) {
  console.warn('Supabase credentials missing. Falling back to localStorage for event storage.');
}

// Generate UUID for localStorage fallback
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const fetchEvents = async () => {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }
    return data;
  } else {
    // LocalStorage fallback
    const events = JSON.parse(localStorage.getItem('sutra_events') || '[]');
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

export const addEvent = async (eventData) => {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select();
    
    if (error) {
      console.error('Error adding event:', error);
      return null;
    }
    return data[0];
  } else {
    // LocalStorage fallback
    const events = JSON.parse(localStorage.getItem('sutra_events') || '[]');
    const newEvent = {
      id: generateUUID(),
      created_at: new Date().toISOString(),
      ...eventData
    };
    events.push(newEvent);
    localStorage.setItem('sutra_events', JSON.stringify(events));
    return newEvent;
  }
};

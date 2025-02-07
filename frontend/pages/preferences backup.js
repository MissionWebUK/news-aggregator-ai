// File: pages/preferences.js

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const Preferences = () => {
  const { data: session } = useSession();
  const [categories, setCategories] = useState('');
  const [keywords, setKeywords] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Use the backend API URL from environment variable
  const API_URL = "http://localhost:5001/api";

  // On component mount, fetch existing preferences if user is logged in
  useEffect(() => {
    if (session?.user) {
      fetch(`${API_URL}/preferences/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                 },
        credentials: 'include'
      })
        .then((res) => {
          //if (!res.ok) {
            //throw new Error('Failed to fetch preferences');
          //}
          return res.json();
        })
        .then((data) => {
          if (data.preference) {
            // Join arrays into comma-separated strings for form display
            setCategories(data.preference.categories.join(', '));
            setKeywords(data.preference.keywords.join(', '));
          }
        })
        .catch((err) => {
          console.error('Error fetching preferences:', err);
        });
    }
  }, [session, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Convert comma-separated strings into arrays, trimming any extra spaces
    const parsedCategories = categories
      .split(',')
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0);
    const parsedKeywords = keywords
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    try {
      const response = await fetch(`${API_URL}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          categories: parsedCategories,
          keywords: parsedKeywords,
        }),
      });
      const result = await response.json();

      if (response.ok) {
        setMessage('Preferences updated successfully.');
      } else {
        setMessage('Error updating preferences: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage('Error updating preferences.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Your Preferences</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="categories">Categories (comma-separated):</label>
          <input
            type="text"
            id="categories"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="e.g. technology, business, health"
          />
        </div>
        <div>
          <label htmlFor="keywords">Keywords (comma-separated):</label>
          <input
            type="text"
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. AI, startups, research"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Preferences;
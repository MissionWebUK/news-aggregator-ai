// File: frontend/pages/preferences.js

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDarkMode } from "../context/DarkModeContext";
import axios from "axios";

export default function Preferences() {
  // Always call hooks at the top
  const { darkMode } = useDarkMode();
  const { data: session, status } = useSession();

  // Declare state hooks unconditionally
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);

  // Fetch preferences from DB and localStorage on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (session?.user?.id) {
        try {
          // Include withCredentials so cookies are sent along
          const { data: dbPrefs } = await axios.get("/api/preferences", {
            withCredentials: true,
          });
          const localPrefsStr = localStorage.getItem("preferences");
          const localPrefs = localPrefsStr ? JSON.parse(localPrefsStr) : null;
          if (
            localPrefs &&
            dbPrefs &&
            localPrefs.updatedAt &&
            dbPrefs.updatedAt
          ) {
            const localDate = new Date(localPrefs.updatedAt);
            const dbDate = new Date(dbPrefs.updatedAt);
            if (localDate > dbDate) {
              // Local preferences are more recent – use them and update the DB.
              setSelectedCategories(localPrefs.categories);
              setKeywords(localPrefs.keywords);
              await axios.post("/api/preferences", localPrefs, {
                withCredentials: true,
              });
            } else {
              // DB preferences are more recent – use them and update localStorage.
              setSelectedCategories(dbPrefs.categories);
              setKeywords(dbPrefs.keywords);
              localStorage.setItem("preferences", JSON.stringify(dbPrefs));
            }
          } else if (localPrefs) {
            setSelectedCategories(localPrefs.categories);
            setKeywords(localPrefs.keywords);
          } else if (dbPrefs) {
            setSelectedCategories(dbPrefs.categories);
            setKeywords(dbPrefs.keywords);
            localStorage.setItem("preferences", JSON.stringify(dbPrefs));
          }
        } catch (error) {
          console.error("Error fetching preferences", error);
        }
      }
    };

    fetchPreferences();
  }, [session?.user?.id]);

  // Auto-save preferences to localStorage and DB (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const newPrefs = {
        categories: selectedCategories,
        keywords,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("preferences", JSON.stringify(newPrefs));
      if (session?.user?.id) {
        try {
          await axios.post("/api/preferences", newPrefs, {
            withCredentials: true,
          });
          setMessage("Preferences saved.");
          setTimeout(() => setMessage(""), 2000);
        } catch (error) {
          console.error("Error saving preferences", error);
          setMessage("Error saving preferences.");
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedCategories, keywords, session?.user?.id]);

  // Toggle category selection
  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Add a new keyword/tag
  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (trimmed !== "" && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setInputValue("");
    }
  };

  // Remove a keyword/tag
  const removeKeyword = (tag) => {
    setKeywords(keywords.filter((k) => k !== tag));
  };

  const categoriesList = [
    "Technology",
    "Business",
    "Sports",
    "Entertainment",
    "Health",
    "Science",
    "Politics",
    "Finance",
    "Gaming",
  ];

  return (
    // Outer layout: static sidebar and header with main content centered in a fixed-width container.
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
        <h2 className="text-xl font-bold mb-4">Menu</h2>
        <ul>
          <li className="mb-2">
            <a href="/" className="hover:underline">Home</a>
          </li>
          <li className="mb-2">
            <a href="/preferences" className="hover:underline">Preferences</a>
          </li>
          <li className="mb-2">
            <a href="/dashboard" className="hover:underline">Dashboard</a>
          </li>
        </ul>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-blue-900 text-white p-4">
          <h1 className="text-2xl font-bold">Preferences</h1>
        </header>

        {/* Content Container */}
        <div className="max-w-screen-xl mx-auto p-4">
          {status === "loading" ? (
            <p>Loading...</p>
          ) : (
            <>
              {/* Preferences Content */}
              <h1 className="text-2xl font-bold">Preferences</h1>

              {/* News Categories Selection */}
              <div className="mt-6">
                <h2 className="text-lg font-medium">News Categories</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  {categoriesList.map((category) => (
                    <label
                      key={category}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Keywords */}
              <div className="mt-6">
                <h2 className="text-lg font-medium">Custom Keywords</h2>
                <div className="flex items-center mt-3 space-x-2">
                  <input
                    type="text"
                    placeholder="Add keyword..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>

                {/* Display Added Keywords */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="flex items-center bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {message && <p className="mt-4 text-green-600">{message}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
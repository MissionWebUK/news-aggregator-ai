import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";

export default function Preferences() {
  const { darkMode } = useDarkMode();

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

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [inputValue, setInputValue] = useState("");

  // Load preferences from localStorage
  useEffect(() => {
    const savedCategories = JSON.parse(localStorage.getItem("selectedCategories")) || [];
    const savedKeywords = JSON.parse(localStorage.getItem("keywords")) || [];
    setSelectedCategories(savedCategories);
    setKeywords(savedKeywords);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("selectedCategories", JSON.stringify(selectedCategories));
    localStorage.setItem("keywords", JSON.stringify(keywords));
  }, [selectedCategories, keywords]);

  // Toggle category selection
  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Add a new keyword/tag
  const addKeyword = () => {
    if (inputValue.trim() !== "" && !keywords.includes(inputValue.trim())) {
      setKeywords([...keywords, inputValue.trim()]);
      setInputValue(""); // Clear input
    }
  };

  // Remove a keyword/tag
  const removeKeyword = (tag) => {
    setKeywords(keywords.filter((k) => k !== tag));
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6`}>
      <h1 className="text-2xl font-bold">Preferences</h1>

      {/* News Categories */}
      <div className="mt-6">
        <h2 className="text-lg font-medium">News Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          {categoriesList.map((category) => (
            <label key={category} className="flex items-center space-x-2 cursor-pointer">
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

      {/* Keywords */}
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
          <button onClick={addKeyword} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
              <button onClick={() => removeKeyword(keyword)} className="ml-2 text-red-500 hover:text-red-700">
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
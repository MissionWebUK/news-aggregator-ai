// File: frontend/pages/index.js
import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function Home() {
  // Get session data (if any)
  const { data: session } = useSession();

  // State for disjoint news arrays and UI flags
  const [displayLatestNews, setDisplayLatestNews] = useState([]);
  const [displayAiRankedNews, setDisplayAiRankedNews] = useState([]);
  const [displayCategoryCarousels, setDisplayCategoryCarousels] = useState([]);
  const [prefCategories, setPrefCategories] = useState([]);
  const [aiRankingEnabled, setAiRankingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper: default categories for non-authenticated users
  const defaultCategories = [
    "Technology",
    "Business",
    "Sports",
    "Entertainment",
    "Science",
    "Health",
    "Politics",
    "Finance",
    "Gaming",
  ];

  // Function to randomly pick n unique categories from a list
  function pickRandomCategories(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // Fetch data and compute disjoint article arrays on mount or when aiRankingEnabled/session changes.
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch Latest News (from /api/news)
        const resLatest = await axios.get("/api/news", { withCredentials: true });
        const latest = resLatest.data?.articles || [];

        // 2. Fetch AI Ranked News if applicable
        let aiNews = [];
        if (session && aiRankingEnabled) {
          const resAi = await axios.get("/api/news-rank", { withCredentials: true });
          aiNews = resAi.data?.articles || [];
        }

        // 3. Determine user preference categories.
        let categories = [];
        if (session) {
          const resPref = await axios.get("/api/preferences", { withCredentials: true });
          categories = resPref.data?.categories || [];
        } else {
          categories = pickRandomCategories(defaultCategories, 3);
        }
        setPrefCategories(categories);

        // 4. Create disjoint sets for display.
        // We'll use a Set to track which article URLs have been used.
        const usedURLs = new Set();

        // Latest News Carousel: use the first 8 articles from latest.
        const displayedLatest = latest.slice(0, 8);
        displayedLatest.forEach(article => {
          if (article.url) usedURLs.add(article.url);
        });

        // AI Ranked News Carousel: filter aiNews to remove duplicates.
        let displayedAiNews = [];
        if (session && aiRankingEnabled) {
          displayedAiNews = aiNews.filter(article => article.url && !usedURLs.has(article.url)).slice(0, 8);
          displayedAiNews.forEach(article => {
            if (article.url) usedURLs.add(article.url);
          });
        }

        // Category-Specific Carousels:
        // For each category (from preferences or defaults), filter latest articles that match AND haven't been used.
        const carousels = categories.map(cat => {
          const filtered = latest.filter(
            (article) =>
              article.categories &&
              article.categories.some(c => c.toLowerCase() === cat.toLowerCase()) &&
              article.url &&
              !usedURLs.has(article.url)
          );
          const displayedForCat = filtered.slice(0, 8);
          displayedForCat.forEach(article => {
            if (article.url) usedURLs.add(article.url);
          });
          return { category: cat, articles: displayedForCat };
        });

        // Update state with disjoint arrays.
        setDisplayLatestNews(displayedLatest);
        setDisplayAiRankedNews(displayedAiNews);
        setDisplayCategoryCarousels(carousels);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error fetching news data.");
      }
      setLoading(false);
    }
    fetchData();
  }, [aiRankingEnabled, session]);

  return (
    // Outer container: static sidebar and header with centered content.
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
        {/* AI Ranking Toggle in Sidebar */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-200">AI Ranking</h3>
          <label htmlFor="aiToggle" className="flex items-center cursor-pointer mt-2">
            <div className="relative">
              <input
                type="checkbox"
                id="aiToggle"
                className="sr-only"
                checked={aiRankingEnabled}
                onChange={() => setAiRankingEnabled(!aiRankingEnabled)}
              />
              <div className="w-10 h-4 bg-gray-400 rounded-full shadow-inner"></div>
              <div className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition transform ${aiRankingEnabled ? 'translate-x-6' : ''}`}></div>
            </div>
            <span className="ml-3 text-gray-200">{aiRankingEnabled ? 'On' : 'Off'}</span>
          </label>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-blue-900 text-white p-4">
          <h1 className="text-2xl font-bold">News Aggregator AI</h1>
        </header>

        {/* Content Wrapper: fixed max width and centered */}
        <div className="max-w-screen-xl mx-auto p-4">
          {error && (
            <div className="text-red-500">
              <span>⚠️ {error}</span>
            </div>
          )}
          {loading ? (
            <p className="text-center text-gray-600 dark:text-gray-300">Loading...</p>
          ) : (
            <>
              {/* Latest News Carousel */}
              <Carousel title="Latest News" articles={displayLatestNews} hideImage />

              {/* AI Ranked News Carousel (only if applicable) */}
              {session && aiRankingEnabled && displayAiRankedNews.length > 0 && (
                <Carousel title="AI Ranked News" articles={displayAiRankedNews} />
              )}

              {/* Category-Specific Carousels */}
              {displayCategoryCarousels.map((carousel) => (
                <Carousel
                  key={carousel.category}
                  title={carousel.category}
                  articles={carousel.articles}
                />
              ))}
            </>
          )}

          {/* Basic Footer */}
          <footer className="mt-8 border-t pt-4 text-center text-gray-600 dark:text-gray-300">
            <p>© 2025 News Aggregator AI. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/about" className="hover:underline">About Us</a>
              <a href="/privacy" className="hover:underline">Privacy</a>
              <a href="/terms" className="hover:underline">Terms & Conditions</a>
              <a href="/contact" className="hover:underline">Contact</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// Carousel Component: Displays a horizontal scrolling list of news cards.
function Carousel({ title, articles, hideImage = false }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {/* Carousel wrapper with horizontal padding */}
      <div className="flex flex-nowrap space-x-4 overflow-x-auto pb-2 pl-4 pr-20 pt-2">
        {articles && articles.length > 0 ? (
          articles.map((article, index) => (
            <NewsCard key={index} article={article} hideImage={hideImage} />
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-300">No articles available.</p>
        )}
      </div>
    </div>
  );
}

// NewsCard Component: Displays a single news article as a card.
// A default fallback image is used if article.urlToImage is missing.
// The card content is laid out in a flex column so that the "Read More" link is always aligned at the bottom.
// Also displays up to 2 categories.
function NewsCard({ article, hideImage = false }) {
  const defaultImage = "/img/No_Image_Available.jpg";

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition transform hover:scale-105 flex flex-col flex-shrink-0">
      {!hideImage && (
        <div className="relative w-full h-40">
          <Image
            src={article.urlToImage || defaultImage}
            alt={article.title}
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {article.title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {article.source} •{" "}
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString()
            : ""}
        </p>
        {article.categories && article.categories.length > 0 && (
          <p className="text-indigo-600 dark:text-indigo-400 text-sm mt-1">
            {article.categories.slice(0, 2).join(", ")}
          </p>
        )}
        <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
          {article.summary}
        </p>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-block text-blue-600 hover:underline text-sm"
        >
          Read More →
        </a>
      </div>
    </div>
  );
}
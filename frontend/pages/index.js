// File: frontend/pages/index.js
import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function Home() {
  // Get session data (if any)
  const { data: session } = useSession();

  // State for data and UI flags
  const [latestNews, setLatestNews] = useState([]);
  const [aiRankedNews, setAiRankedNews] = useState([]);
  const [categoryCarousels, setCategoryCarousels] = useState([]);
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

  // Fetch latest news, AI ranked news, and user preferences on mount or when aiRankingEnabled/session changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch Latest News (from /api/news)
        const resLatest = await axios.get("/api/news", { withCredentials: true });
        const latest = resLatest.data?.articles || [];
        setLatestNews(latest);

        // 2. Fetch AI Ranked News if user is authenticated and AI ranking is enabled
        if (session && aiRankingEnabled) {
          const resAi = await axios.get("/api/news-rank", { withCredentials: true });
          const aiNews = resAi.data?.articles || [];
          setAiRankedNews(aiNews);
        } else {
          setAiRankedNews([]);
        }

        // 3. Determine which categories to display for category-specific carousels:
        let categories = [];
        if (session) {
          // If user is signed in, fetch their preferences from /api/preferences
          const resPref = await axios.get("/api/preferences", { withCredentials: true });
          categories = resPref.data?.categories || [];
        } else {
          // Otherwise, pick 3 random default categories
          categories = pickRandomCategories(defaultCategories, 3);
        }
        setPrefCategories(categories);

        // 4. Build category carousels by filtering latestNews articles by category.
        // (Assumes each article has a "category" string)
        const carousels = categories.map((cat) => {
          const filtered = latest.filter(
            (article) =>
              article.category &&
              article.category.toLowerCase() === cat.toLowerCase()
          );
          return { category: cat, articles: filtered };
        });
        setCategoryCarousels(carousels);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error fetching news data.");
      }
      setLoading(false);
    }
    fetchData();
  }, [aiRankingEnabled, session]);

  // Toggle label for the AI Ranking switch
  const toggleLabel = aiRankingEnabled ? "AI Ranking: ON" : "AI Ranking: OFF";

  return (
    // Outer container: use overflow-x-hidden to ensure the page never scrolls horizontally.
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
          <h1 className="text-2xl font-bold">News Aggregator AI</h1>
        </header>

        {/* Content Wrapper: fixed max width and centered */}
        <div className="max-w-screen-xl mx-auto p-4">
          {/* Toggle Controls and Error */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <span className="mr-2">{toggleLabel}</span>
              <input
                type="checkbox"
                className="ml-2"
                checked={aiRankingEnabled}
                onChange={() => setAiRankingEnabled(!aiRankingEnabled)}
              />
            </label>
            {error && (
              <div className="text-red-500">
                <span>⚠️ {error}</span>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <p className="text-center text-gray-600 dark:text-gray-300">Loading...</p>
          ) : (
            <>
              {/* Latest News Carousel (no images, fixed width) */}
              <Carousel title="Latest News" articles={latestNews} hideImage />

              {/* AI Ranked News Carousel (only for authenticated users) */}
              {session && aiRankingEnabled && (
                <Carousel title="AI Ranked News" articles={aiRankedNews} />
              )}

              {/* Category-Specific Carousels */}
              {categoryCarousels.map((carousel) => (
                <Carousel
                  key={carousel.category}
                  title={carousel.category}
                  articles={carousel.articles}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Carousel Component: Displays a horizontal scrolling list of news cards.
// Each carousel container is self-contained and scrolls horizontally.
function Carousel({ title, articles, hideImage = false }) {
  // Limit to up to 8 articles.
  const displayedArticles = articles ? articles.slice(0, 8) : [];
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {/* Carousel wrapper: left padding is px-4, right padding increased to pr-20, and top padding is pt-2 */}
      <div className="flex flex-nowrap space-x-4 overflow-x-auto pb-2 pl-4 pr-20 pt-2 pb-6">
        {displayedArticles.length > 0 ? (
          displayedArticles.map((article, index) => (
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
function NewsCard({ article, hideImage = false }) {
  // Define a default placeholder image URL (make sure this image is in your public folder)
  const defaultImage = "/img/No_Image_Available.jpg";

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition transform hover:scale-105 flex-shrink-0">
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
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {article.title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {article.source} •{" "}
          {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ""}
        </p>
        <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
          {article.summary}
        </p>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-blue-600 hover:underline text-sm"
        >
          Read More →
        </a>
      </div>
    </div>
  );
}
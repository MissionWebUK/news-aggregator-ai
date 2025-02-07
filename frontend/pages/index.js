import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  const [news, setNews] = useState([]);
  const [aiRankingEnabled, setAiRankingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError("");

      try {
        // Determine the endpoint to use:
        // If AI ranking is enabled and there is a valid session, use "/api/news-rank"
        // Otherwise, use the public endpoint "/api/news"
        const endpoint = aiRankingEnabled && session ? "/api/news-rank" : "/api/news";

        // Fetch data from the API using a relative path and including credentials (cookies)
        const res = await axios.get(endpoint, { withCredentials: true });

        // Check if response is valid and contains an articles array
        if (res.data && Array.isArray(res.data.articles)) {
          setNews(res.data.articles);
        } else {
          console.error("❌ Unexpected API response format:", res.data);
          setNews([]);
          setError("Unexpected API response format.");
        }
      } catch (err) {
        console.error("❌ Axios Error:", err);
        if (err.response) {
          setError(`Error: ${err.response.status} - ${err.response.data.error || "Server Error"}`);
        } else if (err.request) {
          setError("No response received from server.");
        } else {
          setError(err.message);
        }
        setNews([]);
      }
      setLoading(false);
    };

    fetchNews();
  }, [aiRankingEnabled, session]);

  const toggleLabel = aiRankingEnabled ? "AI Ranking: ON" : "AI Ranking: OFF";

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-blue-900 text-white text-center py-6 shadow-lg">
        <h1 className="text-3xl font-bold">Latest Consumer Electronics News</h1>
      </header>

      {/* AI Ranking Toggle */}
      <div className="flex justify-center mt-4">
        <label className="flex items-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
          <span className="mr-2">{toggleLabel}</span>
          <input
            type="checkbox"
            className="ml-2"
            checked={aiRankingEnabled}
            onChange={() => setAiRankingEnabled(!aiRankingEnabled)}
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-center mt-4">
          ⚠️ {error}
        </div>
      )}

      {/* News Grid */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300 text-center col-span-full">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.length > 0 ? (
              news.map((article, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition transform hover:scale-105"
                >
                  {/* Article Image */}
                  {article.urlToImage ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={article.urlToImage}
                        alt={article.title}
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  ) : null}

                  {/* Article Content */}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {article.title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      {article.source} •{" "}
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : ""}
                    </p>
                    <p className="mt-3 text-gray-700 dark:text-gray-300">
                      {article.summary}
                    </p>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-blue-700 transition"
                    >
                      Read More →
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-300 text-center col-span-full">
                No articles available.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
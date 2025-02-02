import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [news, setNews] = useState([]); // Ensure it's an array

  useEffect(() => {
    console.log("Fetching news from:", `${process.env.NEXT_PUBLIC_BACKEND_URL}/news?query=electronics`); // ✅ Debug URL

    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/news?query=electronics`)
      .then((res) => {
        console.log("API Response from Backend:", res.data); // ✅ Debug API response

        if (res.data && Array.isArray(res.data.articles)) {
          setNews(res.data.articles);
        } else {
          console.error("Unexpected API response format:", res.data);
          setNews([]); // Prevents breaking `.map()`
        }
      })
      .catch((err) => {
        console.error("Axios Error:", err);
        setNews([]); // Handle errors by setting an empty array
      });
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
    {/* Page Header */}
      <header className="bg-blue-800 text-white text-center py-6">
        <h1 className="text-3xl font-bold">Latest Consumer Electronics News</h1>
      </header>

      {/* News Container */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {news.length > 0 ? (
          news.map((article, index) => (
            <div key={index} className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
              {article.urlToImage && (
                <img src={article.urlToImage} alt={article.title} className="w-full h-56 object-cover" />
              )}
  
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">{article.title}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                </p>
                <p className="mt-3 text-gray-700">{article.summary}</p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 font-medium mt-3 hover:underline"
                >
                  Read More →
                </a>
              </div>
            </div>
          ))
        ) : (
          <p>No news found or loading...</p>
        )}
      </main>
    </div>
  );
}
import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [news, setNews] = useState([]); // Ensure it's an array

  useEffect(() => {
    // console.log("Fetching news from:", `${process.env.NEXT_PUBLIC_BACKEND_URL}/news?query=electronics`); // ✅ Debug URL

    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/news?query=electronics`)
      .then((res) => {
        // console.log("API Response from Backend:", res.data); // ✅ Debug API response

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
      {/* Header */}
      <header className="bg-blue-900 text-white text-center py-6 shadow-lg">
        <h1 className="text-3xl font-bold">Latest Consumer Electronics News</h1>
      </header>

      {/* News Grid */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.length > 0 ? (
            news.map((article, index) => (
              <div key={index} className="bg-white shadow-md rounded-lg overflow-hidden transition transform hover:scale-105">
                {/* Image */}
                {article.urlToImage && (
                  <img src={article.urlToImage || "https://media.istockphoto.com/id/1452662817/vector/no-picture-available-placeholder-thumbnail-icon-illustration-design.jpg?s=612x612&w=0&k=20&c=bGI_FngX0iexE3EBANPw9nbXkrJJA4-dcEJhCrP8qMw="} alt={article.title} className="w-full h-48 object-cover rounded-md" />
                )}

                {/* Content */}
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900">{article.title}</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-gray-700">{article.summary}</p>

                  {/* Read More */}
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-blue-700 transition">
                    Read More →
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center col-span-full">Loading...</p>
          )}
        </div>
      </main>
    </div>
  );
}
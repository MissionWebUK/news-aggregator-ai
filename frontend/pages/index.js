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
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold">Latest Consumer Electronics News</h1>
      {news.length > 0 ? (
        news.map((article, index) => (
          <div key={index} className="p-2 border-b">
            <p className="italic">{article}</p> {/* ✅ Display summary correctly */}
            <a href="#" target="_blank" className="text-blue-500">Read more</a>
          </div>
        ))
      ) : (
        <p>No news found or loading...</p>
      )}
    </div>
  );
}
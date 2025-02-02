import feedparser
import time
import json
import sys

# ✅ RSS Feeds to Fetch
RSS_FEEDS = {
    "The Verge": "https://www.theverge.com/rss/index.xml",
    "TechCrunch": "https://techcrunch.com/feed/",
    "Engadget": "https://www.engadget.com/rss.xml"
}

def fetch_rss_articles():
    """Fetch articles from multiple RSS feeds and return them as a list."""
    articles = []
    
    for source, url in RSS_FEEDS.items():
        # print(f"📥 Fetching from: {source}", file=sys.stderr)  # ✅ Print to stderr for debugging
        
        feed = feedparser.parse(url)
        
        for entry in feed.entries[:3]:  # ✅ Limit to 5 latest articles per source
            article = {
                "title": entry.get("title", "No Title"),
                "source": source,
                "publishedAt": entry.get("published", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
                "url": entry.get("link", ""),
                "summary": entry.get("summary", ""),
                "urlToImage": entry.get("media_content", [{}])[0].get("url", None)
            }
            articles.append(article)

    return articles

if __name__ == "__main__":
    # ✅ Convert to JSON and print for Node.js to read
    json_output = json.dumps(fetch_rss_articles(), indent=2)
    sys.stdout.write(json_output)
    sys.stdout.flush()
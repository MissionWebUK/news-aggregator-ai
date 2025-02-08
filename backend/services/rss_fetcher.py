# File: backend/services/rss_fetcher.py

import os
import sys
import feedparser
import json
import pymongo
from datetime import datetime, timezone
from bson import ObjectId
from dateutil import parser

# -------------------- QUICK FIX: TELL PYTHON WHERE TO FIND 'services' -------------------- #
# 'rss_fetcher.py' is in '/backend/services', so its parent is '/backend'.
# We append that parent to sys.path so Python sees '/backend/services' as a package root.

script_dir = os.path.dirname(os.path.abspath(__file__))        # /.../backend/services
backend_dir = os.path.dirname(script_dir)                      # /.../backend
sys.path.append(backend_dir)                                   # Add '/.../backend' to PYTHONPATH

# Now Python can handle 'from services.summarization.summarizer import ...'
from services.summarization.summarizer import summarize_text as generate_summary, extract_keywords


# Possibly store credentials in env vars (fallback to localhost for dev):
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "userdb")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "NewsArticle")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

RSS_FEEDS = {
    "The Verge": "https://www.theverge.com/rss/index.xml",
    "TechCrunch": "https://techcrunch.com/feed/",
    "Engadget": "https://www.engadget.com/rss.xml"
}

def article_exists(url):
    """Check if an article already exists in the database."""
    if not url:
        return False
    return collection.find_one({"url": url}) is not None

def fetch_rss_articles(limit=20):
    """
    Fetch articles from multiple RSS feeds, summarize them,
    extract keywords, and store in MongoDB.
    `limit` controls how many articles per feed to process.
    """
    articles = []
    # print("🔍 Debug: Fetching articles from RSS feeds...", file=sys.stderr)
    for source, rss_url in RSS_FEEDS.items():
        feed = feedparser.parse(rss_url)
        """print(f"📡 Checking {source}: Found {len(feed.entries)} articles", file=sys.stderr)"""

    for source, rss_url in RSS_FEEDS.items():
        feed = feedparser.parse(rss_url)

        """ For each article in the feed, extract relevant fields and store in MongoDB """
        for entry in feed.entries[:limit]:

            print({entry}, file=sys.stderr)

            """ Check if article already exists in the database """
            article_url = entry.get("link", "")
            if article_exists(article_url):
                continue

            """ Get the Title, Publication Date, Summary, and Image URL """
            title = entry.get("title", "No Title")

            # Parse publication date
            published_at_str = entry.get("published", None)
            if published_at_str:
                try:
                    published_at = parser.parse(published_at_str)
                    # Convert to UTC, keep tzinfo
                    published_at = published_at.astimezone(timezone.utc)
                except Exception as e:
                    print(f"⚠️ Failed to parse date '{published_at_str}', using current UTC. Error: {e}", file=sys.stderr)
                    published_at = datetime.now(timezone.utc)
            else:
                published_at = datetime.now(timezone.utc)

            # Summarize the feed entry's summary
            summary_text = entry.get("summary", "")
            ai_summary = generate_summary(summary_text)
            keywords = extract_keywords(summary_text)

            # Attempt to find an image
            media_content = entry.get("media_content", [{}])
            image_url = media_content[0].get("url") if media_content else None

            article_doc = {
                "title": title,
                "source": source,
                "publishedAt": published_at,  # stored as datetime (UTC)
                "url": article_url,
                "summary": ai_summary,
                "urlToImage": image_url,
                "keywords": keywords
            }
            # Insert into MongoDB
            inserted = collection.insert_one(article_doc)
            article_doc["_id"] = str(inserted.inserted_id)
            articles.append(article_doc)

            # print(f"✅ Inserted {title} ({article_url})", file=sys.stderr)

    return articles

# -------------------- MAIN PROCESS LOOP -------------------- #

if __name__ == "__main__":
    def serialize(obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            # Return ISO-8601 with UTC
            return obj.astimezone(timezone.utc).isoformat()
        raise TypeError(f"Type not serializable: {type(obj)}")

    # Run fetch
    try:
        fetched = fetch_rss_articles(limit=20)
        # Print as JSON
        # print(json.dumps(fetched, indent=2, default=serialize))
    except Exception as e:
        print(f"❌ Error in rss_fetcher.py: {e}", file=sys.stderr)
        sys.exit(1)
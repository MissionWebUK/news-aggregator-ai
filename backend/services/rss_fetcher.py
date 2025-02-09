# File: backend/services/rss_fetcher.py

import os
import sys
import feedparser
import json
import pymongo
from datetime import datetime, timezone
from bson import ObjectId
from dateutil import parser
from urllib.parse import urlparse, urlunparse

# -------------------- QUICK FIX: TELL PYTHON WHERE TO FIND 'services' -------------------- #
script_dir = os.path.dirname(os.path.abspath(__file__))        # e.g. /.../backend/services
backend_dir = os.path.dirname(script_dir)                      # e.g. /.../backend
sys.path.append(backend_dir)                                   # add backend to PYTHONPATH

from services.summarization.summarizer import summarize_text as generate_summary, extract_keywords

# -------------------- ZERO-SHOT CATEGORIZATION SETUP -------------------- #
from transformers import pipeline
import torch

# Use GPU if available (or CPU otherwise)
device = 0 if torch.cuda.is_available() else -1
classifier = pipeline(
    "zero-shot-classification", 
    model="facebook/bart-large-mnli", 
    device=device
)

# Define the target categories (candidate labels)
TARGET_CATEGORIES = [
    "Technology", "Entertainment", "Politics", "Business", "Health", 
    "Sports", "Gaming", "Science", "Finance", "General"
]

# -------------------- MONGODB SETUP -------------------- #
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "userdb")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "NewsArticle")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# -------------------- RSS FEED CONFIGURATION -------------------- #
# Existing feeds – you may later add more feeds (and limit total to 100)
RSS_FEEDS = {
    "The Verge": "https://www.theverge.com/rss/index.xml",
    "TechCrunch": "https://techcrunch.com/feed/",
    "Engadget": "https://www.engadget.com/rss.xml",
    "BBC": "http://feeds.bbci.co.uk/news/rss.xml",
    "Wired": "https://www.wired.com/feed/rss",
    "The Guardian": "https://www.theguardian.com/world/rss",
    "CNN": "http://rss.cnn.com/rss/edition.rss",
    "NY Times": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "Variety": "https://variety.com/feed/",
    "Politico": "https://www.politico.com/rss/politics08.xml",
    "Reuters Business": "http://feeds.reuters.com/reuters/businessNews",
    "Reuters Technology": "http://feeds.reuters.com/reuters/technologyNews",
    "Reuters World": "http://feeds.reuters.com/Reuters/worldNews",
    "Reuters Science": "http://feeds.reuters.com/reuters/scienceNews",
    "Reuters Health": "http://feeds.reuters.com/reuters/healthNews",
    "Reuters Arts": "http://feeds.reuters.com/news/artsculture",
    "Reuters Sports": "http://feeds.reuters.com/reuters/sportsNews",
    "Reuters Entertainment": "http://feeds.reuters.com/reuters/entertainment",
    "Reuters Lifestyle": "http://feeds.reuters.com/reuters/lifestyle",
    "Reuters OddlyEnough": "http://feeds.reuters.com/reuters/oddlyEnoughNews",
    "Reuters MostRead": "http://feeds.reuters.com/reuters/MostRead",
    "Reuters MostShared": "http://feeds.reuters.com/reuters/MostShared",
    "Reuters MostRecommended": "http://feeds.reuters.com/reuters/MostRecommended",
    "Reuters EditorsPicks": "http://feeds.reuters.com/reuters/EditorsPicks",
    "Reuters Analysis": "http://feeds.reuters.com/reuters/USVideoBreakingviews",
    "Reuters PersonalFinance": "http://feeds.reuters.com/news/personalFinance",
    "Reuters SmallBusiness": "http://feeds.reuters.com/reuters/smallBusinessNews",
    "Reuters TechnologyMedia": "http://feeds.reuters.com/news/reutersmedia",
    "Reuters Wealth": "http://feeds.reuters.com/news/wealth",
    "Reuters Environment": "http://feeds.reuters.com/reuters/environment",
    "Reuters Energy": "http://feeds.reuters.com/reuters/USenergyNews",
    "Reuters GlobalMarkets": "http://feeds.reuters.com/reuters/globalmarketsNews",
    "Reuters BondsNews": "http://feeds.reuters.com/reuters/bondsNews",
    "Reuters CurrenciesNews": "http://feeds.reuters.com/reuters/currenciesNews",
    "Reuters StocksNews": "http://feeds.reuters.com/reuters/stocksNews",
    "Reuters FundsNews": "http://feeds.reuters.com/reuters/fundsNews",
    "Reuters CommoditiesNews": "http://feeds.reuters.com/reuters/UScommoditiesNews",
    "Reuters FinancialServices": "http://feeds.reuters.com/reuters/financialServices",
    "Reuters HealthcareNews": "http://feeds.reuters.com/reuters/healthNews",
    "Reuters IndustrialsNews": "http://feeds.reuters.com/reuters/USindustrialsNews",
    "Reuters RetailNews": "http://feeds.reuters.com/reuters/USretailNews",
    "Reuters TelecommunicationsMedia": "http://feeds.reuters.com/reuters/telecomsMediaNews",
    "Reuters TransportationNews": "http://feeds.reuters.com/reuters/UStransportationNews",
    "Reuters AerospaceDefense": "http://feeds.reuters.com/reuters/aerospaceDefenseNews",
    "Reuters AutosNews": "http://feeds.reuters.com/reuters/USautosNews",
    "Medical News Today": "https://www.medicalnewstoday.com/rss",
    "Science Daily": "https://www.sciencedaily.com/rss/top.xml",
    "ESPN": "https://www.espn.com/espn/rss/news",
    "Polygon": "https://www.polygon.com/rss/index.xml",
    "CNBC Finance": "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    "Fox News": "http://feeds.foxnews.com/foxnews/latest",
    "Hacker News": "https://hnrss.org/frontpage",
    "The Onion": "https://www.theonion.com/rss",
    "NPR": "https://www.npr.org/rss/rss.php",
    "BuzzFeed": "https://www.buzzfeed.com/world.xml",
    "Vox": "https://www.vox.com/rss/index.xml",
    "The Atlantic": "https://www.theatlantic.com/feed/all/",
    "The Intercept": "https://theintercept.com/feed/?lang=en",
    "The Hill": "https://thehill.com/rss/syndicator/19110",
    "The Daily Beast": "https://feeds.thedailybeast.com/rss/articles",
    "The Independent": "https://www.independent.co.uk/rss",
    "The Washington Post": "http://feeds.washingtonpost.com/rss/",
    "The Wall Street Journal": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    "The New Yorker": "https://www.newyorker.com/feed/everything",
    "The Economist": "https://www.economist.com/latest/rss",
    "The Conversation": "https://theconversation.com/us/rss",
    "NBC News": "http://feeds.nbcnews.com/nbcnews/public/news",
    "AP News": "https://apnews.com/apf-topnews?format=rss",
    "Retuers Top News": "http://feeds.reuters.com/reuters/topNews"
}

# -------------------- HELPER FUNCTIONS -------------------- #
def article_exists(url):
    """Check if an article with this URL already exists in the database."""
    if not url:
        return False
    return collection.find_one({"url": url}) is not None

def sanitize_url(url):
    """Ensure the URL is absolute and uses http or https."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return None
        sanitized = urlunparse(parsed)
        return sanitized
    except Exception as e:
        print(f"⚠️ URL sanitization error for {url}: {e}", file=sys.stderr)
        return None

def extract_image_url(entry):
    """
    Attempt multiple strategies to extract an image URL from an RSS feed entry.
    """
    # Strategy 1: Check 'media_content'
    media_content = entry.get("media_content")
    if media_content and isinstance(media_content, list) and len(media_content) > 0:
        url = media_content[0].get("url")
        if url:
            sanitized = sanitize_url(url)
            if sanitized:
                return sanitized

    # Strategy 2: Check 'media_thumbnail'
    media_thumbnail = entry.get("media_thumbnail")
    if media_thumbnail and isinstance(media_thumbnail, list) and len(media_thumbnail) > 0:
        url = media_thumbnail[0].get("url")
        if url:
            sanitized = sanitize_url(url)
            if sanitized:
                return sanitized

    # Strategy 3: Check direct 'image' field
    image_field = entry.get("image")
    if image_field:
        if isinstance(image_field, dict):
            url = image_field.get("url")
        elif isinstance(image_field, str):
            url = image_field
        else:
            url = None
        if url:
            sanitized = sanitize_url(url)
            if sanitized:
                return sanitized

    # Strategy 4: Parse HTML from 'content:encoded' or 'content'
    html_content = entry.get("content:encoded") or entry.get("content")
    if html_content:
        if isinstance(html_content, list):
            # If items are dictionaries, join their 'value' fields; otherwise, join string representations.
            if all(isinstance(item, dict) for item in html_content):
                html_content = " ".join(item.get("value", "") for item in html_content)
            else:
                html_content = " ".join(str(item) for item in html_content)
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            img_tag = soup.find('img')
            if img_tag and img_tag.get('src'):
                url = img_tag.get('src')
                sanitized = sanitize_url(url)
                if sanitized:
                    return sanitized
        except Exception as e:
            print(f"⚠️ Error parsing HTML content for image extraction: {e}", file=sys.stderr)

    # Strategy 5: Parse HTML from 'summary'
    summary = entry.get("summary")
    if summary:
        if isinstance(summary, list):
            if all(isinstance(item, dict) for item in summary):
                summary = " ".join(item.get("value", "") for item in summary)
            else:
                summary = " ".join(str(item) for item in summary)
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(summary, 'html.parser')
            img_tag = soup.find('img')
            if img_tag and img_tag.get('src'):
                url = img_tag.get('src')
                sanitized = sanitize_url(url)
                if sanitized:
                    return sanitized
        except Exception as e:
            print(f"⚠️ Error parsing summary content for image extraction: {e}", file=sys.stderr)

    # If all methods fail, return None so the UI fallback image will be used.
    return None

def extract_categories(entry):
    """
    Attempt to extract categories from the feed entry using available fields.
    Returns a list of categories (possibly empty).
    """
    assigned_categories = set()

    # Strategy 1: Check 'category' field
    raw_category = entry.get("category")
    if raw_category and isinstance(raw_category, str):
        normalized = raw_category.strip().capitalize()
        if normalized in TARGET_CATEGORIES:
            assigned_categories.add(normalized)

    # Strategy 2: Check 'tags' field (list of dicts with key 'term')
    tags = entry.get("tags")
    if tags and isinstance(tags, list):
        for tag in tags:
            term = tag.get("term")
            if term and isinstance(term, str):
                normalized = term.strip().capitalize()
                if normalized in TARGET_CATEGORIES:
                    assigned_categories.add(normalized)

    return list(assigned_categories)

def classify_article(text):
    """
    Use zero-shot classification to assign candidate categories.
    Returns a dictionary mapping labels to their scores.
    Uses multi_label=True so multiple categories can be returned.
    """
    result = classifier(text, candidate_labels=TARGET_CATEGORIES, multi_label=True)
    # Return a dictionary of label: score (scores are between 0 and 1)
    return dict(zip(result["labels"], result["scores"]))

def assign_categories(entry, title, summary_text):
    """
    Determine the article's categories.
    1. First, attempt to extract categories from feed metadata.
    2. If none found, use zero-shot classification on the article title and summary.
    Returns a list of categories.
    """
    assigned = extract_categories(entry)
    if assigned:
        return assigned

    # Build text for classification from title and summary.
    text_for_classification = f"{title}. {summary_text}"
    classification_scores = classify_article(text_for_classification)

    # Threshold: keep labels with score >= 0.5 (i.e. 50% or higher)
    ai_assigned = [label for label, score in classification_scores.items() if score >= 0.5]
    if not ai_assigned:
        # If no label meets the threshold, fallback to the highest-scored label or "General"
        if classification_scores:
            top_label = max(classification_scores, key=classification_scores.get)
            ai_assigned = [top_label]
        else:
            ai_assigned = ["General"]
    return ai_assigned

def fetch_rss_articles(limit=20):
    """
    Fetch articles from multiple RSS feeds, then:
      - Summarize them using the summarization pipeline.
      - Extract keywords.
      - Extract an image URL.
      - Determine categories (via feed data and/or AI fallback).
    Inserts each article into MongoDB and logs metrics.
    """
    articles = []
    total_articles = 0
    images_extracted = 0
    categories_assigned = 0

    for source, rss_url in RSS_FEEDS.items():
        feed = feedparser.parse(rss_url)
        print(f"📡 {source}: Found {len(feed.entries)} articles", file=sys.stderr)

        for entry in feed.entries[:limit]:
            total_articles += 1
            article_url = entry.get("link", "")
            if article_exists(article_url):
                continue

            title = entry.get("title", "No Title")

            # Parse publication date
            published_at_str = entry.get("published", None)
            if published_at_str:
                try:
                    published_at = parser.parse(published_at_str)
                    published_at = published_at.astimezone(timezone.utc)
                except Exception as e:
                    print(f"⚠️ Failed to parse date '{published_at_str}', using current UTC. Error: {e}", file=sys.stderr)
                    published_at = datetime.now(timezone.utc)
            else:
                published_at = datetime.now(timezone.utc)

            summary_text = entry.get("summary", "")
            ai_summary = generate_summary(summary_text)
            keywords = extract_keywords(summary_text)

            # Image extraction
            image_url = extract_image_url(entry)
            if image_url:
                images_extracted += 1

            # Categorization: assign categories either via feed fields or AI fallback.
            assigned_categories = assign_categories(entry, title, summary_text)
            if assigned_categories:
                categories_assigned += 1

            article_doc = {
                "title": title,
                "source": source,
                "publishedAt": published_at,  # stored as datetime (UTC)
                "url": article_url,
                "summary": ai_summary,
                "urlToImage": image_url,  # may be None if not found
                "keywords": keywords,
                "categories": assigned_categories  # new field: list of categories
            }
            inserted = collection.insert_one(article_doc)
            article_doc["_id"] = str(inserted.inserted_id)
            articles.append(article_doc)
            print(f"✅ Inserted {title} ({article_url}) with categories: {assigned_categories}", file=sys.stderr)

    # Log metrics
    print(f"📝 Processed {total_articles} articles; extracted images for {images_extracted} articles; assigned categories for {categories_assigned} articles.", file=sys.stderr)
    return articles

# -------------------- MAIN PROCESS LOOP -------------------- #
if __name__ == "__main__":
    def serialize(obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.astimezone(timezone.utc).isoformat()
        raise TypeError(f"Type not serializable: {type(obj)}")

    try:
        fetched = fetch_rss_articles(limit=20)
        # Optionally, print JSON to stdout:
        # print(json.dumps(fetched, indent=2, default=serialize))
    except Exception as e:
        print(f"❌ Error in rss_fetcher.py: {e}", file=sys.stderr)
        sys.exit(1)
import os
import sys
import json
import torch
import html
import time
import re
import concurrent.futures
from transformers import pipeline
from collections import Counter

# -------------------- DEVICE SELECTION -------------------- #
# Checks CUDA first, then MPS (Apple Silicon), else CPU
if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")
    print("⚠️ No GPU found (CUDA/MPS); using CPU", file=sys.stderr)

# For Hugging Face pipelines:
# If device.type != 'cpu', we pass device=0; otherwise, -1 for CPU
if device.type == "cpu":
    device_index = -1
else:
    device_index = 0

# -------------------- MODEL LOADING -------------------- #
# Using facebook/bart-large-cnn. You can replace with a smaller model if needed.
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=device_index
)

# -------------------- KEYWORD EXTRACTION (Optional) -------------------- #
def extract_keywords(text, num_keywords=5):
    """
    Extracts keywords from text using a simple word frequency analysis.
    Returns the top `num_keywords` words with length >= 4.
    """
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    word_counts = Counter(words)
    return [word for word, _ in word_counts.most_common(num_keywords)]

# -------------------- TEXT CLEANING & TRIMMING -------------------- #
def clean_text(text):
    """Decodes HTML entities and removes basic HTML tags, etc."""
    text = html.unescape(text)
    # Remove any remaining HTML tags
    text = re.sub(r"<[^>]*>", "", text)
    # Convert special ellipses
    text = text.replace("…", "...")
    return text.strip()

def trim_to_sentence_boundary(text, max_chars=150):
    """
    Trims the text to a maximum of `max_chars` while aiming to end on a sentence boundary.
    If no boundary is found, falls back to nearest word boundary + ellipsis.
    """
    if len(text) <= max_chars:
        return text

    trimmed_text = text[:max_chars]
    # Look for last punctuation + capital letter in reverse to find a boundary
    match = re.search(r'([.!?])\s+[A-Z]', trimmed_text[::-1])
    if match:
        cutoff_index = max_chars - match.start()
        return text[:cutoff_index].strip()
    else:
        return trimmed_text.rsplit(" ", 1)[0] + "..."

# -------------------- SUMMARIZATION LOGIC -------------------- #
def summarize_text(text):
    """
    Summarize text with dynamic settings.
    Times execution to handle slow cases; if it takes too long, we return a trimmed snippet.
    """
    if not isinstance(text, str):
        print(f"❌ Invalid Input Type: Expected string, got {type(text)}", file=sys.stderr)
        return "Error: Invalid input type"

    input_length = len(text.split())

    # If it's extremely short, just return as-is
    if input_length < 10:
        return text

    # If moderately short (< 50 words), keep min/max smaller
    if input_length < 50:
        min_length = 10
        max_length = min(60, input_length)  # keep it short
    else:
        # For longer texts:
        min_length = max(15, input_length // 6)
        max_length = min(120, max(min_length + 20, input_length // 3))

    # Ensure boundaries make sense
    if max_length >= input_length:
        max_length = input_length - 1
    if min_length >= max_length:
        min_length = max_length - 5

    # Hard-trim overly long inputs to 120 words to avoid memory/latency issues
    if input_length > 120:
        text = " ".join(text.split()[:120])
        input_length = 120

    # Attempt summarization
    start_time = time.time()
    try:
        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
    except Exception as e:
        print(f"❌ Summarization Error: {e}", file=sys.stderr)
        return "Error summarizing text"

    elapsed_time = time.time() - start_time
    # Post-check: If it took too long, fallback to safe truncation
    if elapsed_time > 9:
        print(f"⚠️ Summarization took too long ({elapsed_time:.2f}s), returning trimmed snippet", file=sys.stderr)
        return trim_to_sentence_boundary(text[:150])

    cleaned_summary = clean_text(summary[0]["summary_text"])
    return trim_to_sentence_boundary(cleaned_summary)

# -------------------- MAIN PROCESS LOOP -------------------- #
def process_input():
    """
    Continuously read lines (JSON arrays) from stdin.
    For each array, extract 'content' fields and summarize them.
    """
    print("✅ Python Summarization Process Started", file=sys.stderr)
    sys.stdout.flush()

    try:
        while True:
            line = sys.stdin.readline().strip()
            if not line:
                print("⚠️ Empty request received!", file=sys.stderr)
                continue

            try:
                articles = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"❌ JSON Decode Error: {e}", file=sys.stderr)
                continue

            # Extract text content safely
            contents = [article.get("content", "") for article in articles if isinstance(article, dict)]
            if not contents:
                response = json.dumps([])
                sys.stdout.write(response + "\n")
                sys.stdout.flush()
                continue

            # Concurrency: use max_workers=2
            summaries = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_to_text = {
                    executor.submit(summarize_text, text): text for text in contents
                }
                for future in concurrent.futures.as_completed(future_to_text):
                    summaries.append(future.result())

            # Return the summaries as JSON
            response = json.dumps(summaries)
            sys.stdout.write(response + "\n")
            sys.stdout.flush()
    except KeyboardInterrupt:
        print("Python summarizer: KeyboardInterrupt received, shutting down gracefully.", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    process_input()
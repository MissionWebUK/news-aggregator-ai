import os
import sys
import json
import torch
import html
import time
import re
import concurrent.futures
from transformers import pipeline

# 🚀 Enable GPU (MPS) for better performance on Apple Silicon
if torch.backends.mps.is_available():
    device = torch.device("mps")  # ✅ Use Apple GPU (MPS)
else:
    device = torch.device("cpu")  # ✅ Fallback to CPU if MPS is not available
    print("⚠️ MPS not available, using CPU", file=sys.stderr)

# ✅ Load summarization model on the selected device
summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=0 if device.type == "mps" else -1)

# ✅ Clean text summaries
def clean_text(text):
    """Fix encoding issues in text summaries."""
    text = html.unescape(text)  # ✅ Decode HTML entities (e.g., &amp -> &)
    text = text.replace("…", "...")  # ✅ Convert ellipses
    return text.strip()

def trim_to_sentence_boundary(text, max_chars=150):
    """Trims text but ensures it ends at a complete sentence."""
    if len(text) <= max_chars:
        return text  # No need to trim

    trimmed_text = text[:max_chars]
    
    # ✅ Search for the last complete sentence using regex
    match = re.search(r'([.!?])\s+[A-Z]', trimmed_text[::-1])  # Look for last punctuation before a capital letter

    if match:
        cutoff_index = max_chars - match.start()
        return text[:cutoff_index].strip()

    return trimmed_text.rsplit(" ", 1)[0] + "..."  # ✅ Fallback: trim to nearest full word

# ✅ Summarize text with time constraints
def summarize_text(text, timeout=9):
    """Summarize text with a timeout constraint."""
    if not isinstance(text, str):
        print(f"❌ Invalid Input Type: Expected string but got {type(text)}", file=sys.stderr)
        return "Error: Invalid input type"

    input_length = len(text.split())

    if input_length < 10:
        return text  # ✅ Too short, return as is

    # ✅ Adjust min/max summary length dynamically
    min_length = max(15, input_length // 6)
    max_length = min(120, max(min_length + 20, input_length // 3))  # Increased margin

    if max_length >= input_length:
        max_length = input_length - 1

    if min_length >= max_length:
        min_length = max_length - 5

    # ✅ Hard trim overly long inputs to **100 words**
    if input_length > 120:
        text = " ".join(text.split()[:120])
        input_length = len(text.split())

    # ✅ Set timeout dynamically (max 9s)
    dynamic_timeout = min(9, max(3, input_length // 50))  # Between 3s - 9s

    try:
        start_time = time.time()
        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
        elapsed_time = time.time() - start_time

        if elapsed_time > dynamic_timeout:
            print(f"⚠️ Summarization took too long ({elapsed_time:.2f}s), returning trimmed text", file=sys.stderr)
            return trim_to_sentence_boundary(text[:150])  # ✅ Apply safe trimming

        cleaned_summary = clean_text(summary[0]["summary_text"])
        return trim_to_sentence_boundary(cleaned_summary)

    except Exception as e:
        print(f"❌ Summarization Error: {e}", file=sys.stderr)
        return f"Error summarizing: {str(e)}"

# ✅ Process incoming JSON with optimized execution
def process_input():
    while True:
        try:
            line = sys.stdin.readline().strip()

            if not line:
                print("⚠️ Empty request received!", file=sys.stderr)
                continue

            # ✅ Debug incoming JSON format
            try:
                articles = json.loads(line)

            except json.JSONDecodeError as e:
                print(f"❌ JSON Decode Error: {e}", file=sys.stderr)
                continue

            # ✅ Extract content safely
            contents = [article.get("content", "") for article in articles if isinstance(article, dict)]

            # ✅ Reduce parallel processing (now only 1 thread per batch)
            batch_size = 1  # ✅ Only 1 concurrent task to avoid overload
            summaries = []

            with concurrent.futures.ThreadPoolExecutor(max_workers=batch_size) as executor:
                future_to_text = {executor.submit(summarize_text, text): text for text in contents}

                for future in concurrent.futures.as_completed(future_to_text):
                    summaries.append(future.result())

            response = json.dumps(summaries)
            sys.stdout.write(response + "\n")
            sys.stdout.flush()

        except Exception as e:
            print(f"❌ Unexpected Error: {e}", file=sys.stderr)
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()

# ✅ Start the summarization process
if __name__ == "__main__":
    print("✅ Python Summarization Process Started", file=sys.stderr)
    sys.stdout.flush()
    process_input()
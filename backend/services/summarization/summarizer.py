import os
import sys
import json
import torch
import time
import html
from transformers import pipeline 

# 🚀 Enable GPU (MPS) for better performance on Apple Silicon
if torch.backends.mps.is_available():
    device = torch.device("mps")  # ✅ Use Apple GPU (MPS)
    # print("✅ Using MPS (GPU) for summarization", file=sys.stderr)
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

def summarize_text(text):
    input_length = len(text.split())

    min_length = max(20, input_length // 4)
    max_length = min(input_length - 1, max(20, min_length * 2))

    if input_length < 10:
        return text
    
    try:
        # print(f"📥 Processing text: {text[:50]}...", file=sys.stderr)
        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
        # print(f"✅ Summary: {summary[0]['summary_text']}", file=sys.stderr)
        # return summary[0]["summary_text"]
        cleaned_summary = clean_text(summary[0]["summary_text"])  # ✅ Clean output
        return cleaned_summary
    except Exception as e:
        print(f"❌ Summarization Error: {e}", file=sys.stderr)
        return f"Error summarizing: {str(e)}"

def process_input():
    while True:
        try:
            line = sys.stdin.readline().strip()

            if not line:
                print("⚠️ Empty request received!", file=sys.stderr)
                continue

            # print(f"📥 Received input: {line}", file=sys.stderr)

            try:
                articles = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"❌ JSON Decode Error: {e}", file=sys.stderr)
                continue

            summaries = [summarize_text(article.get("content", "")) for article in articles]

            response = json.dumps(summaries)
            # print(f"📤 Sending output: {response}", file=sys.stderr)
            sys.stdout.write(response + "\n")
            sys.stdout.flush()

        except Exception as e:
            print(f"❌ Unexpected Error: {e}", file=sys.stderr)
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    print("✅ Python Summarization Process Started", file=sys.stderr)
    sys.stdout.flush()
    process_input()
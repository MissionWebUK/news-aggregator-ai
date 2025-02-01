import sys
import json
import time
from transformers import pipeline

# Load summarization model
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

def summarize_text(text):
    input_length = len(text.split())

    min_length = max(10, input_length // 5)
    max_length = min(input_length - 1, max(20, min_length * 2))

    if input_length < 10:
        return text  

    try:
        start_time = time.time()
        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
        return summary[0]["summary_text"]
    except Exception as e:
        return f"Error summarizing: {str(e)}"

def process_input():
    while True:
        try:
            line = sys.stdin.readline().strip()

            if not line:
                continue  # ✅ Ignore empty input without printing warnings

            try:
                articles = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"❌ JSON Decode Error: {e}", file=sys.stderr)
                continue

            summaries = [summarize_text(article.get("content", "")) for article in articles]

            response = json.dumps(summaries)
            sys.stdout.write(response + "\n")
            sys.stdout.flush()

        except Exception as e:
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    process_input()
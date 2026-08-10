#!/usr/bin/env python3
"""Scrape interview questions and answers from itlead.org/en/interview-questions.

Outputs a JSON file with the full question/answer set, grouped by category.
Run from the repository root with:
    python3 scripts/scrape-itlead-interview.py
"""
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

BASE_URL = "https://itlead.org"
MAIN_PAGE = f"{BASE_URL}/en/interview-questions"
OUT_PATH = Path("site/src/data/interview-questions.json")


def curl(url: str) -> str:
    result = subprocess.run(
        ["curl", "-sL", "--fail", "-A", "Mozilla/5.0 (compatible; Bot/0.1)", url],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to fetch {url}: {result.stderr}")
    return result.stdout


def get_soup(url: str) -> BeautifulSoup:
    return BeautifulSoup(curl(url), "html.parser")


def extract_category_links(soup: BeautifulSoup) -> list[tuple[str, str]]:
    """Extract (name, url) pairs for each category from the main page."""
    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if re.match(r"^/interview-questions/[^/]+$", href):
            name = a.get_text(strip=True)
            full_url = urljoin(BASE_URL, href.replace("/interview-questions/", "/en/interview-questions/"))
            if full_url not in seen:
                seen.add(full_url)
                links.append((name, full_url))
    return links


def extract_question_links(soup: BeautifulSoup) -> list[tuple[str, str, str]]:
    """Extract (title, slug, url) for each question in a category page."""
    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = re.match(r"^/interview-questions/([^/]+)/([^/]+)$", href)
        if m:
            slug = f"{m.group(1)}/{m.group(2)}"
            if slug in seen:
                continue
            seen.add(slug)
            full_url = urljoin(BASE_URL, f"/en/interview-questions/{slug}")
            title = a.get_text(strip=True)
            links.append((title, slug, full_url))
    return links


def extract_question_content(soup: BeautifulSoup) -> dict:
    """Extract question title and answer content from a question page."""
    title = ""
    if soup.title and soup.title.string:
        title = re.sub(r": .* Interview Question$", "", soup.title.string).strip()

    content_lines = []
    main = soup.find("main") or soup.find("article")
    if main:
        for tag in main.find_all(["nav", "footer", "aside", "script", "style"]):
            tag.decompose()
        content_lines = [line for line in main.get_text("\n", strip=True).splitlines() if line.strip()]

    # Clean known UI noise
    noise = {"Practice Problems", "Mark as read", "Notes", "Suggest an edit", "·"}
    cleaned = [line for line in content_lines if line not in noise]

    # Drop header metadata above "min read"
    try:
        cutoff = next(i for i, line in enumerate(cleaned) if "min read" in line.lower())
        cleaned = cleaned[cutoff + 1 :]
    except StopIteration:
        pass

    final_lines = [line for line in cleaned if not re.fullmatch(r"\d+", line)]
    return {"title": title, "content": "\n\n".join(final_lines)}


def main():
    print("Fetching main page...")
    main_soup = get_soup(MAIN_PAGE)
    categories = extract_category_links(main_soup)
    print(f"Found {len(categories)} categories")

    all_data = {}

    for idx, (cat_name, cat_url) in enumerate(categories, 1):
        print(f"[{idx}/{len(categories)}] {cat_name}")
        try:
            cat_soup = get_soup(cat_url)
        except Exception as e:
            print(f"  ERROR fetching category: {e}")
            continue

        questions = extract_question_links(cat_soup)
        cat_key = cat_url.rstrip("/").split("/")[-1]
        all_data[cat_key] = {
            "name": cat_name,
            "url": cat_url,
            "questions": [],
        }

        for q_title, q_slug, q_url in questions:
            try:
                q_soup = get_soup(q_url)
                content = extract_question_content(q_soup)
                all_data[cat_key]["questions"].append({
                    "title": content["title"] or q_title,
                    "slug": q_slug,
                    "url": q_url,
                    "answer": content["content"],
                })
                time.sleep(0.3)
            except Exception as e:
                print(f"    ERROR fetching {q_url}: {e}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(all_data, indent=2, ensure_ascii=False))
    total = sum(len(v["questions"]) for v in all_data.values())
    print(f"Saved {OUT_PATH} with {len(all_data)} categories and {total} questions.")


if __name__ == "__main__":
    main()
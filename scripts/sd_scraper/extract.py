"""Main-text extraction + metric harvesting for the System Design research corpus.

Pure functions, no network — unit-tested in test_extract.py.
"""
import re

try:
    import trafilatura
except ImportError:  # allow tests of harvest_numbers without the dep installed
    trafilatura = None


def fallback_extract(html: str) -> str:
    """Deterministic DOM-strip extractor: drop chrome tags, return article/main/body text.

    Used when trafilatura is unavailable or returns nothing. Tested directly because
    its chrome-stripping behavior is deterministic (unlike trafilatura's heuristics).
    """
    from selectolax.parser import HTMLParser

    tree = HTMLParser(html)
    for tag in ("nav", "footer", "script", "style", "header", "aside", "form"):
        for node in tree.css(tag):
            node.decompose()
    body = tree.css_first("article") or tree.css_first("main") or tree.body
    return body.text(separator=" ", strip=True) if body else ""


def extract_main_text(html: str) -> str:
    """Return the article body text. Prefers trafilatura; falls back to DOM strip."""
    if trafilatura is not None:
        out = trafilatura.extract(html, include_comments=False, include_tables=True)
        if out:
            return out
    return fallback_extract(html)


# ns / us / ms / s / sizes / rates / percentages / multipliers
_NUM_RE = re.compile(
    r"\b\d[\d,.]*\s?(?:ns|µs|us|ms|sec|s|KB|MB|GB|TB|PB|Kbps|Mbps|Gbps|"
    r"QPS|RPS|qps|rps|req/s|requests/s|/s|ops|%|x)\b",
    re.I,
)


def harvest_numbers(text: str) -> list[str]:
    """Extract quantitative claims (latencies, sizes, rates) as a sorted unique list."""
    return sorted({m.group(0).strip() for m in _NUM_RE.finditer(text)})

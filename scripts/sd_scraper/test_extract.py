from extract import extract_main_text, fallback_extract, harvest_numbers


def test_fallback_strips_chrome():
    html = (
        "<html><body><nav>menu home about</nav>"
        "<article><p>Consistent hashing maps keys to a ring of slots.</p></article>"
        "<footer>copyright footer links</footer></body></html>"
    )
    out = fallback_extract(html)
    assert "Consistent hashing maps keys" in out
    assert "menu" not in out
    assert "copyright footer" not in out


def test_extract_main_text_returns_body():
    html = "<html><body><article><p>A load balancer spreads requests across servers.</p></article></body></html>"
    out = extract_main_text(html)
    assert "load balancer spreads requests" in out


def test_harvest_numbers_finds_metrics():
    text = "A typical SSD read is 16 us and a datacenter round trip is 500 us at 10 Gbps."
    nums = harvest_numbers(text)
    joined = " ".join(nums)
    assert "16 us" in joined or "16us" in joined.replace(" ", "")
    assert any("500" in n for n in nums)
    assert any("Gbps" in n for n in nums)


def test_harvest_numbers_dedups_and_sorts():
    text = "100 QPS then 100 QPS again, plus 99.9%."
    nums = harvest_numbers(text)
    assert nums == sorted(nums)
    assert len([n for n in nums if "100" in n]) == 1

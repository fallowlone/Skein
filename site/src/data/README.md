# Interview Questions Data

`interview-questions.json` contains the full English question/answer set scraped from [itlead.org/en/interview-questions](https://itlead.org/en/interview-questions) for interview preparation.

## Structure

```ts
Record<string, {
  name: string;        // e.g. "HTML & CSS interview questions"
  url: string;         // Category URL
  questions: Array<{
    title: string;     // Question title
    slug: string;      // "<category>/<question>"
    url: string;       // Direct link to the original page
    answer: string;    // Full answer text
  }>
}>
```

## Regenerate

```bash
python3 scripts/scrape-itlead-interview.py
```

Requires Python 3 and `beautifulsoup4`:

```bash
pip install beautifulsoup4
```
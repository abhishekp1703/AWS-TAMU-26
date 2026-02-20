"""
AXIS — Lambda #1: Web Scraper
Deploy to: axis-scraper
Runtime: Python 3.12
Timeout: 30 seconds
Role: axis-lambda-role
"""

import json
import urllib.request
import urllib.parse
import re
from html.parser import HTMLParser


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip_tags = {'script', 'style', 'nav', 'footer', 'head', 'header'}
        self.current_skip = False

    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.current_skip = True

    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.current_skip = False

    def handle_data(self, data):
        if not self.current_skip and data.strip():
            self.text.append(data.strip())


def scrape_url(url, max_chars=3000):
    try:
        if not url.startswith('http'):
            url = 'https://' + url
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        response = urllib.request.urlopen(req, timeout=10)
        html = response.read().decode('utf-8', errors='ignore')
        parser = TextExtractor()
        parser.feed(html)
        text = ' '.join(parser.text)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:max_chars]
    except Exception as e:
        return f"Could not scrape {url}: {str(e)}"


def get_google_news(company_name):
    try:
        query = urllib.parse.quote(f"{company_name} Texas company")
        url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        response = urllib.request.urlopen(req, timeout=10)
        content = response.read().decode('utf-8', errors='ignore')

        titles = re.findall(r'<title><!\[CDATA\[(.*?)\]\]></title>', content)[1:6]
        descriptions = re.findall(r'<description><!\[CDATA\[(.*?)\]\]></description>', content)[1:6]

        news_items = []
        for i, title in enumerate(titles):
            desc = descriptions[i] if i < len(descriptions) else ""
            desc_clean = re.sub(r'<[^>]+>', '', desc)[:200]
            news_items.append(f"- {title}: {desc_clean}")

        return "\n".join(news_items) if news_items else "No recent news found."
    except Exception as e:
        return f"News unavailable: {str(e)}"


def get_company_logo_url(company_url):
    """Returns a Clearbit logo URL for use in the frontend"""
    try:
        domain = company_url.replace('https://', '').replace('http://', '').split('/')[0]
        return f"https://logo.clearbit.com/{domain}"
    except:
        return ""


def lambda_handler(event, context):
    # Handle both direct invocation and API Gateway
    if 'body' in event:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    else:
        body = event

    company_name = body.get('company_name', '').strip()
    company_url = body.get('company_url', '').strip()

    if not company_name:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'company_name is required'})
        }

    print(f"Scraping data for: {company_name}")
    scraped_text = f"COMPANY: {company_name}\n\n"

    # Source 1: Main company website
    if company_url:
        print(f"Scraping website: {company_url}")
        website_content = scrape_url(company_url, max_chars=3000)
        scraped_text += f"FROM COMPANY WEBSITE (Homepage):\n{website_content}\n\n"

        # Source 2: About page
        about_url = company_url.rstrip('/') + '/about'
        about_content = scrape_url(about_url, max_chars=1500)
        if "Could not scrape" not in about_content:
            scraped_text += f"FROM ABOUT PAGE:\n{about_content}\n\n"

        # Source 3: Leadership/Team page
        for path in ['/team', '/leadership', '/about/leadership', '/about/team']:
            leadership_url = company_url.rstrip('/') + path
            leadership_content = scrape_url(leadership_url, max_chars=1000)
            if "Could not scrape" not in leadership_content:
                scraped_text += f"FROM LEADERSHIP PAGE:\n{leadership_content}\n\n"
                break

    # Source 4: Google News
    print(f"Fetching news for: {company_name}")
    news = get_google_news(company_name)
    scraped_text += f"RECENT NEWS:\n{news}\n\n"

    # Source 5: Wikipedia attempt
    wiki_query = urllib.parse.quote(company_name.replace(' ', '_'))
    wiki_url = f"https://en.wikipedia.org/wiki/{wiki_query}"
    wiki_content = scrape_url(wiki_url, max_chars=2000)
    if "Could not scrape" not in wiki_content and "Wikipedia does not have" not in wiki_content:
        scraped_text += f"FROM WIKIPEDIA:\n{wiki_content}\n\n"

    logo_url = get_company_logo_url(company_url) if company_url else ""

    result = {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'scraped_content': scraped_text,
            'company_name': company_name,
            'logo_url': logo_url,
            'sources_scraped': ['website', 'about', 'news', 'wikipedia']
        })
    }

    print(f"Scraping complete. Total chars: {len(scraped_text)}")
    return result

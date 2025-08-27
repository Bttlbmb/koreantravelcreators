# publishconf.py — standalone production settings for GitHub Pages

AUTHOR = 'Influencer Bridge'
SITENAME = 'Korean Travel YouTubers – Europe'
SITEURL = 'https://bttlbmb.github.io/koreantravelcreators'
RELATIVE_URLS = False

PATH = 'content'
TIMEZONE = 'Europe/Berlin'
DEFAULT_LANG = 'en'

THEME = 'themes/bridge'

# Ship mock data to /data/ on the site
STATIC_PATHS = ['extra']
EXTRA_PATH_METADATA = {
    'extra/data/creators.json': {'path': 'data/creators.json'}
}

PAGE_PATHS = ['pages']
ARTICLE_PATHS = []

DEFAULT_PAGINATION = False

# put this near the bottom of both configs
DIRECT_TEMPLATES = []     # don’t auto-build blog index/archives/tags
INDEX_SAVE_AS = ''        # don’t write default index.html


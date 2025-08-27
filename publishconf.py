AUTHOR = 'Influencer Bridge'
SITENAME = 'Korean Travel YouTubers – Europe'
SITEURL = 'https://bttlbmb.github.io/koreantravelcreators'
RELATIVE_URLS = False

PATH = 'content'
TIMEZONE = 'Europe/Berlin'
DEFAULT_LANG = 'en'
THEME = 'themes/bridge'

STATIC_PATHS = ['extra']
EXTRA_PATH_METADATA = {
    'extra/data/creators.json': {'path': 'data/creators.json'}
}

PAGE_PATHS = ['pages']
ARTICLE_PATHS = []

DEFAULT_PAGINATION = False

# ensure Pelican doesn’t generate its own index
DIRECT_TEMPLATES = []
INDEX_SAVE_AS = ''

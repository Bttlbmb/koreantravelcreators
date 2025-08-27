AUTHOR = 'Influencer Bridge'
SITENAME = 'Korean Travel YouTubers – Europe'
SITEURL = ''

PATH = 'content'
TIMEZONE = 'Europe/Berlin'
DEFAULT_LANG = 'en'

THEME = 'themes/bridge'

# Static assets: ship /data/creators.json to /data/ on the site
STATIC_PATHS = ['extra']
EXTRA_PATH_METADATA = {
  'extra/data/creators.json': {'path': 'data/creators.json'}
}

# Pages live in content/pages
PAGE_PATHS = ['pages']
ARTICLE_PATHS = []

DEFAULT_PAGINATION = False

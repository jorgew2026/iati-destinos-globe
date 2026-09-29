#!/usr/bin/env python3
"""Aggregate GA4 purchase destinations into data.json for the GitHub Pages site (site/data.json).

Inputs (raw/):
  markets.json  rows {accountName, customEvent:destination, eventCount}  (ES, PT, IT, MX, CO, PE)
  row.json      rows {countryId, customEvent:destination, eventCount}    (ROW property)
Usage: python3 build.py START END   (dates YYYY-MM-DD of the queried range)
"""
import json, re, sys, unicodedata, datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

HERE = __file__.rsplit('/', 1)[0] or '.'
ROOT = HERE + '/..'
PROPS = {  # GA4 property -> (market, origin country)
    '318957079': ('ES', 'ES'), '377020835': ('PT', 'PT'), '502559947': ('IT', 'IT'),
    '423981075': ('LATAM', 'MX'), '462004576': ('LATAM', 'CO'), '443275626': ('LATAM', 'PE'),
}
MULTI = re.compile(r'^(europa|europe|mundo|world|mondo)', re.I)

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', '', s).strip()

names = json.load(open(f'{HERE}/names.json'))
ref = json.load(open(f'{HERE}/geo_ref.json'))

def blank():
    return {'policies': 0, 'dest': defaultdict(int), 'flows': defaultdict(int), 'regional': 0, 'unknown': 0}

mk = defaultdict(blank)

def add(market, origin, raw, n):
    m = mk[market]
    m['policies'] += n
    raw = (raw or '').strip()
    if raw in ('', '(not set)'):
        m['unknown'] += n; return
    if MULTI.match(raw):
        m['regional'] += n; return
    isos = {names.get(norm(t)) for t in raw.split(',')} - {None}
    if not isos:
        m['unknown'] += n; return
    for iso in isos:
        m['dest'][iso] += n
        if origin and origin != '(not set)':
            m['flows'][(origin, iso)] += n

for r in json.load(open(f'{ROOT}/raw/markets.json')):
    p = PROPS.get(str(r['accountName']))
    if p:
        add(p[0], p[1], r['customEvent:destination'], int(r['eventCount']))
for r in json.load(open(f'{ROOT}/raw/row.json')):
    add('ROW', r['countryId'], r['customEvent:destination'], int(r['eventCount']))

out = {'markets': {}, 'range': sys.argv[1:3],
       'updatedAt': datetime.datetime.now(ZoneInfo('Europe/Madrid')).strftime('%Y-%m-%dT%H:%M'),
       'names': {}, 'cen': {}}
used = set()
for key in ('ES', 'PT', 'IT', 'LATAM', 'ROW'):
    m = mk[key]
    dest = sorted(m['dest'].items(), key=lambda x: -x[1])
    flows = sorted(([o, d, v] for (o, d), v in m['flows'].items() if o != d), key=lambda x: -x[2])
    out['markets'][key] = {'policies': m['policies'], 'regional': m['regional'], 'unknown': m['unknown'],
                           'dest': dest, 'flows': flows[:120]}
    used |= {d for d, _ in dest} | {f[0] for f in flows[:120]}
for iso in used:
    if iso in ref['cen']:
        out['cen'][iso] = ref['cen'][iso]
        out['names'][iso] = ref['es'].get(iso, iso)

json.dump(out, open(f'{ROOT}/site/data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: (v['policies'], len(v['dest'])) for k, v in out['markets'].items()})

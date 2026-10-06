#!/usr/bin/env python3
"""Pull this week's (Monday -> today) purchase destinations from the IATI GA4 properties.

Auth: GOOGLE_APPLICATION_CREDENTIALS points to a service-account JSON key that has
Viewer access on every property below. Writes raw/markets.json and raw/row.json in
the row format build.py expects, then prints the date range it used.
"""
import datetime, json, os, sys
from zoneinfo import ZoneInfo
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange, Dimension, Filter, FilterExpression, Metric, RunReportRequest)

MARKET_PROPS = ['318957079', '377020835', '502559947', '423981075', '462004576', '443275626']
ROW_PROP = '349804887'
HERE = os.path.dirname(os.path.abspath(__file__))

today = datetime.datetime.now(ZoneInfo('Europe/Madrid')).date()
monday = today - datetime.timedelta(days=today.weekday())
client = BetaAnalyticsDataClient()

def run(prop, dims):
    req = RunReportRequest(
        property=f'properties/{prop}',
        date_ranges=[DateRange(start_date=monday.isoformat(), end_date=today.isoformat())],
        dimensions=[Dimension(name=d) for d in dims],
        metrics=[Metric(name='eventCount')],
        dimension_filter=FilterExpression(filter=Filter(
            field_name='eventName', string_filter=Filter.StringFilter(value='purchase'))),
        limit=100000)
    res = client.run_report(req)
    return [[v.value for v in r.dimension_values] + [int(r.metric_values[0].value)] for r in res.rows]

markets = []
for p in MARKET_PROPS:
    markets += [{'accountName': p, 'customEvent:destination': d, 'eventCount': n}
                for d, n in run(p, ['customEvent:destination'])]
row = [{'countryId': c, 'customEvent:destination': d, 'eventCount': n}
       for c, d, n in run(ROW_PROP, ['countryId', 'customEvent:destination'])]

os.makedirs(f'{HERE}/../raw', exist_ok=True)
json.dump(markets, open(f'{HERE}/../raw/markets.json', 'w'), ensure_ascii=False)
json.dump(row, open(f'{HERE}/../raw/row.json', 'w'), ensure_ascii=False)
print(monday.isoformat(), today.isoformat())

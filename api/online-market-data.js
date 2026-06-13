const FRED_SERIES = [
  { id: 'DGS10', label: 'US 10Y yield' },
  { id: 'DFII10', label: 'US 10Y real yield' },
  { id: 'T10YIE', label: '10Y breakeven inflation' },
  { id: 'DFF', label: 'Effective Fed funds' },
  { id: 'DTWEXBGS', label: 'Trade-weighted USD' },
  { id: 'UNRATE', label: 'Unemployment rate' },
  { id: 'PAYEMS', label: 'Nonfarm payrolls' },
  { id: 'CPIAUCSL', label: 'CPI index' },
];

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.end(JSON.stringify(payload));
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${JSON.stringify(payload).slice(0, 200)}`);
  }

  if (payload.Note || payload.Information || payload['Error Message']) {
    throw new Error(payload.Note || payload.Information || payload['Error Message']);
  }

  return payload;
}

function findGoldPrice(payload) {
  const candidates = [];

  function walk(value, path = []) {
    if (value == null) {
      return;
    }

    if (typeof value === 'number') {
      candidates.push({ path: path.join('.'), value });
      return;
    }

    if (typeof value === 'string') {
      const numeric = Number(value.replace(/,/g, ''));
      if (Number.isFinite(numeric)) {
        candidates.push({ path: path.join('.'), value: numeric });
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => walk(item, [...path, key]));
    }
  }

  walk(payload);

  const preferred = candidates.find((item) => /usd|price|spot|xau|gold/i.test(item.path) && item.value > 500);
  const fallback = candidates.find((item) => item.value > 500 && item.value < 10000);
  return preferred ?? fallback;
}

async function alphaGoldSpot(apiKey) {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GOLD_SILVER_SPOT');
  url.searchParams.set('symbol', 'GOLD');
  url.searchParams.set('apikey', apiKey);

  const payload = await fetchJson(url);
  const price = findGoldPrice(payload);

  if (!price) {
    throw new Error(`Unable to parse Alpha Vantage gold spot payload: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  return {
    symbol: 'XAUUSD',
    price: price.value,
    provider: 'Alpha Vantage',
    providerPath: price.path,
    asOf: new Date().toISOString(),
  };
}

async function alphaNews(apiKey) {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'NEWS_SENTIMENT');
  url.searchParams.set('topics', 'financial_markets,economy_monetary');
  url.searchParams.set('limit', '10');
  url.searchParams.set('apikey', apiKey);

  const payload = await fetchJson(url);
  const feed = Array.isArray(payload.feed) ? payload.feed : [];
  return feed.slice(0, 8).map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    timePublished: item.time_published,
    summary: item.summary,
    sentiment: item.overall_sentiment_label,
    score: Number(item.overall_sentiment_score ?? 0),
  }));
}

async function fredLatest(apiKey, series) {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', series.id);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '1');

  const payload = await fetchJson(url);
  const observation = payload.observations?.[0];
  const value = observation?.value === '.' ? null : Number(observation?.value);

  return {
    id: series.id,
    label: series.label,
    date: observation?.date,
    value: Number.isFinite(value) ? value : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  const fredKey = process.env.FRED_API_KEY;

  const result = {
    source: 'online-api',
    quote: null,
    macro: [],
    news: [],
    warnings: [],
    fetchedAt: new Date().toISOString(),
  };

  if (alphaKey) {
    const [quoteResult, newsResult] = await Promise.allSettled([alphaGoldSpot(alphaKey), alphaNews(alphaKey)]);

    if (quoteResult.status === 'fulfilled') {
      result.quote = quoteResult.value;
    } else {
      result.warnings.push(`Alpha Vantage quote: ${quoteResult.reason.message}`);
    }

    if (newsResult.status === 'fulfilled') {
      result.news = newsResult.value;
    } else {
      result.warnings.push(`Alpha Vantage news: ${newsResult.reason.message}`);
    }
  } else {
    result.warnings.push('ALPHA_VANTAGE_API_KEY is not configured');
  }

  if (fredKey) {
    const macroResults = await Promise.allSettled(FRED_SERIES.map((series) => fredLatest(fredKey, series)));
    result.macro = macroResults
      .filter((item) => item.status === 'fulfilled')
      .map((item) => item.value);

    macroResults
      .filter((item) => item.status === 'rejected')
      .forEach((item) => result.warnings.push(`FRED: ${item.reason.message}`));
  } else {
    result.warnings.push('FRED_API_KEY is not configured');
  }

  json(res, result.quote || result.macro.length || result.news.length ? 200 : 503, result);
}

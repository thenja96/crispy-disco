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

const CACHE_TTL = {
  candles: 60 * 1000,
  quote: 60 * 60 * 1000,
  news: 6 * 60 * 60 * 1000,
  macro: 6 * 60 * 60 * 1000,
};

const cache = {
  candles: new Map(),
  quote: null,
  news: null,
  macro: null,
};

const YAHOO_TIMEFRAMES = {
  M5: { interval: '5m', range: '1d', aggregate: 1 },
  M15: { interval: '15m', range: '5d', aggregate: 1 },
  H1: { interval: '60m', range: '1mo', aggregate: 1 },
  H4: { interval: '60m', range: '1mo', aggregate: 4 },
};

const TWELVE_DATA_TIMEFRAMES = {
  M5: '5min',
  M15: '15min',
  H1: '1h',
  H4: '4h',
};

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
  res.end(JSON.stringify(payload));
}

function isFresh(entry, ttl) {
  return entry && Date.now() - entry.updatedAt < ttl;
}

async function readThroughCache(key, ttl, loader) {
  const entry = cache[key];

  if (isFresh(entry, ttl)) {
    return { value: entry.value, warning: null, cacheStatus: 'fresh' };
  }

  try {
    const value = await loader();
    cache[key] = { value, updatedAt: Date.now() };
    return { value, warning: null, cacheStatus: 'refreshed' };
  } catch (error) {
    if (entry) {
      return {
        value: entry.value,
        warning: `${error.message} Serving cached ${key} from ${new Date(entry.updatedAt).toISOString()}.`,
        cacheStatus: 'stale',
      };
    }

    return { value: null, warning: error.message, cacheStatus: 'miss' };
  }
}

async function readThroughMapCache(map, mapKey, ttl, loader) {
  const entry = map.get(mapKey);

  if (isFresh(entry, ttl)) {
    return { value: entry.value, warning: null, cacheStatus: 'fresh' };
  }

  try {
    const value = await loader();
    map.set(mapKey, { value, updatedAt: Date.now() });
    return { value, warning: null, cacheStatus: 'refreshed' };
  } catch (error) {
    if (entry) {
      return {
        value: entry.value,
        warning: `${error.message} Serving cached ${mapKey} from ${new Date(entry.updatedAt).toISOString()}.`,
        cacheStatus: 'stale',
      };
    }

    return { value: null, warning: error.message, cacheStatus: 'miss' };
  }
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

function normalizeTwelveDataCandles(payload) {
  const values = Array.isArray(payload.values) ? payload.values : [];
  const candles = values
    .map((item) => ({
      time: new Date(`${item.datetime.replace(' ', 'T')}Z`).toISOString(),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
    }))
    .filter((candle) => {
      return [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value));
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .map((candle) => ({
      time: candle.time,
      open: Number(candle.open.toFixed(2)),
      high: Number(candle.high.toFixed(2)),
      low: Number(candle.low.toFixed(2)),
      close: Number(candle.close.toFixed(2)),
    }));

  if (candles.length === 0) {
    throw new Error(`Unable to parse Twelve Data XAU/USD payload: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  return candles;
}

async function twelveDataGoldSpotCandles(apiKey, timeframe) {
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', 'XAU/USD');
  url.searchParams.set('interval', TWELVE_DATA_TIMEFRAMES[timeframe] ?? TWELVE_DATA_TIMEFRAMES.M15);
  url.searchParams.set('outputsize', '300');
  url.searchParams.set('apikey', apiKey);

  const payload = await fetchJson(url);
  const candles = normalizeTwelveDataCandles(payload);
  const last = candles[candles.length - 1];

  return {
    candles,
    quote: {
      symbol: 'XAU/USD',
      price: last.close,
      provider: 'Twelve Data',
      asOf: last.time,
      note: 'Spot XAU/USD reference feed; compare against broker spread and session timing.',
    },
  };
}

function normalizeYahooCandles(payload, timeframe) {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];

  if (!Array.isArray(timestamps) || !quote) {
    throw new Error(`Unable to parse Yahoo Finance chart payload: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  const candles = timestamps
    .map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toISOString(),
      open: quote.open?.[index],
      high: quote.high?.[index],
      low: quote.low?.[index],
      close: quote.close?.[index],
    }))
    .filter((candle) => {
      return [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value));
    })
    .map((candle) => ({
      time: candle.time,
      open: Number(candle.open.toFixed(2)),
      high: Number(candle.high.toFixed(2)),
      low: Number(candle.low.toFixed(2)),
      close: Number(candle.close.toFixed(2)),
    }));

  const aggregate = YAHOO_TIMEFRAMES[timeframe]?.aggregate ?? 1;
  if (aggregate <= 1) {
    return candles;
  }

  const bucketMs = aggregate * 60 * 60 * 1000;
  const groups = new Map();

  candles.forEach((candle) => {
    const timestamp = new Date(candle.time).getTime();
    const bucketStart = Math.floor(timestamp / bucketMs) * bucketMs;
    const bucketKey = String(bucketStart);
    const group = groups.get(bucketKey) ?? [];
    group.push(candle);
    groups.set(bucketKey, group);
  });

  const aggregated = Array.from(groups.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bucketStart, group]) => ({
      time: new Date(Number(bucketStart)).toISOString(),
      open: group[0].open,
      high: Number(Math.max(...group.map((item) => item.high)).toFixed(2)),
      low: Number(Math.min(...group.map((item) => item.low)).toFixed(2)),
      close: group[group.length - 1].close,
    }));

  return aggregated;
}

async function yahooGoldFuturesCandles(timeframe) {
  const config = YAHOO_TIMEFRAMES[timeframe] ?? YAHOO_TIMEFRAMES.M15;
  const url = new URL('https://query1.finance.yahoo.com/v8/finance/chart/GC=F');
  url.searchParams.set('range', config.range);
  url.searchParams.set('interval', config.interval);

  const payload = await fetchJson(url);
  const candles = normalizeYahooCandles(payload, timeframe);

  if (candles.length === 0) {
    throw new Error('Yahoo Finance returned no usable GC=F candles');
  }

  const meta = payload.chart?.result?.[0]?.meta ?? {};

  return {
    candles,
    quote: {
      symbol: meta.symbol ?? 'GC=F',
      price: Number((meta.regularMarketPrice ?? candles[candles.length - 1].close).toFixed(2)),
      provider: 'Yahoo Finance',
      asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : candles[candles.length - 1].time,
      note: 'COMEX gold futures reference, not broker XAUUSD spot execution price.',
    },
  };
}

async function onlineGoldCandles(timeframe, twelveDataKey) {
  if (twelveDataKey) {
    try {
      return {
        ...(await twelveDataGoldSpotCandles(twelveDataKey, timeframe)),
        source: `Twelve Data XAU/USD ${timeframe}`,
        warning: null,
      };
    } catch (error) {
      const fallback = await yahooGoldFuturesCandles(timeframe);
      return {
        ...fallback,
        source: `Yahoo Finance GC=F ${timeframe}`,
        warning: `Twelve Data XAU/USD failed: ${error.message}. Falling back to Yahoo GC=F futures.`,
      };
    }
  }

  return {
    ...(await yahooGoldFuturesCandles(timeframe)),
    source: `Yahoo Finance GC=F ${timeframe}`,
    warning: 'TWELVE_DATA_API_KEY is not configured; using Yahoo GC=F futures fallback.',
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
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
  const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : 'M15';

  const result = {
    source: 'online-api',
    quote: null,
    candles: [],
    candleSource: null,
    macro: [],
    news: [],
    warnings: [],
    cache: {},
    fetchedAt: new Date().toISOString(),
  };

  const candleResult = await readThroughMapCache(cache.candles, timeframe, CACHE_TTL.candles, () =>
    onlineGoldCandles(timeframe, twelveDataKey),
  );

  if (candleResult.value) {
    result.candles = candleResult.value.candles;
    result.quote = candleResult.value.quote;
    result.candleSource = candleResult.value.source;
    result.cache.candles = candleResult.cacheStatus;

    if (candleResult.value.warning) {
      result.warnings.push(candleResult.value.warning);
    }
  }

  if (candleResult.warning) {
    result.warnings.push(`Yahoo Finance candles: ${candleResult.warning}`);
  }

  if (alphaKey) {
    const [quoteResult, newsResult] = await Promise.all([
      readThroughCache('quote', CACHE_TTL.quote, () => alphaGoldSpot(alphaKey)),
      readThroughCache('news', CACHE_TTL.news, () => alphaNews(alphaKey)),
    ]);

    if (quoteResult.value) {
      result.quote = quoteResult.value;
    }
    result.news = newsResult.value ?? [];
    result.cache.quote = quoteResult.cacheStatus;
    result.cache.news = newsResult.cacheStatus;

    if (quoteResult.warning) {
      result.warnings.push(`Alpha Vantage quote: ${quoteResult.warning}`);
    }

    if (newsResult.warning) {
      result.warnings.push(`Alpha Vantage news: ${newsResult.warning}`);
    }
  } else {
    result.warnings.push('ALPHA_VANTAGE_API_KEY is not configured');
  }

  if (fredKey) {
    const macroResult = await readThroughCache('macro', CACHE_TTL.macro, async () => {
      const macroResults = await Promise.allSettled(FRED_SERIES.map((series) => fredLatest(fredKey, series)));
      const macro = macroResults
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value);

      macroResults
        .filter((item) => item.status === 'rejected')
        .forEach((item) => {
          throw new Error(`FRED: ${item.reason.message}`);
        });

      return macro;
    });

    result.macro = macroResult.value ?? [];
    result.cache.macro = macroResult.cacheStatus;

    if (macroResult.warning) {
      result.warnings.push(`FRED: ${macroResult.warning}`);
    }
  } else {
    result.warnings.push('FRED_API_KEY is not configured');
  }

  json(res, result.quote || result.macro.length || result.news.length ? 200 : 503, result);
}

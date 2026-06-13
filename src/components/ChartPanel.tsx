import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type Time,
} from 'lightweight-charts';
import type { Candle, MarketEvent, PriceZone, Timeframe } from '../types';

interface ChartPanelProps {
  candles: Candle[];
  events: MarketEvent[];
  zones: PriceZone[];
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['M5', 'M15', 'H1', 'H4'];

function zoneCenter(zone: PriceZone) {
  return Number(((zone.top + zone.bottom) / 2).toFixed(2));
}

function zoneTitle(zone: PriceZone) {
  if (zone.kind === 'manual') {
    return 'Manual';
  }

  if (zone.id.includes('prev-day-high')) {
    return 'PDH';
  }

  if (zone.id.includes('prev-day-low')) {
    return 'PDL';
  }

  if (zone.id.includes('session-high')) {
    return 'Session H';
  }

  if (zone.id.includes('session-low')) {
    return 'Session L';
  }

  if (zone.id.includes('round')) {
    return 'Round';
  }

  if (/resistance/i.test(zone.label)) {
    return 'Swing R';
  }

  if (/support/i.test(zone.label)) {
    return 'Swing S';
  }

  return 'Auto';
}

export function ChartPanel({ candles, events, zones, timeframe, onTimeframeChange }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartData = useMemo(
    () =>
      candles.map((candle) => ({
        time: Math.floor(new Date(candle.time).getTime() / 1000) as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [candles],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#11151d' },
        textColor: '#aab2c2',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.045)' },
        horzLines: { color: 'rgba(255,255,255,0.055)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: '#d9aa4a', labelBackgroundColor: '#d9aa4a' },
        horzLine: { color: '#d9aa4a', labelBackgroundColor: '#d9aa4a' },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#3bcf8e',
      downColor: '#f06a6a',
      borderUpColor: '#3bcf8e',
      borderDownColor: '#f06a6a',
      wickUpColor: '#8ff0c1',
      wickDownColor: '#ff9b9b',
    });

    series.setData(chartData);
    zones.forEach((zone) => {
      const isManual = zone.kind === 'manual';
      const price = zoneCenter(zone);
      series.createPriceLine({
        price,
        color: isManual ? '#d9aa4a' : 'rgba(148, 163, 184, 0.82)',
        lineWidth: isManual ? 2 : 1,
        lineStyle: isManual ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: zoneTitle(zone),
      });
    });

    createSeriesMarkers(
      series,
      events.map((event) => ({
        time: Math.floor(new Date(event.time).getTime() / 1000) as Time,
        position: event.type === 'headline' ? 'aboveBar' : 'belowBar',
        color: event.type === 'headline' ? '#f0c15c' : '#7ea7ff',
        shape: event.type === 'headline' ? 'arrowDown' : 'circle',
        text: event.type === 'headline' ? 'Headline' : 'News',
      })),
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [chartData, events, zones]);

  return (
    <section className="chart-panel">
      <div className="chart-toolbar">
        <div>
          <span>Support / Resistance Map</span>
          <h2>XAUUSD intraday command chart</h2>
        </div>
        <div className="segmented">
          {timeframes.map((item) => (
            <button
              className={timeframe === item ? 'active' : ''}
              key={item}
              onClick={() => onTimeframeChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="level-toggles">
        <span>Manual Zone</span>
        <span>Nearest S/R</span>
        <span>Key Context</span>
        <span>News Window Open</span>
      </div>
      <div className="chart-canvas" ref={containerRef} />
    </section>
  );
}

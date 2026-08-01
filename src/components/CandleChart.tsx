/**
 * Chart Component
 * Interactive candlestick chart with technical indicators visualization
 */

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";
import { CandleData } from "@/lib/technical-analysis";

export interface ChartProps {
  candles: CandleData[];
  symbol: string;
  height?: number;
  showVolume?: boolean;
  indicators?: {
    sma20?: number[];
    sma50?: number[];
    bollinger?: Array<{ upper: number; middle: number; lower: number }>;
  };
}

export function CandleChart({ candles, symbol, height = 400, showVolume = true, indicators }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1a1a1a" },
        textColor: "#d1d5db",
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Convert candles to chart format
    const chartData = candles.map((candle) => ({
      time: Math.floor(candle.date.getTime() / 1000) as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeries.setData(chartData);

    // Add SMA20 line
    if (indicators?.sma20) {
      const sma20Series = chart.addLineSeries({
        color: "#3b82f6",
        lineWidth: 2,
        title: "SMA20",
      });

      const sma20Data = indicators.sma20
        .map((value, index) => ({
          time: Math.floor(candles[index].date.getTime() / 1000) as any,
          value,
        }))
        .filter((d) => d.value !== null);

      sma20Series.setData(sma20Data);
    }

    // Add SMA50 line
    if (indicators?.sma50) {
      const sma50Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        title: "SMA50",
      });

      const sma50Data = indicators.sma50
        .map((value, index) => ({
          time: Math.floor(candles[index].date.getTime() / 1000) as any,
          value,
        }))
        .filter((d) => d.value !== null);

      sma50Series.setData(sma50Data);
    }

    // Add Bollinger Bands
    if (indicators?.bollinger) {
      const upperBandSeries = chart.addLineSeries({
        color: "#9333ea",
        lineWidth: 1,
        lineStyle: 2, // dashed
      });

      const lowerBandSeries = chart.addLineSeries({
        color: "#9333ea",
        lineWidth: 1,
        lineStyle: 2, // dashed
      });

      const upperData = indicators.bollinger
        .map((value, index) => ({
          time: Math.floor(candles[index].date.getTime() / 1000) as any,
          value: value.upper,
        }))
        .filter((d) => !isNaN(d.value));

      const lowerData = indicators.bollinger
        .map((value, index) => ({
          time: Math.floor(candles[index].date.getTime() / 1000) as any,
          value: value.lower,
        }))
        .filter((d) => !isNaN(d.value));

      upperBandSeries.setData(upperData);
      lowerBandSeries.setData(lowerData);
    }

    // Volume chart
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: "#6b7280",
        priceFormat: {
          type: "volume",
        },
      });

      const volumeData = candles.map((candle, index) => ({
        time: Math.floor(candle.date.getTime() / 1000) as any,
        value: candle.volume,
        color: candle.close >= candle.open ? "#22c55e66" : "#ef444466",
      }));

      volumeSeries.setData(volumeData);

      // Scale volume on secondary axis
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, height, showVolume, indicators]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full border border-border rounded-lg bg-card"
      style={{ height: `${height}px` }}
    />
  );
}

import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/ta/types";

interface Props {
  candles: Candle[];
  predicted?: Candle[];
  actual?: Candle[]; // ex-post overlay (for backtest)
  optimistic?: { time: number; value: number }[]; // upper confidence band
  pessimistic?: { time: number; value: number }[]; // lower confidence band
  overlays?: { name: string; color: string; data: { time: number; value: number | null }[] }[];
  height?: number;
}

export function CandlestickChartView({ candles, predicted, actual, optimistic, pessimistic, overlays, height = 460 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart: any;
    let resizeObs: ResizeObserver | undefined;
    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      chart = lib.createChart(ref.current, {
        height,
        layout: {
          background: { color: "transparent" },
          textColor: "#c9d4e5",
          fontFamily: "ui-sans-serif, system-ui",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
        timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
      });

      const mainSeries = chart.addSeries(lib.CandlestickSeries, {
        upColor: "#22c58e", downColor: "#e5484d",
        borderUpColor: "#22c58e", borderDownColor: "#e5484d",
        wickUpColor: "#22c58e", wickDownColor: "#e5484d",
      });
      mainSeries.setData(candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));

      if (predicted && predicted.length) {
        const predLine = chart.addSeries(lib.LineSeries, {
          color: "#8b78ff", lineWidth: 2, lastValueVisible: false, priceLineVisible: false,
        });
        // Bridge the gap visually by starting the forecast line from today's last close.
        const bridge = candles.length ? [{ time: candles[candles.length - 1].time as any, value: candles[candles.length - 1].close }] : [];
        predLine.setData([...bridge, ...predicted.map((c) => ({ time: c.time as any, value: c.close }))]);
      }

      if (actual && actual.length) {
        const actSeries = chart.addSeries(lib.LineSeries, {
          color: "#f5d90a", lineWidth: 2, lastValueVisible: false, priceLineVisible: false,
        });
        actSeries.setData(actual.map((c) => ({ time: c.time as any, value: c.close })));
      }

      const anchor = candles.length ? { time: candles[candles.length - 1].time as any, value: candles[candles.length - 1].close } : null;

      if (optimistic && optimistic.length) {
        const optSeries = chart.addSeries(lib.LineSeries, {
          color: "rgba(139,120,255,0.55)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false,
        });
        optSeries.setData([...(anchor ? [anchor] : []), ...optimistic.map((d) => ({ time: d.time as any, value: d.value }))]);
      }
      if (pessimistic && pessimistic.length) {
        const pesSeries = chart.addSeries(lib.LineSeries, {
          color: "rgba(139,120,255,0.55)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false,
        });
        pesSeries.setData([...(anchor ? [anchor] : []), ...pessimistic.map((d) => ({ time: d.time as any, value: d.value }))]);
      }

      if (overlays) {
        for (const ov of overlays) {
          const ser = chart.addSeries(lib.LineSeries, { color: ov.color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          ser.setData(ov.data.filter((d) => d.value != null).map((d) => ({ time: d.time as any, value: d.value as number })));
        }
      }

      chart.timeScale().fitContent();

      resizeObs = new ResizeObserver((entries) => {
        for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
      });
      resizeObs.observe(ref.current);
    })();
    return () => {
      disposed = true;
      resizeObs?.disconnect();
      chart?.remove?.();
    };
  }, [candles, predicted, actual, optimistic, pessimistic, overlays, height]);

  return <div ref={ref} className="w-full rounded-lg border border-border bg-card/40" style={{ height }} />;
}

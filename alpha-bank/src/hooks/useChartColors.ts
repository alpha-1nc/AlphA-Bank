"use client";

import { useEffect, useState } from "react";

function getChartColor(varName: string): string {
  if (typeof document === "undefined") return "#3b82f6";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return v || "#3b82f6";
}

export function useChartColors() {
  const [colors, setColors] = useState({
    income: "#3b82f6",
    expense: "#f87171",
    saving: "#34d399",
    bar: ["#3b82f6", "#60a5fa", "#93c5fd", "#6366f1", "#a5b4fc", "#94a3b8", "#cbd5e1"],
  });

  useEffect(() => {
    const update = () =>
      setColors({
        income: getChartColor("--chart-income"),
        expense: getChartColor("--chart-expense"),
        saving: getChartColor("--chart-saving"),
        bar: [
          getChartColor("--chart-blue-1"),
          getChartColor("--chart-blue-2"),
          getChartColor("--chart-blue-3"),
          getChartColor("--chart-indigo-1"),
          getChartColor("--chart-indigo-2"),
          getChartColor("--chart-slate-1"),
          getChartColor("--chart-slate-2"),
        ],
      });
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  return colors;
}

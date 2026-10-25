import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { CATEGORIES, CATEGORY_COLORS } from "../categories.js";
import { formatMonth, formatYen } from "../utils.js";

// Chart.jsで使う部品を登録する
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// 文字色を画面のテーマ（ライト／ダーク）に合わせる
ChartJS.defaults.color = getComputedStyle(document.documentElement)
  .getPropertyValue("--text-muted")
  .trim();

// カテゴリ別の円グラフ
export function CategoryPieChart({ totals }) {
  const categories = CATEGORIES.filter((c) => totals[c] > 0);
  if (categories.length === 0) {
    return <p className="empty">表示するデータがありません。</p>;
  }

  const data = {
    labels: categories,
    datasets: [
      {
        data: categories.map((c) => totals[c]),
        backgroundColor: categories.map((c) => CATEGORY_COLORS[c]),
        borderWidth: 1,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.label}：${formatYen(ctx.parsed)}` },
      },
    },
  };
  return (
    <div className="chart-box">
      <Pie data={data} options={options} />
    </div>
  );
}

// 月別の棒グラフ（カテゴリごとの積み上げ）
export function MonthlyBarChart({ monthly }) {
  const months = Object.keys(monthly).sort();
  if (months.length === 0) {
    return <p className="empty">表示するデータがありません。</p>;
  }

  const data = {
    labels: months.map(formatMonth),
    datasets: CATEGORIES.filter((c) => months.some((m) => monthly[m][c] > 0)).map((c) => ({
      label: c,
      data: months.map((m) => monthly[m][c] || 0),
      backgroundColor: CATEGORY_COLORS[c],
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { callback: (value) => formatYen(value) } },
    },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.dataset.label}：${formatYen(ctx.parsed.y)}` },
      },
    },
  };
  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  );
}

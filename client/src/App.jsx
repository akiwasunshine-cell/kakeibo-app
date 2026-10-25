import { useEffect, useMemo, useState } from "react";
import ReceiptUploader from "./components/ReceiptUploader.jsx";
import ReceiptList from "./components/ReceiptList.jsx";
import { CategoryPieChart, MonthlyBarChart } from "./components/Charts.jsx";
import { CATEGORIES, CATEGORY_COLORS } from "./categories.js";
import { loadReceipts, saveReceipts } from "./storage.js";
import { formatMonth, formatYen, toMonth } from "./utils.js";

export default function App() {
  // 初回表示時にローカルストレージから読み込む
  const [receipts, setReceipts] = useState(loadReceipts);
  // 集計対象の月（"all" は全期間）
  const [selectedMonth, setSelectedMonth] = useState("all");

  // データが変わるたびにローカルストレージへ保存する
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  function addReceipt(receipt) {
    setReceipts((prev) => [...prev, receipt]);
    setSelectedMonth("all");
  }

  function deleteReceipt(id) {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }

  function changeCategory(receiptId, itemIndex, category) {
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? { ...r, items: r.items.map((item, i) => (i === itemIndex ? { ...item, category } : item)) }
          : r,
      ),
    );
  }

  // データのある月の一覧（新しい順）
  const months = useMemo(
    () => [...new Set(receipts.map((r) => toMonth(r.date)))].sort().reverse(),
    [receipts],
  );

  // 選択中の月のレシート
  const filtered = useMemo(
    () =>
      selectedMonth === "all"
        ? receipts
        : receipts.filter((r) => toMonth(r.date) === selectedMonth),
    [receipts, selectedMonth],
  );

  // カテゴリ別の合計
  const categoryTotals = useMemo(() => {
    const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const receipt of filtered) {
      for (const item of receipt.items) {
        totals[item.category] = (totals[item.category] || 0) + item.price;
      }
    }
    return totals;
  }, [filtered]);

  // 月別・カテゴリ別の合計（棒グラフ用。月の絞り込みに関係なく全期間）
  const monthlyTotals = useMemo(() => {
    const result = {};
    for (const receipt of receipts) {
      const month = toMonth(receipt.date);
      result[month] ??= {};
      for (const item of receipt.items) {
        result[month][item.category] = (result[month][item.category] || 0) + item.price;
      }
    }
    return result;
  }, [receipts]);

  const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="app">
      <header>
        <h1>🧾 レシート家計簿</h1>
      </header>

      <ReceiptUploader onSave={addReceipt} />

      <section className="card">
        <div className="summary-header">
          <h2>集計</h2>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="all">全期間</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>

        <p className="grand-total">
          支出合計 <strong>{formatYen(grandTotal)}</strong>
        </p>

        <div className="summary-grid">
          <div>
            <h3>カテゴリ別</h3>
            <CategoryPieChart totals={categoryTotals} />
            <table className="category-table">
              <tbody>
                {CATEGORIES.filter((c) => categoryTotals[c] !== 0).map((c) => (
                  <tr key={c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_COLORS[c] }} />
                      {c}
                    </td>
                    <td className="item-price">{formatYen(categoryTotals[c])}</td>
                    <td className="percent">
                      {grandTotal > 0 ? `${Math.round((categoryTotals[c] / grandTotal) * 100)}%` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>月別</h3>
            <MonthlyBarChart monthly={monthlyTotals} />
          </div>
        </div>
      </section>

      <ReceiptList
        receipts={filtered}
        onChangeCategory={changeCategory}
        onDelete={deleteReceipt}
      />
    </div>
  );
}

import { CATEGORIES } from "../categories.js";
import { formatYen } from "../utils.js";

// 登録済みレシートの商品一覧（日付の新しい順）
export default function ReceiptList({ receipts, onChangeCategory, onDelete }) {
  if (receipts.length === 0) {
    return (
      <section className="card">
        <h2>明細一覧</h2>
        <p className="empty">まだデータがありません。レシートを読み込んでください。</p>
      </section>
    );
  }

  const sorted = [...receipts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <section className="card">
      <h2>明細一覧</h2>
      {sorted.map((receipt) => {
        const total = receipt.items.reduce((sum, item) => sum + item.price, 0);
        return (
          <div className="receipt" key={receipt.id}>
            <div className="receipt-header">
              <span className="receipt-date">{receipt.date}</span>
              <span className="receipt-store">{receipt.store || "（店名なし）"}</span>
              <span className="receipt-total">{formatYen(total)}</span>
              <button
                className="icon"
                onClick={() => {
                  if (confirm("このレシートを削除しますか？")) onDelete(receipt.id);
                }}
                aria-label="レシートを削除"
              >
                🗑
              </button>
            </div>
            <table className="item-table">
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={index}>
                    <td className="item-name">{item.name}</td>
                    <td>
                      <select
                        value={item.category}
                        onChange={(e) => onChangeCategory(receipt.id, index, e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="item-price">{formatYen(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

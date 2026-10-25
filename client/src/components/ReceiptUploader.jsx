import { useEffect, useState } from "react";
import { CATEGORIES } from "../categories.js";
import { formatYen, resizeImage, todayString } from "../utils.js";
import { receiptTotal, validateReceipt } from "../validation.js";

// レシート画像のアップロード → 読み取り → 内容確認 → 登録 を行うコンポーネント
export default function ReceiptUploader({ receipts, onSave }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 読み取り結果（登録前に修正できるよう編集用に保持する）
  const [draft, setDraft] = useState(null);

  // プレビュー用URLは不要になったら解放する
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDraft(null);
    setError("");
    analyze(selected);
  }

  // サーバーに画像を送ってClaudeで読み取る
  async function analyze(target) {
    setLoading(true);
    setError("");
    try {
      const image = await resizeImage(target);
      const formData = new FormData();
      formData.append("image", image, "receipt.jpg");

      const res = await fetch("/api/receipts/analyze", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `読み取りに失敗しました（${res.status}）`);
      }
      setDraft({
        store: data.store,
        // 日付が読み取れなかった場合は今日の日付にする
        date: /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : todayString(),
        items: data.items,
        total: data.total,
      });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "サーバーに接続できませんでした。サーバーが起動しているか確認してください。"
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index, field, value) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function removeItem(index) {
    setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  function addItem() {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", price: 0, category: "その他" }],
    }));
  }

  function reset() {
    setFile(null);
    setPreviewUrl("");
    setDraft(null);
    setError("");
  }

  function handleSave() {
    // 重複の可能性がある場合は、登録してよいか確認する
    if (
      warnings.some((w) => w.type === "duplicate") &&
      !confirm("同じ日付・合計金額のレシートが既にあります。このまま登録しますか？")
    ) {
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      store: draft.store.trim(),
      date: draft.date,
      items: draft.items
        .filter((item) => item.name.trim() !== "")
        .map((item) => ({ ...item, name: item.name.trim(), price: Number(item.price) || 0 })),
      createdAt: new Date().toISOString(),
    });
    reset();
  }

  const itemsTotal = draft ? receiptTotal(draft.items) : 0;
  // 入力内容が変わるたびに検証し直す
  const warnings = draft ? validateReceipt(draft, receipts) : [];

  return (
    <section className="card">
      <h2>レシートを読み込む</h2>

      <label className={`drop-zone ${loading ? "disabled" : ""}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={loading}
        />
        <span>📷 レシート画像を選択（JPEG・PNG・WebP）</span>
      </label>

      {previewUrl && (
        <div className="upload-body">
          <img className="preview" src={previewUrl} alt="レシートのプレビュー" />

          <div className="upload-result">
            {loading && <p className="status">🔍 Claudeが読み取り中です…</p>}

            {error && (
              <div className="error">
                <p>{error}</p>
                <div className="actions">
                  <button onClick={() => analyze(file)}>もう一度読み取る</button>
                  <button className="secondary" onClick={reset}>
                    やめる
                  </button>
                </div>
              </div>
            )}

            {draft && (
              <>
                <p className="hint">読み取り結果を確認し、必要なら修正してから登録してください。</p>
                <div className="field-row">
                  <label>
                    日付
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />
                  </label>
                  <label>
                    店名
                    <input
                      type="text"
                      value={draft.store}
                      onChange={(e) => setDraft({ ...draft, store: e.target.value })}
                    />
                  </label>
                </div>

                <table className="edit-table">
                  <thead>
                    <tr>
                      <th>商品名</th>
                      <th>金額</th>
                      <th>カテゴリ</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={`price-input ${Number(item.price) < 0 ? "negative" : ""}`}
                            value={item.price}
                            onChange={(e) => updateItem(index, "price", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(index, "category", e.target.value)}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="icon"
                            onClick={() => removeItem(index)}
                            aria-label="この行を削除"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="secondary small" onClick={addItem}>
                  ＋ 行を追加
                </button>

                <p className="total-line">
                  商品の合計：<strong>{formatYen(itemsTotal)}</strong>
                  {draft.total > 0 && draft.total !== itemsTotal && (
                    <span className="warn">
                      （レシートの合計 {formatYen(draft.total)} と一致しません）
                    </span>
                  )}
                </p>

                {warnings.length > 0 && (
                  <ul className="warnings">
                    {warnings.map((w) => (
                      <li key={w.type}>⚠ {w.message}</li>
                    ))}
                  </ul>
                )}

                <div className="actions">
                  <button onClick={handleSave} disabled={draft.items.length === 0}>
                    登録する
                  </button>
                  <button className="secondary" onClick={reset}>
                    破棄
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

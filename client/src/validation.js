import { formatYen } from "./utils.js";

// レシートの合計金額（商品の金額の合計）
export function receiptTotal(items) {
  return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
}

// 登録前のレシートを検証し、警告メッセージの一覧を返す
// 警告は登録を禁止するものではなく、ユーザーに確認を促すためのもの
export function validateReceipt(draft, existingReceipts) {
  const warnings = [];

  // 金額が負の値の商品
  const negativeItems = draft.items.filter((item) => (Number(item.price) || 0) < 0);
  if (negativeItems.length > 0) {
    const names = negativeItems.map((item) => item.name || "（商品名なし）").join("、");
    warnings.push({
      type: "negative",
      message: `金額がマイナスの商品があります：${names}（値引き・割引の行であれば問題ありません）`,
    });
  }

  // 同じ日付・同じ合計金額のレシートが既に登録されている
  const total = receiptTotal(draft.items);
  const duplicate = existingReceipts.find(
    (r) => r.date === draft.date && receiptTotal(r.items) === total,
  );
  if (duplicate) {
    warnings.push({
      type: "duplicate",
      message: `同じ日付（${draft.date}）・同じ合計金額（${formatYen(total)}）のレシート「${
        duplicate.store || "店名なし"
      }」が既に登録されています。二重登録ではないか確認してください。`,
    });
  }

  return warnings;
}

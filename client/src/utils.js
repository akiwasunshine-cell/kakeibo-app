// 金額を「¥1,234」形式で表示する
export function formatYen(value) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

// 今日の日付を YYYY-MM-DD（日本時間）で返す
export function todayString() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// YYYY-MM-DD から YYYY-MM を取り出す
export function toMonth(date) {
  return date.slice(0, 7);
}

// YYYY-MM を「2026年10月」形式で表示する
export function formatMonth(month) {
  const [year, m] = month.split("-");
  return `${year}年${Number(m)}月`;
}

// 送信前に画像を縮小してJPEGに変換する
// （スマホで撮った大きな写真でもアップロードできるように、長辺を最大1568pxにする）
export async function resizeImage(file, maxSize = 1568) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました"))),
      "image/jpeg",
      0.9,
    );
  });
}

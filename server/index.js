// レシート読み込み家計簿アプリのバックエンド
// ブラウザからAPIキーを直接使わないよう、Claude APIの呼び出しはすべてこのサーバー経由で行う
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const PORT = Number(process.env.PORT) || 3001;
// 使用モデル：Claude Haiku の最新版
const MODEL = "claude-haiku-5-5";

// 分類に使うカテゴリ（クライアント側の client/src/categories.js と揃えること）
const CATEGORIES = [
  "食費",
  "外食",
  "日用品",
  "衣服",
  "交通費",
  "医療・健康",
  "趣味・娯楽",
  "その他",
];

// Claude APIが受け付ける画像形式
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Claudeに返してもらうJSONの形（構造化出力で、この形に沿った応答を受け取る）
const ReceiptSchema = z.object({
  is_receipt: z.boolean().describe("画像がレシートとして読み取れたかどうか"),
  store: z.string().describe("店名。読み取れない場合は空文字"),
  date: z.string().describe("購入日（YYYY-MM-DD形式）。読み取れない場合は空文字"),
  items: z.array(
    z.object({
      name: z.string().describe("商品名"),
      price: z.number().int().describe("その行の金額（税込・円・整数）。値引きはマイナス"),
      category: z.enum(CATEGORIES).describe("商品のカテゴリ"),
    }),
  ),
  total: z.number().int().describe("レシートの合計金額（税込・円・整数）。読み取れない場合は0"),
});

const SYSTEM_PROMPT = `あなたは日本のレシートを読み取る家計簿アシスタントです。
画像のレシートから店名・購入日・商品ごとの名前と金額・合計金額を読み取ってください。

- 金額は税込の円（整数）で記録してください。外税表記のレシートで商品ごとの税込額が分からない場合は、
  表示されている商品の金額をそのまま使い、消費税は「消費税」という1行の商品として追加してください。
- 値引き・割引の行は金額をマイナスにして、対象商品と同じカテゴリにしてください。
- 小計・合計・お預かり・お釣り・ポイントの行は商品に含めないでください。
- 購入日は YYYY-MM-DD 形式にしてください。和暦（令和など）は西暦に直してください。
- カテゴリは次から選んでください：${CATEGORIES.join("、")}
  - 飲食店・カフェ・ファストフードでの飲食は「外食」、スーパーやコンビニで買った食品・飲料は「食費」です。
  - 洗剤・ティッシュ・文房具などの消耗品は「日用品」です。
- 画像がレシートでない、または読み取れない場合は is_receipt を false にし、items は空にしてください。`;

const client = new Anthropic();

const app = express();
// アップロードされた画像はディスクに保存せず、メモリ上で扱う
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// レシート画像を受け取り、Claudeで読み取った結果を返す
app.post("/api/receipts/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "画像ファイルが送信されていません。" });
  }
  if (!SUPPORTED_TYPES.includes(req.file.mimetype)) {
    return res
      .status(400)
      .json({ error: "対応していない画像形式です（JPEG・PNG・WebP・GIFに対応）。" });
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: req.file.mimetype,
                data: req.file.buffer.toString("base64"),
              },
            },
            { type: "text", text: "このレシートを読み取ってください。" },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ReceiptSchema) },
    });

    // 安全上の理由で応答が拒否された場合
    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "この画像は読み取れませんでした。" });
    }
    // 出力が上限で途中終了した場合
    if (response.stop_reason === "max_tokens") {
      return res
        .status(422)
        .json({ error: "レシートの内容が多すぎて読み取りきれませんでした。" });
    }

    const receipt = response.parsed_output;
    if (!receipt) {
      return res.status(502).json({ error: "読み取り結果の解析に失敗しました。" });
    }
    if (!receipt.is_receipt || receipt.items.length === 0) {
      return res
        .status(422)
        .json({ error: "レシートとして読み取れませんでした。別の画像でお試しください。" });
    }

    res.json(receipt);
  } catch (error) {
    // エラーの種類ごとに分かりやすいメッセージを返す（具体的なものから順に判定）
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("APIキーが無効です:", error.message);
      return res
        .status(500)
        .json({ error: "サーバーのAPIキー設定が正しくありません。.envを確認してください。" });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res
        .status(429)
        .json({ error: "リクエストが集中しています。少し待ってから再度お試しください。" });
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("リクエストエラー:", error.message);
      return res.status(400).json({ error: "画像を処理できませんでした。" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude APIエラー ${error.status}:`, error.message);
      return res.status(502).json({ error: "Claude APIでエラーが発生しました。" });
    }
    console.error("予期しないエラー:", error);
    res.status(500).json({ error: "サーバーでエラーが発生しました。" });
  }
});

// ファイルサイズ超過などアップロード時のエラー
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "画像ファイルが大きすぎます（10MBまで）。" });
  }
  next(err);
});

// 本番用：ビルド済みのクライアント（client/dist）を配信する
const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "../client/dist");
app.use(express.static(distDir));

app.listen(PORT, () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("警告: ANTHROPIC_API_KEY が設定されていません。.env を確認してください。");
  }
  console.log(`サーバー起動: http://localhost:${PORT}`);
});

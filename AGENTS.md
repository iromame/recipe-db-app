# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

# Project: Family Recipe Database (10-Year Vision)

## 1. 最終到達点 (Final Goal)

* 夫婦で共有し、10年以上メンテナンスフリーで運用できる堅牢なレシピ管理システム。
* 運用コストをゼロ（Cloudflare Free Tier）に完全に抑える。
* キッチンでの利便性を追求（PWA, Screen Wake Lock, 片手操作UX）。

## 2. 技術スタック (Tech Stack)

* **Runtime**: Cloudflare Workers (Hono) 


* **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
* **Frontend**: React (Vite) + Tailwind CSS + shadcn/ui
* **Security**: Cloudflare Zero Trust (Access) によるメール制限
* **Standard**: Schema.org (Recipe) 準拠のデータ構造 



## 3. 設計原則 (Engineering Principles)

* **Type Safety**: BackendからFrontendまで一貫したTypeScriptの型定義を維持する。
* **Machine Readability**: 世界標準である Schema.org の Recipe ボキャブラリに準拠したデータ構造を厳格に維持する。
* `prepTime` / `cookTime`: **ISO 8601** 形式（例：`PT20M`）で保存。
* `suitableForKids`: 「子供向け」フラグ（2歳半などの年齢区分も含む） 。




* **Data Portability**: 10年後もデータを活用できるよう、全データを一括でJSON書き出しするエンドポイントを必須とする。

## 4. 分類設計 (Classification Architecture)

### A. 調理モード (主軸 / Primary Axis)

レシピの利用シーンを決定する最上位の排他的分類（Enum的管理）。

* **作り置き (MAKE_AHEAD):** 土日などの「仕込調理」フェーズで活用。
* **お昼ごはん (LUNCH):** 平日や休日にその場でパパッと作る都度調理。
* **晩ごはん (DINNER):** 数品のおかずを構成する、しっかりとした都度調理。
* **UI要件:** 登録画面最上部に、親指でタップしやすい大きな「セグメントコントロール」を配置する。

### B. タグ (小分類 / Secondary Axis)

レシピの性質を多次元的に肉付けし、柔軟な検索を可能にするメタデータ。

* **目的:** 「鶏肉」かつ「レンジ」かつ「子供向け」といった高度なAND検索を実現するため。
* **管理形式:** `tags` テーブルと `recipe_tags` 中間テーブルによる「多対多（Many-to-Many）」のリレーションシップを構築する。
* **自動クレンジング:** 保存時にタグ名のトリミングと小文字化を自動で行い、表記揺れを排除する。

## 5. モバイル特化UI/UX 要件

* **Thumb Zone 設計:** 重要なボタンや入力エリアは画面の下半分に配置し、大画面スマホでも片手（親指）で操作を完結できるレイアウトにする。
* **調理時間ピッカー:** 直接数値を打たせず、上下スワイプの「ドラムロール式ピッカー」と、「15分」「30分」といった頻出時間の「クイック選択チップ」を併用する。
* **Creatable Multi-Select:** タグ入力には `shadcn/ui` の Combobox 等を活用し、既存タグの検索と「その場での新規タグ作成」をシームレスに行えるようにする。
* **スリープ防止:** レシピ閲覧画面では `Screen Wake Lock API` を利用し、調理中に画面が消えるのを防止する。

## 6. 開発フェーズ (Phases)

1. **MVP:** `AGENTS.md` の多対多リレーションと ISO 8601 準拠を確認し、Drizzle スキーマを作成。Hono で CRUD API を実装。
2. **UI実装:** スマホでの「片手操作」を重視し、ドラムロール式ピッカーと Creatable なタグ入力フォームを実装。
3. **PWA & UX:** PWA化（`vite-plugin-pwa`）と `Screen Wake Lock` の組み込み。
4. **AI拡張:** 写真からのレシピ自動抽出 (OCR + Gemini API)。

---

なお、WSL環境でAntigravityを使用する場合、Windows側のブラウザと正しく通信するために `.wslconfig` で `networkingMode=mirrored` を設定することが推奨されています。デプロイに関しては、Cloudflareの無料枠内で5GBのストレージと1日500万回の読み取りが可能であるため、個人のレシピDBとしては十分すぎる容量が確保できます。
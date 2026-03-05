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

## 最終到達点 (Final Goal)
- 夫婦で共有し、10年以上メンテナンスフリーで運用できる堅牢なレシピ管理システム。
- 運用コストをゼロ（Cloudflare Free Tier）に抑える。
- キッチンでの利便性を追求（PWA, Screen Wake Lock）。

## 技術スタック (Tech Stack)
- **Runtime**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Frontend**: React (Vite) + Tailwind CSS
- **Security**: Cloudflare Zero Trust (Access)
- **Standard**: Schema.org (Recipe) 準拠のデータ構造

## 設計原則 (Engineering Principles)
- **Type Safety**: BackendからFrontendまで一貫したTypeScriptの型定義を維持する。
- **Machine Readability (Schema.org & RecipeMD)**:
  - レシピデータは機械可読性の高いフォーマットで管理し、将来的なAI連携やシステム移行に備える。
  - 世界標準である Schema.org の Recipe ボキャブラリに準拠したデータ構造を厳格に維持する。
    - `name`: 料理名
    - `recipeCategory`: ジャンル（和食、イタリアン、デザート等）
    - `prepTime` / `cookTime`: ISO 8601形式での時間管理（例：PT20M）
    - `recipeIngredient`: 材料の配列
    - `recipeInstructions`: 工程ごとのステップ（HowToStep）
    - `suitableForKids`: 「子供向け」フラグ（2歳半などの年齢区分も含む）
  - データ保存形式として、完全な正規化（RDB的アプローチ）に固執せず、RecipeMDのようなMarkdown＋YAMLフロントマター形式やJSONベースの構造化フォーマットを積極的に採用し、パースの容易さを担保する。
- **Zero-Cost**: 追加の有料SaaSを使わず、Cloudflareのエコシステム内で完結させる。

## 今後のフェーズ
1. MVP: レシピの基本操作とSchema.org準拠データの保存・読み込み機能
2. PWA化とキッチン向けUI最適化
3. AIによる写真からのレシピ自動抽出 (OCR + Gemini API)
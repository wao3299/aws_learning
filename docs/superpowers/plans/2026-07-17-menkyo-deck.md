# 仮免学科試験デック追加 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本の仮免学科試験（第一段階）対策デック（約100問・試験モード付き）を study-deck に追加する。

**Architecture:** 既存のデック構成（`src/pages/<code>.astro` が deck 設定を `Quiz.astro` に渡し、エンジン `quiz.js` が `public/questions-<code>.json` を fetch）にそのまま乗る。エンジンには「選択肢固定順フラグ `f`」のみ追加し、○×問題の表示順を固定する。

**Tech Stack:** Astro（静的ビルド）、Vanilla JS（quiz.js）、Bun（validate 実行）。テストフレームワークはなし。検証は `bun run validate` と dev サーバでの手動確認。

## Global Constraints

- デックの上位まとまりは **deck** と呼ぶ。`cert` / 「資格」を変数名・prop・CSS クラス・UI 文言に使わない（CLAUDE.md）
- 問題の必須フィールド: `d`, `t`, `q`, `o`, `oe`, `e`, `a`（`o.length === oe.length`、`a` は範囲内整数）
- `d|t` はファイル内で一意（localStorage 統計キー）
- 問題文・解説内の HTML は属性なしの `strong|code|em|b|i|u|mark|small|kbd|var|sub|sup|br` のみ許可（validate.js が検査）
- `deck.data` は `${import.meta.env.BASE_URL}` 前置きの絶対パス
- 問題は**オリジナル作成**。実在の試験問題・教本の転載はしない
- ○×問題は `o: ["正しい", "誤り"]`（この順）＋ `f: true`。正解が「正しい」なら `a: 0`、「誤り」なら `a: 1`
- コミットは細かく行う。コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

### 問題作成の内容ガイドライン（全問題作成タスク共通）

- 出題スタイル: 本番同様の引っかけ（「〜してもよい」「必ず〜しなければならない」等の断定表現）を適度に含める
- `oe` は各選択肢について「なぜ正しい/誤りか」を1〜2文で。○×問題では「正しい」「誤り」それぞれの側の根拠を書く
- `e` は総括解説。法定数値やキーワードは `<strong>` や `<code>` で強調してよい
- 数値・ルールは2026年時点の道路交通法に基づく（例: 一般道の法定最高速度 60km/h、原付 30km/h、追越し禁止場所、駐停車禁止場所、酒気帯びの基準等）
- 4択は「標識の意味の識別」「優先順位の判断」「法定数値の選択」「禁止場所の組合せ」などに使う

---

### Task 1: quiz.js に選択肢固定順フラグ `f` を追加

**Files:**
- Modify: `src/scripts/quiz.js:218-226`

**Interfaces:**
- Consumes: なし
- Produces: 問題オブジェクトの任意フィールド `f: true` — `shuffledQuestion(q)` が `q.f` truthy のとき選択肢順を変えずに返す。以降の全問題作成タスクが依存。

- [ ] **Step 1: `shuffledQuestion` に固定順の早期 return を追加**

現状の `src/scripts/quiz.js:218-226`:

```js
function shuffledQuestion(q){
  const order = shuffle(q.o.map((_,i)=>i));
  const o = order.map(i=>q.o[i]);
  const oe = q.oe ? order.map(i=>q.oe[i]) : q.oe;
  let a;
  if (Array.isArray(q.a)) a = q.a.map(x=>order.indexOf(x)).sort((m,n)=>m-n);
  else a = order.indexOf(q.a);
  return Object.assign({}, q, {o, oe, a});
}
```

先頭に1行追加する:

```js
function shuffledQuestion(q){
  if (q.f) return q; // ○×など選択肢の順序に意味がある問題はシャッフルしない
  const order = shuffle(q.o.map((_,i)=>i));
  const o = order.map(i=>q.o[i]);
  const oe = q.oe ? order.map(i=>q.oe[i]) : q.oe;
  let a;
  if (Array.isArray(q.a)) a = q.a.map(x=>order.indexOf(x)).sort((m,n)=>m-n);
  else a = order.indexOf(q.a);
  return Object.assign({}, q, {o, oe, a});
}
```

- [ ] **Step 2: 既存デックに影響がないことを確認**

Run: `bun run validate`
Expected: 既存4ファイルすべて `OK`（`f` 未使用なので挙動不変）

- [ ] **Step 3: Commit**

```bash
git add src/scripts/quiz.js
git commit -m "quiz.js に選択肢固定順フラグ f を追加"
```

---

### Task 2: validate.js に `f` フィールド検証を追加

**Files:**
- Modify: `scripts/validate.js:55` 付近（`if (Array.isArray(x.a)) {...}` ブロックの直後）

**Interfaces:**
- Consumes: なし
- Produces: 問題データの `f` は boolean のみ許容（それ以外はエラー）

- [ ] **Step 1: `f` の型検証を追加**

`scripts/validate.js` の以下のブロックの直後（現状 55 行目の `}` の後）に追加:

```js
    if (Array.isArray(x.a)) {
      if (new Set(x.a).size !== x.a.length) errors.push(`${at}: 正解インデックスが重複`);
      if (x.a.length < 2) errors.push(`${at}: 複数選択なのに正解が ${x.a.length} 件`);
    }
    if (x.f !== undefined && typeof x.f !== "boolean") {
      errors.push(`${at}: f は boolean である必要がある`);
    }
```

- [ ] **Step 2: 検証が通ることを確認**

Run: `bun run validate`
Expected: 既存4ファイルすべて `OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.js
git commit -m "validate.js に選択肢固定順フラグ f の検証を追加"
```

---

### Task 3: questions-menkyo.json 作成（分野1: 信号・警察官の手信号、10問）＋ FILES 登録

**Files:**
- Create: `public/questions-menkyo.json`
- Modify: `scripts/validate.js:8-13`（`FILES` 配列）

**Interfaces:**
- Consumes: Task 1 の `f` フラグ、Task 2 の `f` 検証
- Produces: `public/questions-menkyo.json`（JSON 配列）。以降のタスクはこの配列の末尾に問題を追記する。

- [ ] **Step 1: 分野1の問題10問で JSON を新規作成**

`d` は全問 `"信号・手信号"`。○×8問＋4択2問。カバーする論点:

1. 青色の灯火の意味（進むことが「できる」のであって「進まなければならない」ではない）— ○×
2. 黄色の灯火（原則停止。停止位置に近く安全に停止できない場合のみ進行可）— ○×
3. 赤色の灯火と左折可の標示板 — ○×
4. 青色の矢印信号（右折矢印で転回の可否）— ○×
5. 黄色の矢印信号（路面電車専用であること）— ○×
6. 点滅信号（赤の点滅＝一時停止、黄の点滅＝他の交通に注意して進行）— 4択
7. 警察官の手信号・灯火信号（身体の正面に平行する交通＝青）— ○×
8. 警察官の手信号が信号機と異なる場合（手信号が優先）— ○×
9. 停止線がない場合の停止位置（交差点の直前）— ○×
10. 信号機の信号の種類と意味の組合せ — 4択

○×問題のフォーマット例（1問目をこの内容で作る）:

```json
{
  "d": "信号・手信号",
  "t": "青色の灯火の意味",
  "q": "信号が青色の灯火のときは、車はどんな場合でも直ちに発進しなければならない。",
  "o": ["正しい", "誤り"],
  "a": 1,
  "f": true,
  "oe": [
   "青は「進め」の命令ではない。前方の交通状況が安全でなければ進んではならない。",
   "青色の灯火は「進むことができる」の意味。安全が確認できない場合まで発進を強制するものではない。"
  ],
  "e": "青色の灯火は<strong>進むことができる</strong>という意味であり、「進まなければならない」ではない。前方が渋滞していて交差点内で止まるおそれがある場合などは進んではいけない。"
 }
```

4択問題のフォーマット例（6問目をこの内容で作る）:

```json
{
  "d": "信号・手信号",
  "t": "点滅信号の意味",
  "q": "赤色の灯火の点滅信号に対面した車の正しい行動は？",
  "o": [
   "他の交通に注意して進行できる",
   "停止位置で一時停止し、安全を確認してから進行できる",
   "信号が青に変わるまで停止し続けなければならない",
   "徐行して進行できる"
  ],
  "a": 1,
  "oe": [
   "それは黄色の点滅信号の意味。赤の点滅では一時停止が必要。",
   "赤色の点滅は「停止位置で一時停止し、安全確認後に進行できる」。一時停止標識と同様の扱い。",
   "点滅信号は青に変わらない。一時停止して安全確認すれば進行できる。",
   "徐行では足りない。必ず一時停止しなければならない。"
  ],
  "e": "<strong>赤の点滅＝一時停止</strong>、<strong>黄の点滅＝他の交通に注意して進行</strong>。混同を狙う出題が多い。"
 }
```

残り8問も同じフォーマットで、上記論点リストに沿ってオリジナル問題を作成する。`t` は論点を短く表した一意な文字列にする。

- [ ] **Step 2: validate.js の FILES に追加**

```js
const FILES = [
  "public/questions-saa.json",
  "public/questions-dva.json",
  "public/questions-dea.json",
  "public/questions-owasp.json",
  "public/questions-menkyo.json",
];
```

- [ ] **Step 3: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 10 問すべて構造チェックに合格`

- [ ] **Step 4: Commit**

```bash
git add public/questions-menkyo.json scripts/validate.js
git commit -m "仮免学科デックの問題データを追加（信号・手信号 10問）"
```

---

### Task 4: 分野2: 標識・標示（15問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計25問の JSON

- [ ] **Step 1: `d: "標識・標示"` の問題15問（○×9・4択6）を追記**

カバーする論点:

1. 本標識の4種類（規制・指示・警戒・案内）— 4択
2. 「一時停止」標識の形状と意味 — ○×
3. 「車両進入禁止」と「車両通行止め」の違い — 4択
4. 「駐車禁止」と「駐停車禁止」の標識の違い — 4択
5. 規制標識「最高速度」と補助標識の組合せ — ○×
6. 「追越しのための右側部分はみ出し通行禁止」の意味（はみ出さない追越しは可）— ○×
7. 警戒標識の色と意味（黄色・ひし形）— ○×
8. 「歩行者専用」標識と沿道に車庫を持つ車の例外 — ○×
9. 規制標示「停止禁止部分」の意味 — 4択
10. 「立入り禁止部分」と「停止禁止部分」の違い — ○×
11. 中央線が黄色の実線の意味 — ○×
12. 「転回禁止」標識の効力（後退は禁止されない）— ○×
13. 補助標識「この先100m」等の役割 — ○×
14. 「徐行」標識の意味と徐行の定義 — 4択
15. 案内標識の色（一般道は青、高速は緑）— 4択

各問題は Task 3 のフォーマット例と同じ構造（○×: `"o": ["正しい", "誤り"], "f": true`、4択: 選択肢4つで `f` なし）で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 25 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに標識・標示 15問を追加"
```

---

### Task 5: 分野3: 通行区分・歩行者保護（12問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計37問の JSON

- [ ] **Step 1: `d: "通行区分・歩行者保護"` の問題12問（○×10・4択2）を追記**

カバーする論点:

1. 左側通行の原則と右側部分にはみ出せる場合（一方通行、工事等）— ○×
2. 歩道と車道の区別がない道路での通行位置 — ○×
3. 路側帯の通行（車は原則通行不可）— ○×
4. 横断歩道に歩行者がいる/いるかもしれない場合の義務（停止できる速度・一時停止）— ○×
5. 横断歩道の手前で停止している車の側方通過（前に出る前に一時停止）— ○×
6. 停止中の路面電車のそば（安全地帯の有無・乗降客）— 4択
7. 子ども・高齢者・身体障害者のそばの通行（一時停止か徐行）— ○×
8. 通学通園バスのそばの通行（徐行して安全確認）— ○×
9. 泥はね運転の禁止 — ○×
10. 車両通行帯のある道路での通行帯の選び方（最も右側は追越し等のため空ける）— 4択
11. 自転車道・自転車専用通行帯と車の関係 — ○×
12. 緊急自動車への進路譲渡（交差点付近では交差点を避けて左に寄り一時停止）— ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 37 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに通行区分・歩行者保護 12問を追加"
```

---

### Task 6: 分野4: 速度・追越し（12問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計49問の JSON

- [ ] **Step 1: `d: "速度・追越し"` の問題12問（○×9・4択3）を追記**

カバーする論点:

1. 一般道路の法定最高速度（普通車 60km/h）— 4択
2. 原動機付自転車の法定最高速度（30km/h）— ○×
3. 規制速度と法定速度の優先関係 — ○×
4. 最低速度の規制（標識がある場合）— ○×
5. 安全な車間距離（停止距離以上）と空走距離・制動距離の関係 — 4択
6. 追越しと追抜きの違い（進路変更の有無）— ○×
7. 追越しの方法（原則右側から。ただし右折車は左側から）— ○×
8. 追越し禁止場所（曲がり角付近、上り坂の頂上付近、こう配の急な下り坂、トンネル、交差点・踏切とその手前30m以内等）— 4択
9. 「追越し禁止」の場所でも原付は追い越せるか（不可）— ○×
10. 二重追越しの禁止（前車が「自動車」を追い越そうとしているとき）— ○×
11. 追越されるときの義務（速度を上げない）— ○×
12. 雨天・夜間など悪条件下での速度調節 — ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 49 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに速度・追越し 12問を追加"
```

---

### Task 7: 分野5: 交差点・優先関係（12問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計61問の JSON

- [ ] **Step 1: `d: "交差点・優先"` の問題12問（○×9・4択3）を追記**

カバーする論点:

1. 左折の方法（あらかじめ左端に寄り交差点の側端に沿って徐行）— ○×
2. 右折の方法（中央に寄り交差点の中心のすぐ内側を徐行）— ○×
3. 原付の二段階右折（信号機のある片側3車線以上等）— ○×
4. 交差点右折時の直進車・左折車優先 — ○×
5. 優先道路の意味と交差点内まで中央線がある道路 — ○×
6. 幅の広い道路との交差点での優先関係 — ○×
7. 左方優先の原則（幅が同じ道路） — 4択
8. 環状交差点（ラウンドアバウト）の通行方法（右回り・環内優先）— 4択
9. 交差点内で緊急自動車が接近した場合 — ○×
10. 踏切の通過方法（一時停止・窓を開けて音を確認、エンスト防止で変速しない）— ○×
11. 踏切の直前で信号機がある場合（信号に従い一時停止不要）— ○×
12. 交差点に入る際の優先順位の総合判断 — 4択

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 61 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに交差点・優先 12問を追加"
```

---

### Task 8: 分野6: 徐行・一時停止（10問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計71問の JSON

- [ ] **Step 1: `d: "徐行・一時停止"` の問題10問（○×8・4択2）を追記**

カバーする論点:

1. 徐行の定義（直ちに停止できる速度、おおむね10km/h以下）— ○×
2. 徐行すべき場所（左右の見通しがきかない交差点、曲がり角付近、上り坂の頂上付近、こう配の急な下り坂）— 4択
3. 「こう配の急な上り坂」は徐行場所ではない（引っかけ）— ○×
4. 歩行者のそばを通るときの徐行または安全な間隔 — ○×
5. 安全地帯のそばを通るとき（歩行者がいる場合は徐行）— ○×
6. ぬかるみ・水たまりでの徐行（泥はね防止）— ○×
7. 一時停止すべき場所（一時停止標識、赤の点滅信号、踏切）— 4択
8. 一時停止の意味（停止線の直前で完全に停止）— ○×
9. 見通しのきかない交差点でも優先道路を通行中は徐行不要 — ○×
10. 歩行者が横断歩道のない場所を横断しているとき（横断を妨げない）— ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 71 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに徐行・一時停止 10問を追加"
```

---

### Task 9: 分野7: 駐停車（10問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計81問の JSON

- [ ] **Step 1: `d: "駐停車"` の問題10問（○×8・4択2）を追記**

カバーする論点:

1. 駐車と停車の定義の違い（5分以内の荷物の積みおろし・人の乗り降りは停車）— ○×
2. 駐停車禁止場所（交差点とその端から5m以内、横断歩道とその前後5m以内、踏切とその前後10m以内、バス停の標示柱から10m以内等）— 4択
3. 駐車禁止場所（火災報知機から1m以内、駐車場出入口から3m以内、消防用施設から5m以内等）— 4択
4. 坂の頂上付近・こう配の急な坂は駐停車禁止 — ○×
5. トンネル内の駐停車禁止（車両通行帯の有無を問わない）— ○×
6. 駐車の方法（道路の左端に沿う、歩道のある道路では車道の左端）— ○×
7. 無余地駐車の禁止（車の右側に3.5m以上の余地）— ○×
8. 夜間の駐停車（非常点滅表示灯・尾灯等）— ○×
9. 二重駐停車の禁止 — ○×
10. 荷物の積みおろしで運転者がすぐ運転できる状態は駐車か（停車扱いの条件）— ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 81 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに駐停車 10問を追加"
```

---

### Task 10: 分野8: 乗車・積載・免許制度（10問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計91問の JSON

- [ ] **Step 1: `d: "乗車・積載・免許"` の問題10問（○×8・4択2）を追記**

カバーする論点:

1. 座席ベルトの着用義務（運転者・同乗者、後部座席も）— ○×
2. 幼児用補助装置（チャイルドシート）の使用義務 — ○×
3. 乗車定員の数え方（12歳未満の子ども3人＝大人2人）— 4択
4. 積載物の長さ・幅・高さの制限（長さ×1.2倍まで等、2026年時点の規定に基づく）— 4択
5. 仮免許での運転条件（資格者の同乗、仮免許練習標識）— ○×
6. 第一種免許の種類と運転できる車 — ○×
7. 免許証の携帯義務 — ○×
8. 酒気帯び運転の禁止（少量でも不可、同乗・車両提供・酒類提供も罰則）— ○×
9. 過労・病気・薬物の影響下での運転禁止 — ○×
10. 携帯電話の使用等の禁止（走行中の保持・注視）— ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 91 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに乗車・積載・免許 10問を追加"
```

---

### Task 11: 分野9: 安全確認・運転操作（9問）

**Files:**
- Modify: `public/questions-menkyo.json`（配列末尾に追記）

**Interfaces:**
- Consumes: Task 3 の JSON 配列。○×は `"o": ["正しい", "誤り"], "f": true`、4択は `f` なし。必須フィールド `d/t/q/o/oe/e/a`、`d|t` 一意。
- Produces: 累計100問の JSON（完成）

- [ ] **Step 1: `d: "安全確認・運転操作"` の問題9問（○×8・4択1）を追記**

カバーする論点:

1. 発進時の安全確認（ミラー・目視・合図）— ○×
2. 合図の時期（右左折は30m手前、進路変更は3秒前）— 4択
3. 合図の出しっぱなし・戻し忘れの禁止 — ○×
4. ミラーの死角と目視確認の必要性 — ○×
5. 内輪差（左折時の巻き込み）— ○×
6. ブレーキのかけ方（数回に分けて）— ○×
7. 下り坂でのエンジンブレーキ活用 — ○×
8. 警音器の使用制限（指定場所・危険防止のやむを得ない場合のみ）— ○×
9. 運転姿勢・視点（近くだけでなく遠くにも目を配る）— ○×

各問題は Task 3 のフォーマット例と同じ構造で作成する。

- [ ] **Step 2: 検証**

Run: `bun run validate`
Expected: `OK [public/questions-menkyo.json]: 100 問すべて構造チェックに合格`

- [ ] **Step 3: Commit**

```bash
git add public/questions-menkyo.json
git commit -m "仮免学科デックに安全確認・運転操作 9問を追加"
```

---

### Task 12: ページ作成とナビ統合

**Files:**
- Create: `src/pages/menkyo.astro`
- Modify: `src/components/Quiz.astro:19`（デックナビ）
- Modify: `src/pages/index.astro:9-10`（decks 配列）

**Interfaces:**
- Consumes: `public/questions-menkyo.json`（Task 3〜11）
- Produces: `/study-deck/menkyo/` ページ。deck コードは `MENKYO`（localStorage キー `quizStats_MENKYO_v1` / `quizHistory_MENKYO_v1` を規定）

- [ ] **Step 1: `src/pages/menkyo.astro` を作成**

```astro
---
import Base from "../layouts/Base.astro";
import Quiz from "../components/Quiz.astro";
const deck = {
  code: "MENKYO",
  active: "MENKYO",
  eyebrow: "運転免許 · 仮免学科（第一段階）",
  title: "仮免学科試験 対策",
  sub: "100問のプールから出題。練習10問／苦手中心／本番50問モード。",
  data: `${import.meta.env.BASE_URL}questions-menkyo.json`,
  practiceN: 10,
  exam: { enabled: true, n: 50, minutes: 30, passPct: 0.9 },
};
---
<Base title="仮免学科試験 対策クイズ">
  <Quiz deck={deck} />
</Base>
```

- [ ] **Step 2: `Quiz.astro` のデックナビにリンク追加**

`src/components/Quiz.astro` の OWASP 行（現状 19 行目）の直後に追加:

```astro
      <a href={`${base}owasp/`} class={deck.active === "OWASP" ? "active" : undefined}>OWASP</a>
      <a href={`${base}menkyo/`} class={deck.active === "MENKYO" ? "active" : undefined}>免許</a>
```

- [ ] **Step 3: `index.astro` の decks 配列にカード追加**

`src/pages/index.astro` の owasp 行（現状 9 行目）の直後に追加:

```js
  { href: `${base}owasp/`, code: "OWASP", name: "OWASP Top 10", note: "Web Security 2025 · 20問" },
  { href: `${base}menkyo/`, code: "免許", name: "仮免学科試験", note: "第一段階 · 100問" },
];
```

- [ ] **Step 4: ビルド確認**

Run: `bun run build`
Expected: エラーなく `dist/` に出力（`dist/menkyo/index.html` が生成される）

- [ ] **Step 5: Commit**

```bash
git add src/pages/menkyo.astro src/components/Quiz.astro src/pages/index.astro
git commit -m "仮免学科デックのページとナビを追加"
```

---

### Task 13: 動作確認とスクリーンショット

**Files:**
- なし（確認のみ。スクリーンショット画像は PR 作成時にコミット）

**Interfaces:**
- Consumes: Task 1〜12 の成果すべて
- Produces: 動作確認済みのブランチ、PR 用スクリーンショット

- [ ] **Step 1: dev サーバで手動確認**

Run: `bun run dev` を起動し `http://localhost:4321/study-deck/menkyo/` を開く（Playwright を使ってよい）

確認項目:
1. ホーム画面にデックカード「免許」が表示される
2. 練習モードで○×問題の選択肢が常に「正しい」→「誤り」の順（複数問で確認）
3. 4択問題の選択肢はシャッフルされる
4. 「本番50問に挑戦」ボタンが表示され、開始すると50問・タイマー30分で動く
5. 既存デック（例: SAA）が従来どおり動く

- [ ] **Step 2: スクリーンショット撮影**

Playwright でホーム画面（デック一覧）・○×問題の出題画面・解答後の解説画面を撮影し、PR 用に保存する（memory: ブランチに画像をコミットして SHA 固定 raw URL で本文に埋め込む — PR 作成の指示があった時点で実施）。

- [ ] **Step 3: validate 最終確認**

Run: `bun run validate`
Expected: 全5ファイル `OK`、`合計 457 問`

---

## 完了後

- CLAUDE.md のドキュメント運用に従い、この plan ファイルは実行完了後に削除コミットする
- PR 作成はユーザーの指示があるまで行わない（memory: commit-on-new-branch）

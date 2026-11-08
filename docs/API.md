# Vaani app ↔ backend: API guide

This document explains which backend APIs the app calls, why each one exists, where the app uses it, and how responses and errors are handled.

- **Backend:** `https://vaani-api-black.vercel.app/api` (set in [`src/api/config.ts`](../src/api/config.ts))
- **All API code:** [`src/api/client.ts`](../src/api/client.ts). Screens never call `fetch` themselves.
- **State that uses the APIs:** [`src/store/AppStore.tsx`](../src/store/AppStore.tsx)

---

## 1. Basics

### Money is always in paise
Every amount sent or received is a whole number of **paise**: ₹1 = 100, so `6000` = ₹60.00. This avoids rounding errors.
The app only formats paise as ₹ when showing them (`formatINR` in `src/logic/money.ts`).

### Login token
`/auth/login` and `/auth/register` return a `token`. Every other call sends it as a header:

```
Authorization: Bearer <token>
```

The token is valid for 30 days. The app stores it on the phone (AsyncStorage key `vaani.token`), so the shopkeeper stays logged in.

### How a request flows through the app

```
Screen  ──calls──▶  store action (AppStore)  ──calls──▶  api.xxx() (client.ts)  ──fetch──▶  backend
   ▲                       │                                   │
   │                       ◀──── typed data ───────────────────┤  success (2xx)
   └── shows error text ◀──┴──── throws ApiError ──────────────┘  failure
```

1. `request()` in `client.ts` adds the token, sends JSON (or form-data for audio), and stops waiting after **20 s** (**60 s** for voice).
2. **Success:** the JSON body is returned. `toShop`, `toCustomer` and `toTxns` convert server shapes into the app's types (`src/data/types.ts`).
3. **Failure:** it throws an **`ApiError`** with:
   - `kind`: `'network'` (no internet), `'timeout'`, `'aborted'` (screen closed) or `'http'` (the server answered with 4xx/5xx)
   - `status`: the HTTP status (0 when it isn't `http`)
4. The screen turns the error into one sentence **in the user's language** with `errorText(t, error, overrides)` from `src/i18n`. The screen shows it in a red `ErrorBanner` with **Try again** where retrying makes sense.
5. **401 on any call that sent a token** (expired or invalid token) → the store logs out automatically, and the login screen shows "Your session ended. Please log in again."

### Error responses
The backend always answers errors as:

```json
{ "error": "Human readable English message" }
```

The app does **not** show this English text. It picks its own translated message from the status code (table in section 4). The English message only helps with debugging.

### Never saving twice (`txnId`)
Bills and payments carry a `txnId` created on the phone (`clientId()` in `money.ts`). If the network drops after the server saved a bill and the shopkeeper taps **Try again**, the same `txnId` is sent. The server recognises it, returns the existing transaction (HTTP 200 instead of 201), and doesn't add it twice.

---

## 2. Endpoints the app uses

### 2.1 `POST /auth/register`: create a shop account
**Why:** a new shopkeeper signs up. **Where:** Login screen → "Create an account".

Request:
```json
{ "shopName": "Sri Lakshmi Kirana", "shopkeeperName": "Ravi", "mobileNumber": "9876543210", "passcode": "1234", "language": "te" }
```
- `mobileNumber`: 10 digits starting with 6–9. It becomes the login id.
- `passcode`: 4–6 digits. Only a hash is stored on the server.
- `language`: the language picked on the welcome screen (`te`, `hi` or `en`).

Response `201`:
```json
{
  "token": "eyJhbGciOi...",
  "shopkeeper": {
    "id": "6af0...", "shopName": "Sri Lakshmi Kirana", "shopkeeperName": "Ravi",
    "mobileNumber": "9876543210", "language": "te",
    "todaysBill": 0, "weeklyBill": 0, "todaysDues": 0, "duesTotal": 0
  }
}
```
**The app then:** saves the token and shop, opens Home and loads the data (2.3 + 2.5).
**Errors:** `409` → "This mobile number already has an account. Log in instead."

### 2.2 `POST /auth/login`: log in
**Why:** an existing shopkeeper logs in. **Where:** Login screen.

Request: `{ "mobileNumber": "9876543210", "passcode": "1234" }`
Response `200`: same shape as register.
**Errors:**
- `401` → "Wrong mobile number or passcode."
- `429` → "Too many wrong tries. Wait 15 minutes…" (the server locks the account after 5 wrong passcodes)

### 2.3 `GET /shopkeeper/me`: shop profile and today's numbers
**Why:** Home shows today's sales, this week's sales and credit given today. These totals live on the server.
**Where:** after login, on app start, and on pull-to-refresh (Home, Khata, History).

Response `200`: `{ "shopkeeper": { ...same fields as above, "upiId": "ravi@upi" } }`

| Field | Meaning | Shown on |
|---|---|---|
| `todaysBill` | all bills today (cash + UPI + khata) | Home "Today's sales" |
| `weeklyBill` | all bills this week (Mon–Sun, India time) | Home "This week" |
| `todaysDues` | new credit (khata) given today | Home "Credit today" |
| `duesTotal` | what all customers owe right now | Khata "Total due" |

The server resets today's totals at midnight and the weekly total on Monday (India time).

### 2.4 `PATCH /shopkeeper/me`: update the profile or language
**Why:** the shopkeeper edits the shop name, their own name or UPI ID. The language is also kept in sync.
**Where:** Edit profile screen, and Settings → Language (also sent automatically after login if the server's language differs).

Request (any of these fields): `{ "shopName": "...", "shopkeeperName": "...", "upiId": "ravi@upi", "language": "hi" }`
Response `200`: `{ "shopkeeper": { ... } }`

> Voice bills don't depend on this language: the server auto-detects Telugu, Hindi, English or a mix (Gnani `indic-auto` + `codemix`). The shop language is only a fallback hint when nothing was heard. The mobile number can't be changed (it's the login id).

### 2.5 `GET /customers`: customer list (Khata)
**Why:** the Khata, customer pickers, Home "customers owe" and History all come from this list.
**Where:** together with 2.3 (start, login, pull-to-refresh).

Response `200`:
```json
{
  "customers": [
    {
      "id": "6af1...", "customerName": "Ramesh", "phoneNumber": "9000000011",
      "isWalkinCustomer": false,
      "pastDues": 88500,
      "dueSince": "2026-11-08T05:10:00.000Z",
      "recentTransactions": [
        { "txnId": "bill_mh2x_ab12", "kind": "bill", "method": "khata", "amount": 38500,
          "billNo": "#0012", "items": [{ "name": "Rice", "qty": 2, "unit": "kg", "rate": 6000 }],
          "discount": 0, "createdAt": "2026-11-08T05:10:00.000Z" }
      ],
      "createdAt": "2026-11-01T04:00:00.000Z"
    }
  ]
}
```
- `pastDues`: what this customer owes (paise). The app calls this `balance`.
- `recentTransactions`: **the last 3** bills or payments of this customer. The **History** screen joins these from all customers, so it shows recent entries, not the full history.
- Each shop also has one **walk-in** customer (`isWalkinCustomer: true`) that holds anonymous cash/UPI bills. The app hides it from customer lists but shows its bills as "Walk-in customer".

### 2.6 `POST /customers`: add a customer
**Where:** Add customer screen, and "Add “name”" inside the customer picker.

Request: `{ "customerName": "Lakshmi", "phoneNumber": "9000000012", "openingDue": 25000 }`
- `phoneNumber` is optional and must be unique within the shop.
- `openingDue` is optional: what the customer already owes from the old paper book (paise).

Response `201`: `{ "customer": { ...customer as in 2.5 } }`
**Errors:** `409` → "A customer with this phone number already exists."

### 2.7 `POST /transactions` (bill): save a bill
**Why:** this is the moment a bill really counts. It updates the customer's due and the shop totals in one step on the server.
**Where:** Review bill → Khata, the cash confirm screen ("Yes, received" / "Add to Khata"), and the UPI QR screen ("Yes, it arrived" / "Add to Khata").

Request:
```json
{
  "kind": "bill",
  "txnId": "bill_mh2x_ab12",
  "customerId": "6af1...",
  "method": "khata",
  "items": [{ "name": "Rice", "qty": 2, "unit": "kg", "rate": 6000 }],
  "discount": 0,
  "billNo": "#0012"
}
```
- `customerId`: leave it out for a walk-in sale (`method` must then be `cash` or `upi`).
- `method`: `cash`, `upi`, or `khata` (credit; adds to the customer's due).
- The **server recomputes the total** from `qty × rate − discount`. The app's total is only for display.

Response `201` (or `200` when the same `txnId` was already saved):
```json
{
  "transaction": { "txnId": "bill_mh2x_ab12", "kind": "bill", "method": "khata", "amount": 12000, "...": "..." },
  "customer":    { "...updated customer, new pastDues and recentTransactions..." },
  "shopkeeper":  { "...updated todaysBill / weeklyBill / todaysDues / duesTotal..." }
}
```
**The app then:** replaces that customer and the shop totals with what the server returned, then shows the result screen. **The result screen only appears after this succeeds.** If the save fails, the bill stays on screen with an error and **Try again**.

**Errors:** `400` (for example khata without a customer). Network errors and `5xx` → generic messages with **Try again**.

### 2.8 `POST /transactions` (payment): record money received
**Where:** Record payment screen.

Request: `{ "kind": "payment", "txnId": "pay_mh2y_cd34", "customerId": "6af1...", "method": "cash", "amount": 20000 }`
- `method`: `cash` or `upi`.
- `amount` can't be more than the customer's `pastDues`. The app checks this before sending, and the server checks again.

Response: same shape as 2.7.
**Errors:** `400` → "This is more than the customer owes."

### 2.9 `POST /voice/bill`: voice recording → bill draft (one-shot)

> The app now uses the conversation in **2.11** for voice bills. This one-shot endpoint is still available.
**Why:** the main feature. The shopkeeper speaks the bill. The server turns the speech into text (Gnani) and reads the items with AI (Gemini). **It doesn't save anything.** It returns a draft for the shopkeeper to check.
**Where:** "Create bill with voice" (Recorder screen, `src/logic/useVoiceRecorder.ts`).

Request: `multipart/form-data`
| Field | Value |
|---|---|
| `audio` | the recording: `{ uri: 'file:///…/voice-bill.aac', name: 'recording.aac', type: 'audio/aac' }`, recorded as 16 kHz mono AAC (ADTS), **up to 90 s**. The server cuts anything over 25 s into pieces at pauses, because Gnani takes at most 30 s per request, and joins the text |
| `customerId` | optional: skip name matching when the customer is already known |

Response `200`:
```json
{
  "transcript": "Ramesh, two kilo rice at sixty rupees per kilo, one litre oil one forty five, khata",
  "detectedLanguage": "en-IN",
  "draft": {
    "spokenCustomerName": "Ramesh",
    "customer": { "id": "6af1...", "customerName": "Ramesh", "pastDues": 50000 },
    "method": "khata",
    "items": [
      { "name": "Rice", "spokenName": "rice", "qty": 2, "unit": "kg", "rate": 6000, "lineTotal": 12000, "needsCheck": false, "notes": [] },
      { "name": "Oil",  "spokenName": "oil",  "qty": 1, "unit": "L",  "rate": 14500, "lineTotal": 14500, "needsCheck": false, "notes": [] }
    ],
    "discount": 0, "subtotal": 26500, "total": 26500, "needsCheck": 0, "warnings": []
  },
  "timings": { "sttMs": 400, "llmMs": 1400 }
}
```
**The app then** builds a bill draft and opens **Review bill**:
- `draft.customer` → the customer is pre-selected. If the name matched nobody, `spokenCustomerName` is shown as a hint to pick or add them.
- `draft.method` → the payment method is pre-selected.
- An item with `needsCheck: true` is highlighted. The shopkeeper taps it to confirm.
- An item with `rate: null` (price not heard) must have its price typed in Edit items before saving.
- Saving then uses 2.7.

**Read-back:** right after a voice bill, Review bill reads the transcript aloud once (switch it off in Settings → "Read voice bills aloud"). The **Listen** button plays it again. See 2.10.

**Errors shown on the recorder:**
| Status | Meaning | Message |
|---|---|---|
| `422` | no speech in the recording | "We could not hear anything…" |
| `400` | unreadable audio | "The recording could not be read…" |
| `413` | file too big | "The recording is too long…" |
| `502` / `503` | speech or AI service busy or misconfigured | "Voice service is busy…" |
| network / timeout | — | "No internet…" / "The server is taking too long…" |

The recorder also handles microphone permission (with **Open settings** if it was blocked), recordings that are too short, and leaving the screen (the upload is cancelled).

---

### 2.10 `GET /voice/speak`: read text aloud
**Why:** the shopkeeper hears what Vaani understood without reading it. **Where:** the "What we heard" card on Review bill (`src/logic/useReadAloud.ts`).

Request: `GET /api/voice/speak?t=<text as UTF-8 base64url>&lang=te-IN` with the usual `Authorization` header.
- `t`: at most 600 characters of text. The app splits longer transcripts at sentence ends and plays the parts one after another.
- `lang`: optional, the language Gnani detected for the recording. If it's missing, the voice works it out itself.

Response `200`: `audio/mpeg` (MP3, about 8 KB per second), spoken by Gnani's multilingual voice (Timbre v3.0 "Lakshmi"), which reads Telugu, Hindi, English and mixed sentences. The phone's media player streams it directly from this URL.

**Errors:** network or `5xx` → the card shows "Could not play it. Try again." The bill itself is not affected.

### 2.11 `POST /voice/turn`: one step of the voice-bill conversation
**Why:** the app behaves like a helper at the counter. The shopkeeper speaks, the app reads the bill back with the total and the customer's old due, asks for anything missing, and takes corrections until the shopkeeper presses **Yes**.
**Where:** the "Create bill with voice" screen (`src/screens/RecorderScreen.tsx`, logic in `src/logic/useConversation.ts`).

Request: `multipart/form-data`
| Field | Value |
|---|---|
| `audio` | what the shopkeeper just said (AAC, up to 90 s) |
| `state` | JSON of the bill so far (from the previous answer), or `null` for a new bill |
| `language` | `te`, `hi` or `en`: the language the reply is written in (the app's language) |

(For tests, the same endpoint takes JSON `{ "text": "...", "state": ..., "language": "te" }` instead of audio.)

Response `200`:
```json
{
  "heard": true,
  "transcript": "ఐదు కేజీలు",
  "state": {
    "items": [
      { "id": "i1", "name": "Rice",  "localName": "బియ్యం", "qty": 3, "unit": "kg", "rate": 7000 },
      { "id": "i2", "name": "Sugar", "localName": "చక్కెర", "qty": 5, "unit": "kg", "rate": 4000 }
    ],
    "customerId": "6af1...", "method": "khata", "discount": 0, "question": null
  },
  "customer": { "id": "6af1...", "name": "Ramesh", "pastDues": 351600 },
  "totals": { "subtotal": 41000, "total": 41000 },
  "reply": { "kind": "confirm", "text": "Ramesh గారి బిల్లు. 3 కిలో బియ్యం, 210 రూపాయలు. ... పాత బాకీ 3516 రూపాయలు. ఈ బిల్లుతో కలిపి 3926 రూపాయలు. ఈ వస్తువులు సరైనవేనా?" }
}
```
How it works:
- The AI (Gemini) only returns **edits** to the bill: add an item, update one (price, quantity, unit or name), or remove one. The server applies them and computes every amount in code.
- `qty: null` or `rate: null` means it wasn't said. The server then sets `state.question` (`{ itemId, field: "qty" | "rate" }`) and the reply asks for it ("చక్కెర ఎంత కావాలి?"). The next turn's answer fills it.
- `reply.kind`:
  - `question` → the app speaks it and listens again by itself (hands-free).
  - `confirm` → the app speaks the list, total, old due and new due, then shows **Yes / No**.
  - `retry` → nothing usable was heard; the app asks again.
- **No** → the app says "Tell me what to add or change" and listens. Extra items, corrections and removals all go through this same endpoint.
- **Yes** → the app opens Review bill with the items, customer and payment method filled in. Saving uses 2.7.
- Nothing is saved by this endpoint.

Hands-free listening (`src/logic/recording.ts`, `SpeechDetector`):
- It starts listening after the app finishes speaking.
- It stops after about 1.6 s of quiet once the shopkeeper has spoken. It measures this against the room's own background noise, so it works in a quiet or a busy shop.
- If nobody speaks for 8 s it stops without sending anything. After 3 silent turns in a row it waits for a tap on the mic.
- At the Yes/No step it does **not** listen, so customer chatter isn't recorded.

## 3. What happens when

**App start**
1. Read the saved language, token, shop and cached customers from the phone, then show them immediately.
2. If there is a token, call **2.3 + 2.5** in parallel to refresh.
3. If the phone is offline, the cached data stays visible with an "Offline" chip and a red banner with **Try again**.

**First run:** pick a language → Login / Register (2.1 or 2.2) → Home.

**Voice bill:** speak → **2.11** (repeat: questions, No → corrections, extra items) → Yes → Review → choose Cash / UPI / Khata → **2.7** → Result.

**Logout (Settings):** the token and cached data are removed from the phone. The language choice stays.

---

## 4. Status codes → what the user sees

| Status | Meaning | Default message (each screen can make it more specific) |
|---|---|---|
| no response | no internet / server unreachable | No internet. Check your connection and try again. |
| timeout | no answer in 20 s (60 s for voice) | The server is taking too long. Try again. |
| 400 / 422 | data not accepted | Some details are not valid. Check and try again. |
| 401 | not logged in / token expired | Your session ended. Please log in again. (→ login screen) |
| 404 | not found | Not found. Pull down to refresh. |
| 409 | duplicate | (login: mobile taken · customers: phone taken) |
| 429 | too many attempts | Too many wrong tries… |
| 5xx | server problem | Something went wrong on our side. Try again in a moment. |

All messages exist in English, Telugu and Hindi in `src/i18n/strings.ts`.

---

## 5. Other backend endpoints (not used by the app yet)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Is the server up? (no login needed) |
| `GET /customers/:id` | One customer |
| `PATCH /customers/:id` | Rename a customer / change or remove their phone number |
| `DELETE /customers/:id` | Delete a customer (only when nothing is due) |
| `POST /voice/extract` | Same as voice/bill but from typed text: `{ "transcript": "..." }` |
| `POST /voice/transcribe` | Speech-to-text only (same 90 s splitting) |

The backend's own `TESTING.md` has curl commands for every endpoint.

---

## 6. Changing the server address

Edit `API_BASE_URL` in `src/api/config.ts`:
- production: `https://vaani-api-black.vercel.app/api`
- backend running on your PC + Android emulator: `http://10.0.2.2:4000/api`. Plain `http` also needs `usesCleartextTraffic`, which debug builds already allow.

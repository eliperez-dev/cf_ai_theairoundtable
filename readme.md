# The AI Roundtable: A Conversational Podcast Engine

An AI-powered app that turns any topic into a dynamic, two-host podcast. This entire project runs on the Cloudflare developer platform, showcasing serverless AI at the edge.

**Live Demo:** [ai-roundtable.pages.dev](https://ai-roundtable.pages.dev)

**Built with:** `Cloudflare Workers` `Workers AI` `Cloudflare Pages` `TypeScript`

---

## What It Does

The **AI Roundtable** takes a topic—from black holes to top news stories—and generates a natural, engaging conversation between two AI hosts:

* **Alex:** A calm, knowledgeable host who explains concepts clearly.
* **Jamie:** An upbeat, inquisitive co-host who asks relatable questions.

Back-and-forth dialogue that sounds like a real podcast!

---

## Key Features

* **Custom Topics:** Enter any topic or paste a long article for discussion.
* **Podcast Styles:** Choose between two formats:
  * **Brief Talk:** 3-5 minute quick overview with concise discussion
  * **Deep Dive:** ~10 minute in-depth exploration with detailed explanations
* **AI Scripting:** Uses **Workers AI** to create conversational scripts with distinct personalities.
* **Dual-Voice Audio:** Generates audio for each host using two separate voices from **Deepgram Aura-1 TTS** (Alex: "Arcas" and Jamie: "Luna").
* **Serverless:** The whole process runs on **Cloudflare Workers** with no external servers needed.
* **Download & Transcript:** Save the MP3 podcast and a full text transcript.
* **News Integration:** Generate a podcast instantly from today's top headlines.
* **Dark UI:** A clean, responsive user interface with real-time progress updates.

---

## How It Works

The system is a simple, serverless pipeline:

1.  A user enters a topic on the **Cloudflare Pages** frontend.
2.  The frontend sends the request to a **Cloudflare Worker**.
3.  The Worker uses **Workers AI** to generate a full podcast script.
4.  It then goes line by line, calling the **TTS API** to generate audio for each host in their specific voice.
5.  Finally, it combines all the audio snippets into a single MP3 file and sends it back to the user.



---

## Technical Details

* **Backend:** Cloudflare Workers, TypeScript
* **Frontend:** Cloudflare Pages, Vanilla JavaScript, CSS
* **AI Models:** `@cf/openai/gpt-oss-120b` (scripting), `@cf/deepgram/aura-1` (TTS)
* **Data Pipeline:** The process is sequential: script generation, then audio generation, with automatic retries for any failures.

---

## Getting Started

1.  **Prerequisites:** You'll need Node.js (v18+) and a Cloudflare account.
2.  **Clone the Repo:** `git clone [repo-url]`
3.  **Install:** `cd aipodcast-worker && npm install`
4.  **Run Locally:** `wrangler dev --remote` (for the backend) and a simple web server (like `npx http-server -p 3000`) for the frontend.
5.  **Deploy:** The provided `deploy.ps1` script can deploy both the Worker and Pages site with a single command.

---

## Examples & Usage

* **Custom Topic:** Enter "How quantum computing works" for a deep dive.
* **News:** Click "Generate Podcast from Top Stories" to get a discussion on today's headlines.
* **Long-Form Text:** Paste a research paper, and the app will create a brief summary discussion.

---

This project was created by Eli Perez for a Cloudflare internship application.
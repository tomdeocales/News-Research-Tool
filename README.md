## RockyBot (Next.js + OpenRouter)

A modernized News Research Tool built with Next.js App Router, following an MVC-ish structure with clear services and controllers, a local vector store, and OpenRouter LLM for answers.

### Setup

1. Create `.env.local` in project root:

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
SITE_URL=http://localhost:3000
SITE_NAME=RockyBot
```

2. Install and run:

```
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Deployment (Vercel)

1. Push your code to GitHub
2. Connect to Vercel: New Project → Import your repo
3. Set Environment Variables in Vercel Project Settings:
   - `OPENROUTER_API_KEY` (required)
   - `SITE_URL` (your Vercel URL after first deploy)
   - `SITE_NAME` (optional)
   - `OPENROUTER_MODEL` (optional, defaults to openai/gpt-4o-mini)
4. Deploy!

**Note**: In production (Vercel), the app runs in ephemeral mode - no file persistence. URLs must be provided with each question for context.

### Structure

- `src/app/api/process/route.js`: Accepts `{ urls: string[] }`, fetches pages, chunks, embeds, persists to `data/vectorstore.json`.
- `src/app/api/ask/route.js`: Accepts `{ question: string }`, retrieves top chunks via cosine similarity, calls OpenRouter.
- `src/controllers/newsController.js`: Validation and orchestration.
- `src/services/*`: Embeddings, document fetching, vector store persistence.
- `src/lib/*`: Chunking and similarity helpers.
- `src/app/page.js`: Modern UI to process URLs and ask questions.

### Notes

- Embeddings use `@xenova/transformers` model `Xenova/all-MiniLM-L6-v2` (CPU).
- Vector store is a simple JSON file under `data/`. Clear it by deleting `data/vectorstore.json`.
- In production (Vercel), the app uses ephemeral storage - no persistence between requests.

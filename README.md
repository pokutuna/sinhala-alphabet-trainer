# Sinhala Alphabet Trainer

An app for learning and practicing the Sinhala alphabet. Built with React Router v7, TypeScript, and Tailwind CSS, and deployed to GitHub Pages.

**Demo**: https://pokutuna.github.io/sinhala-alphabet-trainer/

## Tech Stack

- React Router v7, React 19, TypeScript
- Tailwind CSS v4, Vite
- Biome (linting and formatting)
- GitHub Pages deployment via GitHub Actions

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run typecheck # Type checking
npm run check     # Lint + format with auto-fix
```

## Deployment

The `.github/workflows/deploy-pages.yml` workflow automatically deploys to GitHub Pages on push to main. The base path is auto-detected from the repository name via the `GITHUB_REPOSITORY` environment variable.

## Adding Routes

1. Create `app/routes/[name].tsx` with a default export.
2. Add the route to `app/routes.ts`.

```typescript
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("practice", "routes/practice.tsx"),
] satisfies RouteConfig;
```

## Project Structure

```
app/
├── components/      # Shared components
├── routes/          # Route components
├── root.tsx         # Root layout
├── routes.ts        # Route configuration
└── app.css          # Global styles with Tailwind theme
```

## License

MIT

---

Based on [pokutuna/react-router-spa-starter](https://github.com/pokutuna/react-router-spa-starter).

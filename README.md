# History - Five Dynasties and Ten Kingdoms Edition

A fork of [yorkeccak/history](https://github.com/yorkeccak/history) — an interactive 3D globe for exploring historical locations. This version replaces MapBox GL JS with **MapLibre GL JS** (open-source, no API key needed for the map) and adds a GeoJSON overlay of the **Five Dynasties and Ten Kingdoms (五代十国, 907-979 AD)** territories.

## What's Changed

- **MapBox → MapLibre GL JS v5**: Free, open-source map rendering with globe projection. No MapBox token required.
- **Five Dynasties GeoJSON data**: Colored polygon boundaries for 后梁, 南唐, 吴越, 闽, 南汉, 楚, 前蜀, 荆南, 北汉 with labels.
- **Map centered on China**: Default view at `[112°E, 33°N]` zoom 4, focused on the Five Dynasties era territories.
- **Free tile sources**: Uses CartoDB and OpenFreeMap styles (dark-matter, positron, liberty, bright).

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/htkhgsj/history.git
cd history

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local and add your research API key (optional, for AI research features)
# VALYU_API_KEY=valyu_your_key_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_MODE` | Yes | Set to `self-hosted` |
| `VALYU_API_KEY` | Optional | For AI-powered historical research |
| `OPENAI_API_KEY` | Optional | For AI image selection |

**No MapBox token needed** — the map uses free open-source tile providers.

### Build for Production

```bash
npm run build
npm start
```

## Map Themes

Available globe themes (selectable in sidebar):

- **Dark Matter** — Dark minimal basemap (default)
- **Positron** — Light minimal basemap
- **Liberty** — OpenFreeMap classic style
- **Bright** — OpenFreeMap bright style

## Five Dynasties Data

The GeoJSON data at `public/data/five-dynasties.geojson` contains simplified polygon boundaries for:

| Kingdom | Chinese | Period |
|---------|---------|--------|
| Later Liang | 后梁 | 907-923 |
| Southern Tang | 南唐 | 937-975 |
| Wuyue | 吴越 | 907-978 |
| Min | 闽 | 909-945 |
| Southern Han | 南汉 | 917-971 |
| Chu | 楚 | 907-951 |
| Former Shu | 前蜀 | 907-925 |
| Jingnan | 荆南 | 924-963 |
| Northern Han | 北汉 | 951-979 |

Click any colored territory on the globe to see its name and period.

## Tech Stack

- **Next.js 15** with Turbopack
- **MapLibre GL JS v5** — 3D globe with open-source tiles
- **React 19** + TypeScript
- **Tailwind CSS 4**
- **Framer Motion** — Animations

## License

Same as upstream — see [LICENSE](LICENSE).

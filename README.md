# Concert Photography Portfolio

A vibrant, modern, and responsive photography portfolio website tailored for portrait and concert photography. Built with a "Pastel Minimalist" aesthetic, this project highlights photography work with clean, high-performance UI components, smooth scroll-triggered animations, and an intuitive lightbox gallery.

## ✨ Features

- **Pastel Minimalist UI:** A warm, light color palette with soft whites, pinks, and lavenders, rounded shapes, and gentle shadows.
- **Smooth Animations:** Powered by [Framer Motion](https://www.framer.com/motion/) and [Lenis](https://github.com/darkroomengineering/lenis) for a seamless scrolling experience and scroll-reveal effects.
- **Interactive Gallery:** Responsive photo grid with pagination and a fully functional lightbox for viewing high-resolution images.
- **Dynamic Scheduling System:** An interactive calendar component that pulls availability and schedule data from a Google Sheets document.
- **LINE Integration:** Includes a LINE webhook endpoint to provide a read-only scheduling information service directly to LINE users.
- **Responsive Design:** Optimized for mobile, tablet, and desktop viewports, ensuring a premium user experience across all devices.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **API Integration:** [Google APIs](https://github.com/googleapis/google-api-nodejs-client) (Google Sheets API for scheduling)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd concert-portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install / pnpm install / bun install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add the necessary environment variables for the Google Sheets API and LINE integration (see [Environment Variables](#-environment-variables) below).

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔐 Environment Variables

To enable the scheduling and LINE webhook features, you need to set up the following environment variables in your `.env.local` (or in your Vercel project settings for production):

```env
# Google Sheets API Configuration
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_CREDENTIALS_JSON=your_minified_google_service_account_json_here

# LINE Webhook Configuration (Optional, if using LINE integration)
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
```

*(Note: For local development, the project might also check for a local `google-credentials.json` file).*

## 📂 Project Structure

- `src/app/`: Next.js App Router pages and API routes (`/api/schedule`, `/api/line-webhook`).
- `src/components/`: Reusable React components (`Hero`, `Gallery`, `Calendar`, `Packages`, `Contact`, `Lightbox`, etc.).
- `src/data/`: Static data files (e.g., photo data and references to local assets).
- `src/assets/`: Local image assets for the portfolio.

## 🌐 API Routes

- `GET /api/schedule`: Fetches and processes schedule data from the connected Google Sheet to populate the frontend Calendar component.
- `POST /api/line-webhook`: Processes incoming messages from LINE users and replies with scheduling information pulled from Google Sheets.

## 🚀 Deployment

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/). Ensure that you add your environment variables to the Vercel project settings before deploying, specifically stringifying your `GOOGLE_CREDENTIALS_JSON` correctly.

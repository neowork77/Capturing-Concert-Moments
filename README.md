# Concert Photography Portfolio

A vibrant, modern, and responsive photography portfolio website tailored for portrait and concert photography. Built with a "Pastel Minimalist" aesthetic, this project highlights photography work with clean, high-performance UI components, smooth scroll-triggered animations, and an intuitive lightbox gallery.

## ✨ Features

- **Pastel Minimalist UI:** A warm, light color palette with soft whites, pinks, and lavenders, rounded shapes, and gentle shadows.
- **Smooth Animations:** Powered by [Framer Motion](https://www.framer.com/motion/) and [Lenis](https://github.com/darkroomengineering/lenis) for a seamless scrolling experience and scroll-reveal effects.
- **Interactive Gallery:** Responsive photo grid with pagination and a fully functional lightbox for viewing high-resolution images.
- **Dynamic Scheduling System & Admin Panel:** An interactive calendar component and Admin Dashboard powered by **Supabase PostgreSQL** via **Drizzle ORM**.
- **LINE Integration:** Includes a LINE webhook endpoint to provide schedule and booking lookup directly to LINE users.
- **Responsive Design:** Optimized for mobile, tablet, and desktop viewports, ensuring a premium user experience across all devices.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Database & ORM:** [Supabase PostgreSQL](https://supabase.com/) & [Drizzle ORM](https://orm.drizzle.team/)
- **Storage:** Cloudflare R2

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
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/postgres

# LINE Webhook Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
```

4. **Push Database Schema:**
   ```bash
   npx drizzle-kit push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌐 API Routes & Admin

- `GET /api/schedule`: Fetches schedule data from Supabase for the Calendar component.
- `POST /api/line-webhook`: Processes incoming LINE bot messages and queries schedule data from Supabase.
- `/admin`: Studio Admin control panel with tabs for **Gallery Management** and **Schedule & Slots Management**.

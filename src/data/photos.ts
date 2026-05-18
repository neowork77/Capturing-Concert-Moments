import { StaticImageData } from 'next/image';
import img1 from '../assets/optimized/gallery-1.webp';
import img2 from '../assets/optimized/gallery-2.webp';
import img3 from '../assets/optimized/gallery-3.webp';
import img4 from '../assets/optimized/gallery-4.webp';
import img5 from '../assets/optimized/gallery-5.webp';
import img6 from '../assets/optimized/gallery-6.webp';
import img7 from '../assets/optimized/gallery-7.webp';
import img8 from '../assets/optimized/gallery-8.webp';
import img9 from '../assets/optimized/gallery-9.webp';
import img10 from '../assets/optimized/gallery-10.webp';
import img11 from '../assets/optimized/gallery-11.webp';
import img12 from '../assets/optimized/gallery-12.webp';
import img13 from '../assets/optimized/gallery-13.webp';
import img14 from '../assets/optimized/gallery-14.webp';
import img15 from '../assets/optimized/gallery-15.webp';
import img16 from '../assets/optimized/gallery-16.webp';
import img17 from '../assets/optimized/gallery-17.webp';
import img18 from '../assets/optimized/gallery-18.webp';
import img19 from '../assets/optimized/gallery-19.webp';
import img20 from '../assets/optimized/gallery-20.webp';
import img21 from '../assets/optimized/gallery-21.webp';
import img22 from '../assets/optimized/gallery-22.webp';
import img23 from '../assets/optimized/gallery-23.webp';
import img24 from '../assets/optimized/gallery-24.webp';
import img25 from '../assets/optimized/gallery-25.webp';
import img26 from '../assets/optimized/gallery-26.webp';
import img27 from '../assets/optimized/gallery-27.webp';
// import img28 from '../assets/optimized/gallery-28.webp';
import img29 from '../assets/optimized/gallery-29.webp';
import img30 from '../assets/optimized/gallery-30.webp';
import img31 from '../assets/optimized/gallery-31.webp';
import img32 from '../assets/optimized/gallery-32.webp';

export interface Photo {
  id: string;
  src: string;
  alt: string;
  artist?: string;
  event: string;
  venue?: string;
  date: string;
  width: number;
  height: number;
  blurDataURL?: string;
  accentColor: 'pink' | 'cyan' | 'lime' | 'purple' | 'orange';
}

const colors: ('pink' | 'cyan' | 'lime' | 'purple' | 'orange')[] = ['pink', 'cyan', 'lime', 'purple', 'orange'];
const photoData = [
  { img: img1, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue 1', date: '2026-05-18' },
  { img: img2, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue 2', date: '2026-05-18' },
  { img: img3, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue 3', date: '2026-05-18' },
  { img: img4, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img5, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img6, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img7, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img8, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img9, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img10, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img11, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img12, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img13, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img14, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img15, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img16, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img17, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img18, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img19, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img20, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img21, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img22, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img23, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img24, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img25, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img26, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img27, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img29, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img30, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img31, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
  { img: img32, artist: 'Artist Name', event: 'EXO PLANET #6 - EXhOrizon in BANGKOK', venue: 'Venue', date: '2026-05-18' },
];

export const photos: Photo[] = photoData.map((data, i: number) => ({
  id: `${i + 1}`,
  src: data.img.src,
  alt: `Concert photo ${i + 1}`,
  artist: data.artist,
  event: data.event,
  venue: data.venue,
  date: data.date,
  width: data.img.width,
  height: data.img.height,
  blurDataURL: data.img.blurDataURL,
  accentColor: colors[i % colors.length],
}));

import { StaticImageData } from 'next/image';
import img1 from '../assets/gallery-1.jpg';
import img2 from '../assets/gallery-2.jpg';
import img3 from '../assets/gallery-3.jpg';
import img4 from '../assets/gallery-4.jpg';
import img5 from '../assets/gallery-5.jpg';
import img6 from '../assets/gallery-6.jpg';
import img7 from '../assets/gallery-7.jpg';
import img8 from '../assets/gallery-8.jpg';
import img9 from '../assets/gallery-9.jpeg';
import img10 from '../assets/gallery-10.jpeg';
import img11 from '../assets/gallery-11.jpeg';
import img12 from '../assets/gallery-12.jpeg';
import img13 from '../assets/gallery-13.jpeg';
import img14 from '../assets/gallery-14.jpeg';
import img15 from '../assets/gallery-15.jpeg';
import img16 from '../assets/gallery-16.jpeg';
import img17 from '../assets/gallery-17.jpeg';
import img18 from '../assets/gallery-18.jpeg';
import img19 from '../assets/gallery-19.jpeg';
import img20 from '../assets/gallery-20.jpeg';
import img21 from '../assets/gallery-21.jpeg';
import img22 from '../assets/gallery-22.jpeg';
import img23 from '../assets/gallery-23.jpeg';
import img24 from '../assets/gallery-24.jpeg';
import img25 from '../assets/gallery-25.jpeg';
import img26 from '../assets/gallery-26.jpeg';
import img27 from '../assets/gallery-27.jpeg';
// import img28 from '../assets/gallery-28.jpeg';
import img29 from '../assets/gallery-29.jpg';
import img30 from '../assets/gallery-30.jpg';
import img31 from '../assets/gallery-31.jpg';
import img32 from '../assets/gallery-32.jpg';

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

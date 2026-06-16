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
import img29 from '../assets/gallery-29.jpg';
import img30 from '../assets/gallery-30.jpg';
import img31 from '../assets/gallery-31.jpg';
import img32 from '../assets/gallery-32.jpg';
import img33 from '../assets/gallery-33.jpg';
import img34 from '../assets/gallery-34.jpg';
import img35 from '../assets/gallery-35.jpg';
import img36 from '../assets/gallery-36.jpg';
import img37 from '../assets/gallery-37.jpeg';
import img38 from '../assets/gallery-38.jpeg';
import img39 from '../assets/gallery-39.jpeg';
import img40 from '../assets/gallery-40.jpeg';
import img41 from '../assets/gallery-41.jpeg';
import img42 from '../assets/gallery-42.jpg';
import img43 from '../assets/gallery-43.jpeg';
import img44 from '../assets/gallery-44.jpeg';
import img45 from '../assets/gallery-45.jpeg';
import img46 from '../assets/gallery-46.jpg';
import img47 from '../assets/gallery-47.jpg';
import img48 from '../assets/gallery-48.jpg';
import img49 from '../assets/gallery-49.jpg';
import img50 from '../assets/gallery-50.jpeg';
import img51 from '../assets/gallery-51.jpeg';
import img52 from '../assets/gallery-52.jpeg';
import img53 from '../assets/gallery-53.jpeg';
import img54 from '../assets/gallery-54.jpg';
import img55 from '../assets/gallery-55.jpg';
import img56 from '../assets/gallery-56.jpg';
import img57 from '../assets/gallery-57.jpg';
import img58 from '../assets/gallery-58.jpg';
import img59 from '../assets/gallery-59.jpg';
import img60 from '../assets/gallery-60.jpg';
import img61 from '../assets/gallery-61.jpg';
import img62 from '../assets/gallery-62.jpg';
import img63 from '../assets/gallery-63.jpg';
import img64 from '../assets/gallery-64.jpg';
import img65 from '../assets/gallery-65.jpg';
import img66 from '../assets/gallery-66.jpg';
import img67 from '../assets/gallery-67.jpg';
import img68 from '../assets/gallery-68.jpg';
import img69 from '../assets/gallery-69.jpg';
import img70 from '../assets/gallery-70.jpg';
import img71 from '../assets/gallery-71.jpg';
import img72 from '../assets/gallery-72.jpg';
import img73 from '../assets/gallery-73.jpg';
import img74 from '../assets/gallery-74.jpg';
import img75 from '../assets/gallery-75.jpg';
import img76 from '../assets/gallery-76.jpg';
import img77 from '../assets/gallery-77.jpg';
import img78 from '../assets/gallery-78.jpg';
import img79 from '../assets/gallery-79.jpg';
import img80 from '../assets/gallery-80.jpg';
import img81 from '../assets/gallery-81.jpg';
import img82 from '../assets/gallery-82.jpg';
import img83 from '../assets/gallery-83.jpg';

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

// Map imgKey strings to actual imported images
export const imageMap: Record<string, StaticImageData> = {
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19, img20,
  img21, img22, img23, img24, img25, img26, img27,
  img29, img30, img31, img32, img33, img34, img35, img36,
  img37, img38, img39, img40, img41, img42, img43, img44, img45,
  img46, img47, img48, img49, img50, img51, img52, img53,
  img54, img55, img56, img57, img58, img59, img60, img61, img62, img63,
  img64, img65, img66, img67, img68, img69, img70, img71, img72, img73,
  img74, img75, img76, img77, img78, img79, img80, img81, img82, img83,
};

export const photos: Photo[] = Object.values(imageMap).map((img, i) => ({
  id: `${i + 1}`,
  src: img.src,
  alt: `Concert photo ${i + 1}`,
  artist: 'Artist',
  event: 'Concert',
  venue: 'Venue',
  date: '2026-05-18',
  width: img.width,
  height: img.height,
  blurDataURL: img.blurDataURL,
  accentColor: colors[i % colors.length],
}));

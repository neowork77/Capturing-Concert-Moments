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

import photosDataJson from './photos-data.json';

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

export interface PhotoData {
  id: string;
  imgKey: string;
  artist: string;
  event: string;
  venue: string;
  date: string;
  deleted: boolean;
}

const colors: ('pink' | 'cyan' | 'lime' | 'purple' | 'orange')[] = ['pink', 'cyan', 'lime', 'purple', 'orange'];

// Map imgKey strings to actual imported images
const imageMap: Record<string, StaticImageData> = {
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19, img20,
  img21, img22, img23, img24, img25, img26, img27,
  img29, img30, img31, img32,
};

// Build all photos (including deleted) for admin usage
export const allPhotos: Photo[] = (photosDataJson.photos as PhotoData[])
  .map((data, i) => {
    let src = '';
    let width = 1200;
    let height = 800;
    let blurDataURL: string | undefined = undefined;

    if (data.imgKey.startsWith('http://') || data.imgKey.startsWith('https://')) {
      src = data.imgKey;
    } else {
      const img = imageMap[data.imgKey];
      if (!img) return null;
      src = img.src;
      width = img.width;
      height = img.height;
      blurDataURL = img.blurDataURL;
    }

    const photo: Photo = {
      id: data.id,
      src,
      alt: `Concert photo ${data.id}`,
      artist: data.artist,
      event: data.event,
      venue: data.venue,
      date: data.date,
      width,
      height,
      blurDataURL,
      accentColor: colors[i % colors.length],
    };
    return photo;
  })
  .filter((p): p is Photo => p !== null);

// Only non-deleted photos for the public gallery
export const photos: Photo[] = (photosDataJson.photos as PhotoData[])
  .filter((d) => !d.deleted)
  .map((data, i) => {
    let src = '';
    let width = 1200;
    let height = 800;
    let blurDataURL: string | undefined = undefined;

    if (data.imgKey.startsWith('http://') || data.imgKey.startsWith('https://')) {
      src = data.imgKey;
    } else {
      const img = imageMap[data.imgKey];
      if (!img) return null;
      src = img.src;
      width = img.width;
      height = img.height;
      blurDataURL = img.blurDataURL;
    }

    const photo: Photo = {
      id: data.id,
      src,
      alt: `Concert photo ${data.id}`,
      artist: data.artist,
      event: data.event,
      venue: data.venue,
      date: data.date,
      width,
      height,
      blurDataURL,
      accentColor: colors[i % colors.length],
    };
    return photo;
  })
  .filter((p): p is Photo => p !== null);

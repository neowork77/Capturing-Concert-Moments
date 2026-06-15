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
export const imageMap: Record<string, StaticImageData> = {
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19, img20,
  img21, img22, img23, img24, img25, img26, img27,
  img29, img30, img31, img32,
  img33, img34, img35, img36, img37, img38, img39, img40,
  img41, img42, img43, img44, img45, img46, img47, img48, img49, img50,
  img51, img52, img53, img54, img55, img56, img57, img58, img59, img60,
  img61, img62, img63, img64, img65, img66, img67, img68, img69, img70,
  img71, img72, img73, img74, img75, img76, img77, img78, img79, img80,
  img81, img82, img83,
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

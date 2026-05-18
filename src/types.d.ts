declare module '*.JPG' {
  import { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}
declare module '*.JPEG' {
  import { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}

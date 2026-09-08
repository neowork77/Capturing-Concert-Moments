import Navbar from '@/features/landing/components/Navbar';
import Hero from '@/features/landing/components/Hero';
import Gallery from '@/features/landing/components/Gallery';
import Packages from '@/features/landing/components/Packages';
import Contact from '@/features/landing/components/Contact';
import Calendar from '@/features/landing/components/Calendar';
import Footer from '@/shared/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Gallery />
      <Packages />
      <Contact />
      <Calendar />
      <Footer />
    </main>
  );
}

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Gallery from '@/components/landing/Gallery';
import Packages from '@/components/landing/Packages';
import Contact from '@/components/landing/Contact';
import Calendar from '@/components/landing/Calendar';
import Footer from '@/components/common/Footer';

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

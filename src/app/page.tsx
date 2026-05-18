import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Gallery from '@/components/Gallery';
import Packages from '@/components/Packages';
import Contact from '@/components/Contact';
import Calendar from '@/components/Calendar';
import Footer from '@/components/Footer';

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

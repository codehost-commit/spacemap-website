import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout.js';
import { HomePage } from './pages/HomePage.js';
import { FeaturesPage } from './pages/FeaturesPage.js';
import { AboutPage } from './pages/AboutPage.js';
import { TrackerPage } from './pages/TrackerPage.js';
import { ContactPage } from './pages/ContactPage.js';
import { LegalPage } from './pages/LegalPage.js';

export function App() {
  // Vite sets import.meta.env.BASE_URL from the `base` config (e.g. "/spacemap-website/")
  const base = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

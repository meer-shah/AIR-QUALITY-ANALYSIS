/**
 * App — BrowserRouter + layout (nav, routed content, footer).
 *
 * Map-heavy pages (Map, Estimate) are code-split with React.lazy so Leaflet only
 * loads when needed. A ScrollToTop resets scroll on navigation.
 */
import * as React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/layout/nav';
import { Footer } from './components/layout/footer';
import { LoadingState } from './components/ui/spinner';
import Dashboard from './pages/dashboard';
import Live from './pages/live';
import Trends from './pages/trends';
import Stations from './pages/stations';
import Explore from './pages/explore';
import Methodology from './pages/methodology';
import NotFound from './pages/not-found';

const MapView = React.lazy(() => import('./pages/map-view'));
const Estimate = React.lazy(() => import('./pages/estimate'));

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Nav />
    <React.Suspense fallback={<LoadingState label="Loading…" />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<Live />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/estimate" element={<Estimate />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
    <Footer />
  </BrowserRouter>
);

export default App;

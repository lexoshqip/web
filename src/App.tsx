import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import MiniPlayer from "./components/MiniPlayer";
import { AudioProvider } from "./lib/player";
import Home from "./pages/Home";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import Epochs from "./pages/Epochs";
import EpochDetail from "./pages/EpochDetail";
import Authors from "./pages/Authors";
import AuthorDetail from "./pages/AuthorDetail";
import Favorites from "./pages/Favorites";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Submit from "./pages/Submit";
import Legal from "./pages/Legal";
import Tos from "./pages/Tos";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import LibraryDetail from "./pages/LibraryDetail";
import Zbulo from "./pages/Zbulo";
import Emerging from "./pages/Emerging";
import AppPage from "./pages/AppPage";

/* heavy reader deps (epubjs + pdfjs) load only when the reader is opened */
const ReaderPage = lazy(() => import("./reader/ReaderPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <AudioProvider>
        <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/zbulo" element={<Zbulo />} />
        <Route path="/epochs" element={<Navigate to="/zbulo" replace />} />
        <Route path="/epochs/:id" element={<EpochDetail />} />
        <Route path="/collections" element={<Navigate to="/zbulo" replace />} />
        <Route path="/collections/:id" element={<CollectionDetail />} />
        <Route path="/libraries/:id" element={<LibraryDetail />} />
        <Route path="/emerging" element={<Emerging />} />
        <Route path="/aplikacioni" element={<AppPage />} />
        <Route path="/authors" element={<Authors />} />
        <Route path="/authors/:id" element={<AuthorDetail />} />
        <Route path="/favorites" element={<Favorites />} />
                <Route path="/burimet" element={<Resources />} />
        <Route path="/rreth-nesh" element={<About />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/tos" element={<Tos />} />
        <Route path="/privatesia" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
      </Route>

      {/* reader lives OUTSIDE the site chrome — fully immersive, own themed toolbar */}
      <Route
        path="/read/:bookId/:format/:editionId?"
        element={
          <Suspense
            fallback={
              <div className="grid h-dvh place-items-center bg-paper">
                <div className="size-10 animate-spin rounded-full border-4 border-parchment-deep border-t-brand" />
              </div>
            }
          >
            <ReaderPage />
          </Suspense>
        }
      />
      </Routes>
        {/* global audiobook pill — persists across routes */}
        <MiniPlayer />
      </AudioProvider>
    </ErrorBoundary>
  );
}


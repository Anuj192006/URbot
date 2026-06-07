import { Route, Routes, useLocation } from 'react-router-dom';

import SiteHeader from './components/SiteHeader';
import BotChatPage from './pages/BotChatPage';
import CreatedPage from './pages/CreatedPage';
import HomePage from './pages/HomePage';
import ManageBotPage from './pages/ManageBotPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/bot/');

  return (
    <div className={`app-shell${isChatRoute ? ' app-shell-chat' : ''}`}>
      {isChatRoute ? null : <SiteHeader />}
      <main className={`page-shell${isChatRoute ? ' page-shell-chat' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/created/:slug" element={<CreatedPage />} />
          <Route path="/bot/:slug" element={<BotChatPage />} />
          <Route path="/manage/:slug/:token" element={<ManageBotPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

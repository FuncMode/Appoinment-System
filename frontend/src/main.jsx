import { createRoot } from 'react-dom/client';
import './styles.css';
import './shared/data.js';
import { StoreProvider } from './shared/components.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <App />
  </StoreProvider>
);

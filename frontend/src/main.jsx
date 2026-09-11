import { createRoot } from 'react-dom/client';
import './styles.css';
import './data.js';
import { StoreProvider } from './components.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <App />
  </StoreProvider>
);

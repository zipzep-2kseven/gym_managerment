import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import { AppRoutes } from './routes/AppRoutes.js';
import './index.css';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

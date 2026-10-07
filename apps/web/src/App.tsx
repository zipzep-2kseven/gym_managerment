import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import { AppRoutes } from './routes/AppRoutes.js';
import './index.css';
import './gym.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, networkMode: 'always' }, mutations: { retry: false, gcTime: 0, networkMode: 'always' } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}><BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter></QueryClientProvider>
  );
}

export default App;

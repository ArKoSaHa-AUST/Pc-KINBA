import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import AIAssistantPage from './pages/AIAssistantPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyPage from './pages/auth/VerifyPage';
import BuildCheckoutPage from './pages/BuildCheckoutPage';
import ComparePage from './pages/ComparePage';
import Home from './pages/Home';
import PCBuilderPage from './pages/PCBuilderPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/pc-builder" element={<PCBuilderPage />} />
          <Route path="/pc-builder/checkout" element={<BuildCheckoutPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

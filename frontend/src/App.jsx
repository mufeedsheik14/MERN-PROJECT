import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { FleetProvider } from "./context/FleetContext";
import { BookingProvider } from "./context/BookingContext";
import { DocumentProvider } from "./context/DocumentContext";
import { CustomerDocumentProvider } from "./context/CustomerDocumentContext";
import { InteractionProvider } from "./context/InteractionContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import MyBookings from "./pages/MyBookings";
import LiveTracking from "./pages/LiveTracking";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import StaffLogin from "./pages/StaffLogin";
import Dashboard from "./pages/Dashboard";
import OAuthCallback from "./pages/OAuthCallback";


export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <FleetProvider>
            <DocumentProvider>
              <CustomerDocumentProvider>
              <BookingProvider>
                <InteractionProvider>
                  <BrowserRouter>
                    <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/vehicles/:id" element={<VehicleDetail />} />
                    <Route
                      path="/my-bookings"
                      element={
                        <ProtectedRoute allowedRoles={["customer", "admin"]}>
                          <MyBookings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute allowedRoles={["customer", "staff"]}>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route path="/staff-login" element={<StaffLogin />} />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["admin", "staff"]}>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tracking"
                      element={
                        <ProtectedRoute allowedRoles={["admin", "staff"]}>
                          <LiveTracking />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/track/:bookingId"
                      element={
                        <ProtectedRoute allowedRoles={["admin", "staff"]}>
                          <LiveTracking />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Home />} />
                  </Routes>
                  </Layout>
                </BrowserRouter>
              </InteractionProvider>
            </BookingProvider>
              </CustomerDocumentProvider>
            </DocumentProvider>
          </FleetProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

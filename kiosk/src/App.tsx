import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Congestion from "./pages/Congestion";
import StoreEdit from "./pages/StoreEdit";
import Products from "./pages/Products";
import Coupons from "./pages/Coupons";
import Payment from "./pages/Payment";
import Map from "./pages/Map";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = useAuth((s) => s.token);
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={<RequireAuth><Layout /></RequireAuth>}
        >
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="map"        element={<Map />} />
          <Route path="congestion" element={<Congestion />} />
          <Route path="store"      element={<StoreEdit />} />
          <Route path="products"   element={<Products />} />
          <Route path="coupons"    element={<Coupons />} />
          <Route path="payment"    element={<Payment />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

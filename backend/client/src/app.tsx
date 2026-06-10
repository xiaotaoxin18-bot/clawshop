import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage/ProductDetailPage';
import AlertsPage from './pages/AlertsPage/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage';
import InboundPage from './pages/InboundPage/InboundPage';
import OutboundPage from './pages/OutboundPage/OutboundPage';
import ThresholdConfigPage from './pages/SettingsPage/ThresholdConfigPage/ThresholdConfigPage';
import DouyinPage from './pages/DouyinPage/DouyinPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';

const RoutesComponent = () => {
  return (
    
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/inbound" element={<InboundPage />} />
        <Route path="/outbound" element={<OutboundPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/douyin" element={<DouyinPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings/threshold" element={<ThresholdConfigPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
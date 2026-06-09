import React, { useState } from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import RoutesComponent from "./app.tsx";
import './index.css';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

const AppFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const [retried, setRetried] = useState(false);

  React.useEffect(() => {
    if (!retried) {
      setRetried(true);
      const timer = setTimeout(() => resetErrorBoundary(), 800);
      return () => clearTimeout(timer);
    }
  }, [retried, resetErrorBoundary]);

  if (!retried) return null; // 首次出错，静默重试

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="flex flex-col items-center text-center max-w-lg">
        <p className="text-lg font-medium text-red-600 mb-2">页面出错了</p>
        <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-100 p-3 rounded max-w-full overflow-auto">
          {error?.message || '未知错误'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          重试
        </button>
      </div>
    </div>
  );
};

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <div className="min-h-screen bg-background">
        <ErrorBoundary FallbackComponent={AppFallback}>
          <RoutesComponent />
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
};

createRoot(document.getElementById("root")!).render(<MainApp />);

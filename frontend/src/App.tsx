import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ExcelViewer from './components/ExcelViewer';
import QrCodeViewer from './components/QrCodeViewer'
import PendingMessagesMain from './components/pendingMessages/Dashboard';
import Login from './components/Login';
import Modal from 'react-modal';

// Set the app element to the root element of your application
Modal.setAppElement('#root');

import './index.css';

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/whatsapp-status" element={<QrCodeViewer />} />
      <Route path="/excel-viewer" element={<ExcelViewer />} />
      <Route path="/pending-messages" element={<PendingMessagesMain />} />
      {/* Puedes agregar más rutas aquí */}
    </Routes>
  </Router>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
// dShopping Lite - React Bootstrap Entry Point
// Inicialización del DOM y renderizado concurrente con React 19

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Buscar el contenedor raíz en el DOM
const container = document.getElementById('root');

if (!container) {
  throw new Error(
    'No se encontró el elemento raíz "#root" en el DOM. Asegúrese de que index.html contenga <div id="root"></div>'
  );
}

// Inicializar la raíz de renderizado concurrente
const root = createRoot(container);

// Renderizar la aplicación en modo estricto para detectar fallos tempranos en desarrollo
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('Starting Jay\'s Frames app...');

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found!')
  throw new Error('Root element not found')
}

console.log('Root element found, rendering app...');

ReactDOM.createRoot(rootElement).render(<App />);

console.log('App rendered successfully!');
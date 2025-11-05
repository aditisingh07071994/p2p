import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'  // Add this line
import AppWrapper from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
)
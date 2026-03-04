import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// TODO: Uncomment for amplify to work
// import { Amplify } from 'aws-amplify'
// import outputs from '../amplify/outputs.json'

// Amplify.configure(outputs);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
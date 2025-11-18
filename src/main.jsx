import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';

const Main = () => {
  const [appearance, setAppearance] = useState('light');

  const onSelectAppearance = (appearance) => {
    setAppearance(appearance)
    if (appearance === 'dark')
      document.body.classList.add('dark-mode')
    else
      document.body.classList.remove('dark-mode')
  }

  useEffect(() => {
    // Add listener to update styles
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => onSelectAppearance(e.matches ? 'dark' : 'light'));

    // Setup dark/light mode for the first time
    onSelectAppearance(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    // Remove listener
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => {
      });
    }
  }, []);

  return (
    <StrictMode>
      <Theme appearance={appearance}>
        <App />
      </Theme>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(
  <Main />,
)

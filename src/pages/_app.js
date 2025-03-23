import '../styles/globals.css';
import Head from 'next/head';
import { ThemeProvider } from '../components/theme-provider';

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="description" content="CriaPrompt - Plataforma para criar, gerenciar e compartilhar prompts para IA" />
        <meta name="theme-color" content="#7c3aed" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
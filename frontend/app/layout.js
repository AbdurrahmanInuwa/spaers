import { Roboto, Roboto_Mono } from 'next/font/google';
import './globals.css';
import AppChrome from './components/AppChrome';
import ScrollToTop from './components/ScrollToTop';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './lib/auth';

// Roboto for headlines + UI; Roboto Mono for technical/data displays
// (e.g. "GPS Signal: Locked", "Response ETA: 4:32"). Both surfaced as
// CSS variables so Tailwind's font-family extensions can reference them.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
});
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata = {
  title: 'SPAERS — When Every Second Counts',
  description:
    'Smart Panic Alert & Emergency Response System. One press. Immediate action. Total peace of mind.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-ice font-sans text-ink antialiased">
        <ScrollToTop />
        <AuthProvider>
          <ToastProvider>
            <AppChrome>{children}</AppChrome>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

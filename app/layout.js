import './globals.css'

export const metadata = {
  title: 'Augiva — Le opportunità vengono a te',
  description: 'Matching automatico tra la tua azienda e gare d\'appalto, fondi e agevolazioni.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ minHeight: '100vh', background: '#F5F5F7' }}>
        {children}
      </body>
    </html>
  )
}

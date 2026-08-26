import "./globals.css";

export const metadata = {
  title: "CineMatch",
  description: "Rate movies and TV shows, get an AI-built taste profile, and get recommendations you'll actually like.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

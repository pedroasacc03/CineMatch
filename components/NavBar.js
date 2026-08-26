"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/ratings", label: "Ratings" },
  { href: "/watched", label: "Watched" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/preferences", label: "My Preferences" },
  { href: "/chat", label: "Chat" },
];

export default function NavBar({ activePath }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="navbar">
      <span className="brand">CineMatch</span>
      <nav>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={activePath === link.href ? "active" : ""}>
            {link.label}
          </Link>
        ))}
        <Link href="/privacy" style={{ fontSize: 12, opacity: 0.7 }}>
          Privacy
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <button type="submit">Log out</button>
        </form>
      </nav>
    </div>
  );
}

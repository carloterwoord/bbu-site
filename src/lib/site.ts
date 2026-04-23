export type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

export const siteTitle = "Built by Underdogs";

export const navGroups: NavItem[][] = [
  [
    { label: "Home", href: "/index.html", icon: "home" },
    { label: "Membership", href: "/page.html", icon: "membership" },
    { label: "Category", href: "/category.html", icon: "category" },
    { label: "Behind the Scenes", href: "/results.html?topic=behind-the-scenes", icon: "behind" },
    { label: "Underdog Principles", href: "/category/underdog-principles.html", icon: "principles" },
    { label: "Tech & Tools", href: "/results.html?topic=tech-and-tools", icon: "tools" },
  ],
  [
    { label: "Find your Voice", href: "/results.html?topic=find-your-voice", icon: "voice" },
    { label: "The Business of Making", href: "/category/the-business-of-making.html", icon: "business" },
  ],
  [
    { label: "Search stuff", href: "/search.html", icon: "search" },
    { label: "About", href: "/page.html", icon: "about" },
  ],
];

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

export const siteTitle = "Built by Underdogs";

export const navGroups: NavItem[][] = [
  [
    { label: "Home", href: "/", icon: "home" },
    { label: "Membership", href: "/page", icon: "membership" },
    { label: "Category", href: "/category", icon: "category" },
    { label: "Behind the Scenes", href: "/results?topic=behind-the-scenes", icon: "behind" },
    { label: "Underdog Principles", href: "/category/underdog-principles", icon: "principles" },
    { label: "Tech & Tools", href: "/results?topic=tech-and-tools", icon: "tools" },
  ],
  [
    { label: "Find your Voice", href: "/results?topic=find-your-voice", icon: "voice" },
    { label: "The Business of Making", href: "/category/the-business-of-making", icon: "business" },
  ],
  [
    { label: "Search stuff", href: "/search", icon: "search" },
    { label: "About", href: "/page", icon: "about" },
  ],
];

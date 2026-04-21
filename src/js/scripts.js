(() => {
    const THEME_KEY = "bbu-theme";
    const THEME_DARK = "dark";
    const THEME_LIGHT = "light";
    const TOGGLE_SELECTOR = "[data-theme-toggle]";
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const getStoredTheme = () => {
        try {
            const stored = window.localStorage.getItem(THEME_KEY);
            return stored === THEME_DARK || stored === THEME_LIGHT
                ? stored
                : null;
        } catch {
            return null;
        }
    };

    const saveTheme = (theme) => {
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch {
            /* Ignore storage restrictions */
        }
    };

    const getPreferredTheme = () =>
        getStoredTheme() || (mediaQuery.matches ? THEME_DARK : THEME_LIGHT);

    const updateToggleState = (theme) => {
        const nextTheme =
            theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        const label =
            nextTheme === THEME_DARK
                ? "Switch to dark mode"
                : "Switch to light mode";
        const tooltip = nextTheme === THEME_DARK ? "Dark" : "Light";

        document.querySelectorAll(TOGGLE_SELECTOR).forEach((button) => {
            button.setAttribute("aria-label", label);
            button.setAttribute("title", tooltip);
            button.setAttribute("data-tooltip", tooltip);
            button.setAttribute(
                "aria-pressed",
                theme === THEME_DARK ? "true" : "false"
            );
        });
    };

    const applyTheme = (theme) => {
        root.setAttribute("data-theme", theme);
        updateToggleState(theme);
    };

    applyTheme(getPreferredTheme());

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(TOGGLE_SELECTOR).forEach((button) => {
            button.addEventListener("click", () => {
                const currentTheme =
                    root.getAttribute("data-theme") === THEME_DARK
                        ? THEME_DARK
                        : THEME_LIGHT;
                const nextTheme =
                    currentTheme === THEME_DARK
                        ? THEME_LIGHT
                        : THEME_DARK;

                saveTheme(nextTheme);
                applyTheme(nextTheme);
            });
        });

        const storedTheme = getStoredTheme();
        if (!storedTheme) {
            const syncThemeWithSystem = (event) => {
                applyTheme(event.matches ? THEME_DARK : THEME_LIGHT);
            };

            if (typeof mediaQuery.addEventListener === "function") {
                mediaQuery.addEventListener("change", syncThemeWithSystem);
            } else if (typeof mediaQuery.addListener === "function") {
                mediaQuery.addListener(syncThemeWithSystem);
            }
        }

        updateToggleState(
            root.getAttribute("data-theme") || THEME_LIGHT
        );
    });
})();

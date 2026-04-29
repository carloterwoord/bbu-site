(() => {
    const THEME_KEY = "bbu-theme";
    const THEME_DARK = "dark";
    const THEME_LIGHT = "light";
    const TOGGLE_SELECTOR = "[data-theme-toggle]";
    const DESKTOP_NAV_TOGGLE_SELECTOR = ".theme-toggle--desktop-nav-item";
    const THEME_INIT_FLAG = "__bbuThemeInitialized";
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    let activeTooltipToggle = null;

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
            const isMobileToggle = button.classList.contains(
                "theme-toggle--mobile"
            );
            const isDesktopNavToggle = button.classList.contains(
                "theme-toggle--desktop-nav-item"
            );
            button.setAttribute("aria-label", label);
            if (isMobileToggle) {
                button.removeAttribute("title");
                button.removeAttribute("data-tooltip");
            } else if (isDesktopNavToggle) {
                button.removeAttribute("title");
                button.setAttribute("data-tooltip", tooltip);
            } else {
                button.setAttribute("title", tooltip);
                button.setAttribute("data-tooltip", tooltip);
            }
            button.setAttribute(
                "aria-pressed",
                theme === THEME_DARK ? "true" : "false"
            );
        });

        if (activeTooltipToggle) {
            showThemeTooltip(activeTooltipToggle);
        }
    };

    const getThemeTooltip = () => {
        let tooltip = document.querySelector("[data-theme-tooltip]");
        if (tooltip) return tooltip;

        tooltip = document.createElement("div");
        tooltip.className = "theme-tooltip";
        tooltip.setAttribute("data-theme-tooltip", "");
        tooltip.setAttribute("role", "tooltip");
        document.body.append(tooltip);
        return tooltip;
    };

    const getCssLength = (value) => {
        const trimmed = value.trim();
        const numericValue = Number.parseFloat(trimmed);
        if (!Number.isFinite(numericValue)) return 0;
        if (trimmed.endsWith("rem")) {
            const rootFontSize = Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize
            );
            return numericValue * rootFontSize;
        }
        return numericValue;
    };

    const getThemeNavTooltipOffset = () => {
        const value = getComputedStyle(root)
            .getPropertyValue("--theme-nav-tooltip-inline-offset");
        return getCssLength(value);
    };

    const showThemeTooltip = (toggle) => {
        const label = toggle.getAttribute("data-tooltip");
        if (!label) return;

        const tooltip = getThemeTooltip();
        tooltip.textContent = label;
        tooltip.classList.add("theme-tooltip--visible");

        const rect = toggle.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const offset = getThemeNavTooltipOffset();
        tooltip.style.left = `${rect.left - tooltipRect.width - offset}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        activeTooltipToggle = toggle;
    };

    const hideThemeTooltip = () => {
        const tooltip = document.querySelector("[data-theme-tooltip]");
        if (tooltip) {
            tooltip.classList.remove("theme-tooltip--visible");
        }
        activeTooltipToggle = null;
    };

    const onThemeTooltipShow = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const toggle = target.closest(DESKTOP_NAV_TOGGLE_SELECTOR);
        if (!toggle) return;
        showThemeTooltip(toggle);
    };

    const onThemeTooltipHide = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        if (!target.closest(DESKTOP_NAV_TOGGLE_SELECTOR)) return;
        hideThemeTooltip();
    };

    const applyTheme = (theme) => {
        root.setAttribute("data-theme", theme);
        updateToggleState(theme);
    };

    const syncThemeFromPreference = () => {
        applyTheme(getPreferredTheme());
    };

    const onThemeToggleClick = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const toggle = target.closest(TOGGLE_SELECTOR);
        if (!toggle) return;

        const currentTheme =
            root.getAttribute("data-theme") === THEME_DARK
                ? THEME_DARK
                : THEME_LIGHT;
        const nextTheme =
            currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;

        saveTheme(nextTheme);
        applyTheme(nextTheme);
    };

    const syncThemeWithSystem = (event) => {
        if (getStoredTheme()) return;
        applyTheme(event.matches ? THEME_DARK : THEME_LIGHT);
    };

    syncThemeFromPreference();

    if (!window[THEME_INIT_FLAG]) {
        document.addEventListener("click", onThemeToggleClick);
        document.addEventListener("mouseover", onThemeTooltipShow);
        document.addEventListener("focusin", onThemeTooltipShow);
        document.addEventListener("mouseout", onThemeTooltipHide);
        document.addEventListener("focusout", onThemeTooltipHide);
        window.addEventListener("resize", hideThemeTooltip);
        window.addEventListener("scroll", hideThemeTooltip, true);
        document.addEventListener("astro:page-load", syncThemeFromPreference);
        document.addEventListener("astro:after-swap", syncThemeFromPreference);

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", syncThemeWithSystem);
        } else if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(syncThemeWithSystem);
        }

        window[THEME_INIT_FLAG] = true;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncThemeFromPreference, {
            once: true,
        });
    } else {
        syncThemeFromPreference();
    }
})();

(() => {
    const SEARCH_RESULTS_INIT_FLAG = "__bbuSearchResultsInitialized";

    const normalize = (value) =>
        value
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "");

    const slugify = (value) =>
        normalize(value)
            .trim()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const getPageUrl = (page) => {
        const nextParams = new URLSearchParams(window.location.search);
        if (page <= 1) {
            nextParams.delete("page");
        } else {
            nextParams.set("page", String(page));
        }

        const queryString = nextParams.toString();
        return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    };

    const createPaginationButton = (
        page,
        label,
        className,
        disabled = false
    ) => {
        const element = document.createElement(disabled ? "span" : "a");
        element.className = `pagination__button ${className}${
            disabled ? " pagination__button--disabled" : ""
        }`;

        if (disabled) {
            element.setAttribute("aria-disabled", "true");
        } else {
            element.setAttribute("href", getPageUrl(page));
        }

        element.append(label);
        return element;
    };

    const createResultItem = (item) => {
        const wrapper = document.createElement("div");
        wrapper.className = "search__results__item";

        const article = document.createElement("article");
        article.className = "article space-top--3xl space-bottom--3xl";

        const header = document.createElement("header");
        header.className = "article__headline";

        const meta = document.createElement("div");

        const time = document.createElement("time");
        time.setAttribute("datetime", item.dateISO || "");
        if (item.dateHref) {
            const dateLink = document.createElement("a");
            dateLink.href = item.dateHref;
            dateLink.textContent = item.dateLabel || "";
            time.append(dateLink);
        } else {
            time.textContent = item.dateLabel || "";
        }

        const divider = document.createElement("span");
        divider.textContent = "\u2022";

        const category = document.createElement("p");
        const categoryLink = document.createElement("a");
        categoryLink.href = item.categoryHref || "#";
        categoryLink.textContent = item.categoryLabel || "";
        category.append(categoryLink);

        meta.append(time, divider, category);

        const headline = document.createElement("div");
        headline.className = "article__headline__link";
        const headlineLink = document.createElement("a");
        headlineLink.href = item.href || "#";
        const heading = document.createElement("h2");
        heading.textContent = item.title || "";
        headlineLink.append(heading);
        headline.append(headlineLink);

        header.append(meta, headline);

        if (item.coverImage) {
            const coverWrapper = document.createElement("div");
            coverWrapper.className = "article__cover-wrapper";
            const cover = document.createElement("div");
            cover.className = "article__cover";
            const image = document.createElement("img");
            image.src = item.coverImage;
            image.alt =
                (item.coverImageAlt || "").trim() ||
                `Featured image for ${item.title || "this post"}`;
            image.loading = "lazy";
            cover.append(image);
            coverWrapper.append(cover);
            header.append(coverWrapper);
        }

        article.append(header);

        if (item.previewHtml) {
            const preview = document.createElement("div");
            preview.className =
                "article__content article__content-preview space-top--base";
            preview.innerHTML = item.previewHtml;
            article.append(preview);
        }

        const keepReading = document.createElement("div");
        keepReading.className = "article__keep-reading";
        const keepReadingLink = document.createElement("a");
        keepReadingLink.href = item.href || "#";
        keepReadingLink.className =
            "text-sm font-semibold underline text-gray-800 hover:text-black";
        keepReadingLink.textContent = "Keep reading";
        keepReading.append(keepReadingLink);
        article.append(keepReading);

        wrapper.append(article);
        return wrapper;
    };

    const initSearchResults = () => {
        const dataSource = document.querySelector(
            "[data-search-results-data]"
        );
        if (!dataSource) return;

        document.querySelector("[data-search-results]")?.remove();

        const params = new URLSearchParams(window.location.search);
        const query = (params.get("q") || "").trim();
        const tag = slugify(params.get("tag") || "");
        const author = slugify(params.get("author") || "");
        const year = (params.get("year") || "").trim();
        const month = (params.get("month") || "").trim();
        const terms = normalize(query).split(/\s+/).filter(Boolean);
        const hasQuery = query.length > 0;
        const hasActiveFilter =
            hasQuery || Boolean(tag || author || year || month);

        const title = document.querySelector("[data-results-title]");
        const summary = document.querySelector("[data-results-summary]");
        const empty = document.querySelector("[data-search-empty]");
        const input = document.querySelector('.search-form input[name="q"]');
        const paginationDivider = document.querySelector(
            "[data-results-pagination-divider]"
        );
        const paginationContainer = document.querySelector(
            "[data-results-pagination]"
        );
        let items = [];
        try {
            items = JSON.parse(dataSource?.textContent || "[]");
        } catch {
            items = [];
        }
        const pageSize = Math.max(
            1,
            Number(dataSource.dataset.pageSize || 6) || 6
        );
        const requestedPage = Math.max(
            1,
            Math.floor(Number(params.get("page")) || 1)
        );

        if (input instanceof HTMLInputElement) {
            input.value = query;
        }

        const label =
            query ||
            (tag ? tag.replace(/-/g, " ") : "") ||
            (author ? author.replace(/-/g, " ") : "") ||
            month ||
            year;

        if (title) {
            title.textContent = label ? `Results for: ${label}` : "Results";
        }

        let matches = 0;
        const visibleItems = [];

        for (const item of items) {
            const searchText = normalize(String(item.searchText || ""));
            const tags = String(item.tagSlugs || "")
                .split(/\s+/)
                .filter(Boolean);
            const itemAuthor = item.authorSlug || "";
            const itemYear = item.year || "";
            const itemMonth = item.month || "";

            const matchesQuery =
                !hasQuery ||
                terms.every((term) => searchText.includes(term));
            const matchesTag = !tag || tags.includes(tag);
            const matchesAuthor = !author || itemAuthor === author;
            const matchesYear = !year || itemYear === year;
            const matchesMonth = !month || itemMonth === month;
            const isMatch =
                hasActiveFilter &&
                matchesQuery &&
                matchesTag &&
                matchesAuthor &&
                matchesYear &&
                matchesMonth;

            if (isMatch) {
                matches += 1;
                visibleItems.push(item);
            }
        }

        const totalPages = Math.ceil(visibleItems.length / pageSize);
        const currentPage =
            totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
        const pageStart = (currentPage - 1) * pageSize;
        const pagedItems = visibleItems.slice(pageStart, pageStart + pageSize);

        if (pagedItems.length > 0) {
            const resultsContainer = document.createElement("div");
            resultsContainer.className = "search__results__container";
            resultsContainer.setAttribute("data-search-results", "");
            resultsContainer.replaceChildren(
                ...pagedItems.map(createResultItem)
            );
            dataSource.insertAdjacentElement("beforebegin", resultsContainer);
        }

        if (summary) {
            if (matches === 0) {
                summary.textContent = "No posts found.";
            } else if (matches === 1) {
                summary.textContent = "1 post found.";
            } else if (totalPages > 1) {
                const pageEnd = pageStart + pagedItems.length;
                summary.textContent = `Showing ${
                    pageStart + 1
                }-${pageEnd} of ${matches} posts.`;
            } else if (label) {
                summary.textContent = `${matches} posts found.`;
            } else {
                summary.textContent = `Showing ${matches} posts.`;
            }
        }

        if (empty) {
            empty.textContent = hasActiveFilter
                ? "No posts matched this search."
                : "Enter a search query to see results.";
            empty.hidden = matches !== 0;
        }

        if (!paginationContainer) return;

        paginationContainer.replaceChildren();
        paginationContainer.hidden = totalPages <= 1;
        if (paginationDivider) paginationDivider.hidden = totalPages <= 1;

        if (totalPages <= 1) return;

        const inner = document.createElement("div");
        inner.className = "page__pagination";

        const nav = document.createElement("nav");
        nav.className = "pagination";
        nav.setAttribute("aria-label", "Results pagination");

        const previousLabel = document.createDocumentFragment();
        previousLabel.append("\u2190 ");
        const previousText = document.createElement("span");
        previousText.className = "pagination__button__text";
        previousText.textContent = "Previous";
        previousLabel.append(previousText);

        nav.append(
            createPaginationButton(
                currentPage - 1,
                previousLabel,
                "pagination__button--prev",
                currentPage === 1
            )
        );

        const list = document.createElement("ul");
        list.className = "pagination__list";

        for (let page = 1; page <= totalPages; page += 1) {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.href = getPageUrl(page);
            link.className = `pagination__link${
                page === currentPage ? " pagination__link--active" : ""
            }`;
            if (page === currentPage) {
                link.setAttribute("aria-current", "page");
            }
            link.textContent = String(page);
            listItem.append(link);
            list.append(listItem);
        }

        nav.append(list);

        const nextLabel = document.createDocumentFragment();
        const nextText = document.createElement("span");
        nextText.className = "pagination__button__text";
        nextText.textContent = "Next";
        nextLabel.append(nextText, " \u2192");

        nav.append(
            createPaginationButton(
                currentPage + 1,
                nextLabel,
                "pagination__button--next",
                currentPage === totalPages
            )
        );

        inner.append(nav);
        paginationContainer.append(inner);
    };

    if (!window[SEARCH_RESULTS_INIT_FLAG]) {
        document.addEventListener("astro:page-load", initSearchResults);
        document.addEventListener("astro:after-swap", initSearchResults);
        window[SEARCH_RESULTS_INIT_FLAG] = true;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSearchResults, {
            once: true,
        });
    } else {
        initSearchResults();
    }
})();

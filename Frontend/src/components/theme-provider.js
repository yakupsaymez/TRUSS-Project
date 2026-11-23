import { createContext, useContext, useEffect, useState } from 'react';

const ThemeProviderContext = createContext(undefined);

function resolveActiveTheme(themeValue) {
    if (themeValue === 'dark' || themeValue === 'light') {
        return themeValue;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme' }) {
    const [theme, setThemeState] = useState(
        () => localStorage.getItem(storageKey) || defaultTheme
    );

    useEffect(() => {
        const root = window.document.documentElement;
        const applyResolvedTheme = (resolved) => {
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            root.setAttribute('data-theme', resolved);
            root.style.colorScheme = resolved;
        };

        applyResolvedTheme(resolveActiveTheme(theme));

        if (theme !== 'system' || typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (event) => {
            applyResolvedTheme(event.matches ? 'dark' : 'light');
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
            return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
        }

        mediaQuery.addListener(handleSystemThemeChange);
        return () => mediaQuery.removeListener(handleSystemThemeChange);
    }, [theme]);

    const setTheme = (newTheme) => {
        localStorage.setItem(storageKey, newTheme);
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        const currentResolved = resolveActiveTheme(theme);
        setTheme(currentResolved === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

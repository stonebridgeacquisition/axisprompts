import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

const ThemeToggle = () => {
    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'system'
    );

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (targetTheme) => {
            root.classList.remove('dark');

            if (targetTheme === 'dark') {
                root.classList.add('dark');
            } else if (targetTheme === 'system') {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    root.classList.add('dark');
                }
            }
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
            if (theme === 'system') {
                applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }, [theme]);

    return (
        <div className="flex p-1 bg-gray-100 dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
            {[
                { name: 'light', icon: Sun },
                { name: 'system', icon: Monitor },
                { name: 'dark', icon: Moon },
            ].map(({ name, icon: Icon }) => (
                <button
                    key={name}
                    onClick={() => setTheme(name)}
                    className={`
                        p-1.5 rounded-md transition-all duration-200
                        ${theme === name
                            ? 'bg-white dark:bg-dark-600 text-brand-600 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                        }
                    `}
                    title={`Switch to ${name} mode`}
                >
                    <Icon size={14} />
                </button>
            ))}
        </div>
    );
};

export default ThemeToggle;

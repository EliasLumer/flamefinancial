'use client';

/* eslint-disable @next/next/no-img-element */
export function BmcButton() {
    return (
        <a 
            href="https://www.buymeacoffee.com/FlameFinancial" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block transition-transform hover:scale-105 active:scale-95"
        >
            <img 
                src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" 
                alt="Buy Me A Coffee" 
                style={{ height: '40px', width: 'auto' }} 
            />
        </a>
    );
}

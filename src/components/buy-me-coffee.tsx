'use client';

import { useEffect } from 'react';

export default function BuyMeACoffee() {
    useEffect(() => {
        const script = document.createElement('script');
        const div = document.getElementById('supportByBMC');
        
        script.setAttribute('data-name', 'BMC-Widget');
        script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
        script.setAttribute('data-id', 'FlameFinancial');
        script.setAttribute('data-description', 'Support me on Buy me a coffee!');
        script.setAttribute('data-message', '');
        script.setAttribute('data-color', '#ED7113');
        script.setAttribute('data-position', 'Right');
        script.setAttribute('data-x_margin', '18');
        script.setAttribute('data-y_margin', '70');
        script.async = true;
        
        // Append to head instead of div to ensure it loads properly
        document.head.appendChild(script);
        
        script.onload = function () {
            const evt = document.createEvent('Event');
            evt.initEvent('DOMContentLoaded', false, false);
            window.dispatchEvent(evt);
        };

        return () => {
            // Cleanup on unmount
            const widget = document.getElementById('bmc-wbtn');
            if (widget) {
                widget.remove();
            }
            const iframe = document.querySelector('iframe[title="Buy Me a Coffee"]');
            if (iframe) {
                iframe.remove();
            }
        };
    }, []);

    return <div id="supportByBMC" />;
}

import React from 'react';
import './WhopPackages.css';

import whopProducts from '../data/whop_products.json';

/**
 * [RCA TRACE]
 * Epic: Sovereign Infrastructure Monetization
 * Bounded Context: Maps Gen-UI Phase Gates natively to the Whop subscription tiers.
 * Truth in Marketing: Front-end prices are physically derived from Whop API and converted to per-hour rates.
 */
export const WhopPackages: React.FC = () => {

    const domain = window.location.hostname;
    
    interface WhopProduct {
        productId: string;
        productName: string;
        planId: string;
        price: string;
        billingPeriod: number | string;
        checkoutUrl: string;
        planName?: string;
    }

    const getPriceDetails = (product: WhopProduct) => {
        if (!product || product.price === 'Free' || product.price === '$0') {
            return { hourly: 'Free', total: 'Free' };
        }
        
        if (product.billingPeriod === 'One-time') {
            return {
                hourly: 'Lifetime Access',
                total: `${product.price} One-time Fee`
            };
        }

        const priceNum = parseFloat(product.price.replace('$', ''));
        let hours = 1;
        let periodStr = '';
        
        if (product.billingPeriod === 30) {
            hours = 720;
            periodStr = '/mo';
        } else if (product.billingPeriod === 365) {
            hours = 8760;
            periodStr = '/yr';
        }
        
        const hourlyRate = (priceNum / hours).toFixed(5);
        return {
            hourly: `$${hourlyRate}/hr`,
            total: `${product.price}${periodStr}`
        };
    };

    // Filter products from Whop physical payload that match the current domain
    let activeProducts = (whopProducts as WhopProduct[]).filter(p => domain.toLowerCase().includes(p.productName.toLowerCase()));

    // Fallback if no specific products are mapped yet
    if (activeProducts.length === 0) {
        activeProducts = (whopProducts as WhopProduct[]).filter(p => p.productName.includes("API Access") || p.productName.includes("Business"));
    }

    const packages = activeProducts.map((prod, idx) => {
        const details = getPriceDetails(prod);
        const isFree = prod.price === 'Free' || prod.price === '$0';
        
        let customFeatures: string[];
        if (isFree) {
            customFeatures = [
                '✅ Core Sovereign Platform Access',
                '❌ 0 SMS Outreach Credits (Paid Only)',
                '❌ 0 AI Voice Actions (Paid Only)',
                '✅ Standard Internal Workflows',
                'ℹ️ Upgrade for Telemetry & Outreach'
            ];
        } else if (idx === 1) {
            customFeatures = [
                '✅ Adaptive Gen-UI Interface Controls',
                '✅ 1,000 SMS Outreach Credits/mo',
                '✅ 500 AI Voice Action Minutes/mo',
                '✅ High-Speed Edge Campaign Automation',
                'ℹ️ Overage: $0.15/SMS | $0.25/Voice Min',
                '📈 Rates include Core Infrastructure, Affiliate Layers & Compensation Multipliers'
            ];
        } else {
             customFeatures = [
                '✅ Unlimited Platform & Edge Access',
                '✅ Enterprise Omnichannel Volume',
                '✅ Dedicated Priority AI Voice Models',
                '✅ Sub-second Automation SLAs',
                'ℹ️ Custom Volume Pricing Available',
                '📈 Rates include Housing, Business Margins & Autonomous Agent Compensations'
            ];
        }

        return {
            id: prod.planId,
            title: prod.planName || prod.productName,
            priceDetails: details,
            desc: isFree ? `Begin your journey with ${prod.productName}` : `Expand your network velocity with ${prod.productName}`,
            features: customFeatures,
            btn: isFree ? 'Start Free' : 'Activate Node',
            url: prod.checkoutUrl,
            recommended: idx === 1
        };
    });

    return (
        <div className="whop-container">
            <h2 className="whop-title">Network Packages</h2>
            <p className="whop-subtitle">Optimize your presence. Turn clicks into measurable growth.</p>
            
            <div className="whop-grid">
                {packages.map(pkg => (
                    <div key={pkg.id} className={`whop-card ${pkg.recommended ? 'whop-card-recommended' : ''}`}>
                        {pkg.recommended && <div className="whop-recommended-badge">RECOMMENDED</div>}
                        <h3 className={`whop-card-title-seat`}>{pkg.title}</h3>
                        <p className="whop-price">{pkg.priceDetails.hourly}</p>
                        {pkg.priceDetails.hourly !== 'Free' && (
                            <p className="whop-price-total">Billed as {pkg.priceDetails.total}</p>
                        )}
                        <p className="whop-desc">{pkg.desc}</p>
                        <ul className="whop-list">
                            {pkg.features.map((feat, idx) => (
                                <li key={idx}>{feat}</li>
                            ))}
                        </ul>
                        <button className={`whop-btn whop-btn-seat`} onClick={() => window.location.href = pkg.url}>
                            {pkg.btn}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

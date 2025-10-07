// Portfolio data storage
let portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
let priceCache = {};

// Crypto metadata
const cryptoMetadata = {
    'bitcoin': { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    'ethereum': { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
    'binancecoin': { symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
    'solana': { symbol: 'SOL', name: 'Solana', color: '#00FFA3' },
    'cardano': { symbol: 'ADA', name: 'Cardano', color: '#0033AD' },
    'ripple': { symbol: 'XRP', name: 'XRP', color: '#23292F' },
    'polkadot': { symbol: 'DOT', name: 'Polkadot', color: '#E6007A' },
    'dogecoin': { symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
    'avalanche-2': { symbol: 'AVAX', name: 'Avalanche', color: '#E84142' },
    'matic-network': { symbol: 'MATIC', name: 'Polygon', color: '#8247E5' }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolio();
    fetchPrices();
    fetchMarketOverview();
    
    // Auto-refresh prices every 60 seconds
    setInterval(() => {
        fetchPrices();
        fetchMarketOverview();
    }, 60000);
});

// Add cryptocurrency to portfolio
function addCrypto() {
    const cryptoSelect = document.getElementById('cryptoSelect');
    const amountInput = document.getElementById('amountInput');
    const buyPriceInput = document.getElementById('buyPriceInput');
    
    const cryptoId = cryptoSelect.value;
    const amount = parseFloat(amountInput.value);
    const buyPrice = parseFloat(buyPriceInput.value) || 0;
    
    if (!cryptoId || !amount || amount <= 0) {
        showNotification('Please select a cryptocurrency and enter a valid amount', 'error');
        return;
    }
    
    // Check if crypto already exists in portfolio
    const existingIndex = portfolio.findIndex(item => item.id === cryptoId);
    
    if (existingIndex !== -1) {
        // Update existing entry
        portfolio[existingIndex].amount += amount;
        if (buyPrice > 0) {
            // Calculate weighted average buy price
            const totalValue = (portfolio[existingIndex].buyPrice * portfolio[existingIndex].originalAmount) + (buyPrice * amount);
            portfolio[existingIndex].originalAmount += amount;
            portfolio[existingIndex].buyPrice = totalValue / portfolio[existingIndex].originalAmount;
        }
    } else {
        // Add new entry
        portfolio.push({
            id: cryptoId,
            amount: amount,
            buyPrice: buyPrice,
            originalAmount: amount,
            addedAt: new Date().toISOString()
        });
    }
    
    // Save to localStorage
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    
    // Reset inputs
    cryptoSelect.value = '';
    amountInput.value = '';
    buyPriceInput.value = '';
    
    // Reload portfolio
    loadPortfolio();
    fetchPrices();
    
    showNotification('Cryptocurrency added successfully!', 'success');
}

// Remove cryptocurrency from portfolio
function removeCrypto(cryptoId) {
    if (confirm('Are you sure you want to remove this asset from your portfolio?')) {
        portfolio = portfolio.filter(item => item.id !== cryptoId);
        localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
        loadPortfolio();
        fetchPrices();
        showNotification('Asset removed from portfolio', 'info');
    }
}

// Load portfolio from localStorage
function loadPortfolio() {
    const tbody = document.getElementById('portfolioTable');
    
    if (portfolio.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-400">
                    No assets in portfolio. Add some cryptocurrencies to get started!
                </td>
            </tr>
        `;
        document.getElementById('totalValue').textContent = '$0.00';
        return;
    }
    
    tbody.innerHTML = '';
    portfolio.forEach(item => {
        const meta = cryptoMetadata[item.id];
        const row = document.createElement('tr');
        row.className = 'border-b border-white/10 hover:bg-white/5 transition-colors';
        row.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold">
                        ${meta.symbol}
                    </div>
                    <div>
                        <div class="font-semibold">${meta.name}</div>
                        <div class="text-xs text-gray-400">${meta.symbol}</div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4">${item.amount.toFixed(4)}</td>
            <td class="py-3 px-4" id="price-${item.id}">
                <div class="animate-pulse bg-white/10 h-5 w-20 rounded"></div>
            </td>
            <td class="py-3 px-4" id="change-${item.id}">
                <div class="animate-pulse bg-white/10 h-5 w-16 rounded"></div>
            </td>
            <td class="py-3 px-4" id="value-${item.id}">
                <div class="animate-pulse bg-white/10 h-5 w-20 rounded"></div>
            </td>
            <td class="py-3 px-4" id="pl-${item.id}">
                <div class="animate-pulse bg-white/10 h-5 w-20 rounded"></div>
            </td>
            <td class="py-3 px-4">
                <button onclick="removeCrypto('${item.id}')" class="text-red-400 hover:text-red-300 transition-colors">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Fetch current prices from CoinGecko API
async function fetchPrices() {
    if (portfolio.length === 0) return;
    
    const ids = portfolio.map(item => item.id).join(',');
    
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();
        
        let totalValue = 0;
        
        portfolio.forEach(item => {
            if (data[item.id]) {
                const price = data[item.id].usd;
                const change24h = data[item.id].usd_24h_change;
                const value = price * item.amount;
                
                priceCache[item.id] = { price, change24h };
                
                totalValue += value;
                
                // Update price cell
                const priceCell = document.getElementById(`price-${item.id}`);
                if (priceCell) {
                    priceCell.textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
                }
                
                // Update 24h change cell
                const changeCell = document.getElementById(`change-${item.id}`);
                if (changeCell) {
                    const changeClass = change24h >= 0 ? 'text-green-400' : 'text-red-400';
                    const changeIcon = change24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                    changeCell.innerHTML = `
                        <span class="${changeClass}">
                            <i class="fas ${changeIcon} text-xs mr-1"></i>
                            ${Math.abs(change24h).toFixed(2)}%
                        </span>
                    `;
                }
                
                // Update value cell
                const valueCell = document.getElementById(`value-${item.id}`);
                if (valueCell) {
                    valueCell.textContent = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                
                // Update P/L cell
                const plCell = document.getElementById(`pl-${item.id}`);
                if (plCell && item.buyPrice > 0) {
                    const pl = (price - item.buyPrice) * item.amount;
                    const plPercent = ((price - item.buyPrice) / item.buyPrice) * 100;
                    const plClass = pl >= 0 ? 'text-green-400' : 'text-red-400';
                    plCell.innerHTML = `
                        <span class="${plClass}">
                            ${pl >= 0 ? '+' : ''}$${Math.abs(pl).toFixed(2)}
                            <span class="text-xs">(${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%)</span>
                        </span>
                    `;
                } else if (plCell) {
                    plCell.innerHTML = '<span class="text-gray-400">-</span>';
                }
            }
        });
        
        // Update total portfolio value
        document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
    } catch (error) {
        console.error('Error fetching prices:', error);
        showNotification('Error fetching prices. Please try again later.', 'error');
    }
}

// Fetch market overview data
async function fetchMarketOverview() {
    const topCoins = ['bitcoin', 'ethereum', 'binancecoin'];
    
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${topCoins.join(',')}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`);
        const data = await response.json();
        
        const marketOverview = document.getElementById('marketOverview');
        marketOverview.innerHTML = '';
        
        topCoins.forEach(coinId => {
            if (data[coinId]) {
                const meta = cryptoMetadata[coinId];
                const price = data[coinId].usd;
                const marketCap = data[coinId].usd_market_cap;
                const change24h = data[coinId].usd_24h_change;
                
                const card = document.createElement('div');
                card.className = 'bg-white/5 rounded-lg p-4 border border-white/10';
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold">
                                ${meta.symbol}
                            </div>
                            <span class="font-semibold">${meta.name}</span>
                        </div>
                        <span class="${change24h >= 0 ? 'text-green-400' : 'text-red-400'} text-sm">
                            ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
                        </span>
                    </div>
                    <div class="text-2xl font-bold mb-1">
                        $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div class="text-xs text-gray-400">
                        Market Cap: $${(marketCap / 1e9).toFixed(2)}B
                    </div>
                `;
                marketOverview.appendChild(card);
            }
        });
        
    } catch (error) {
        console.error('Error fetching market overview:', error);
    }
}

// Refresh prices manually
function refreshPrices() {
    const refreshBtn = event.target.closest('button');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin mr-1"></i> Refreshing...';
    
    fetchPrices().then(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh Prices';
        showNotification('Prices updated successfully!', 'success');
    });
    
    fetchMarketOverview();
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('animate-fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fade-out {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
    
    .animate-fade-out {
        animation: fade-out 0.3s ease-out;
    }
`;
document.head.appendChild(style);

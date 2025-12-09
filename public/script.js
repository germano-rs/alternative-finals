// Configuração de atualização
const REFRESH_INTERVAL_SECONDS = 30;

// Estado global da aplicação
let globalData = [];
let globalHeaders = [];
let currentView = 'table';
let isAutoRefreshEnabled = true;
let refreshInterval = REFRESH_INTERVAL_SECONDS * 1000;
let lastUpdateTime = null;

// Função principal para carregar dados
async function loadData(showLoadingIndicator = true) {
    if (showLoadingIndicator) {
        showLoading(true);
    }
    updateStatus('loading');
    
    try {
        const response = await fetch('/api/data');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            const dataChanged = JSON.stringify(result.data) !== JSON.stringify(globalData);
            const isFirstLoad = globalData.length === 0;
            
            globalData = result.data;
            globalHeaders = result.headers;
            
            updateStatistics();
            renderData();
            
            if (dataChanged && !isFirstLoad) {
                showDataChangeNotification();
            }
            
            updateStatus('connected');
            showLoading(false);
            lastUpdateTime = new Date();
            
            if (showLoadingIndicator) {
                animateSuccess();
            }
        } else {
            showLoading(false);
            showEmpty();
            updateStatus('error');
        }
    } catch (error) {
        showLoading(false);
        showEmpty();
        updateStatus('error');
    }
}

// Função para mostrar notificação de mudança
function showDataChangeNotification() {
    const notification = document.createElement('div');
    notification.className = 'data-notification';
    notification.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span>Dados atualizados!</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    notification.querySelector('svg').style.cssText = 'width: 18px; height: 18px;';
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Função para auto-refresh inteligente
function setupAutoRefresh() {
    // Limpa intervalo anterior se existir
    if (window.autoRefreshTimer) {
        clearInterval(window.autoRefreshTimer);
    }
    
    // Configura novo intervalo
    window.autoRefreshTimer = setInterval(() => {
        if (isAutoRefreshEnabled && !document.hidden) {
            loadData(false); // Não mostra loading no auto-refresh
            updateRefreshIndicator();
        }
    }, refreshInterval);
    
    // Atualiza mais rápido quando a aba está ativa
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadData(false); // Atualiza ao voltar para a aba
        }
    });
}

// Indicador visual do próximo refresh
function updateRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator && lastUpdateTime) {
        const nextRefresh = new Date(lastUpdateTime.getTime() + refreshInterval);
        const now = new Date();
        const secondsUntilRefresh = Math.max(0, Math.floor((nextRefresh - now) / 1000));
        
        const minutes = Math.floor(secondsUntilRefresh / 60);
        const seconds = secondsUntilRefresh % 60;
        
        if (minutes > 0) {
            indicator.textContent = `Próxima atualização em ${minutes}m ${seconds}s`;
        } else {
            indicator.textContent = `Próxima atualização em ${seconds}s`;
        }
        
        const progressBar = document.getElementById('refreshProgress');
        if (progressBar) {
            const progress = ((refreshInterval - (secondsUntilRefresh * 1000)) / refreshInterval) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
}

// Função para mostrar/esconder loading
function showLoading(show) {
    const loadingContainer = document.getElementById('loadingContainer');
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    const emptyState = document.getElementById('emptyState');
    
    if (!loadingContainer) {
        return;
    }
    
    if (show) {
        loadingContainer.classList.remove('hidden');
        if (tableView) tableView.classList.add('hidden');
        if (cardsView) cardsView.classList.add('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    } else {
        loadingContainer.classList.add('hidden');
    }
}

// Função para mostrar estado vazio
function showEmpty() {
    const loadingContainer = document.getElementById('loadingContainer');
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingContainer) loadingContainer.classList.add('hidden');
    if (tableView) tableView.classList.add('hidden');
    if (cardsView) cardsView.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
}

// Função para atualizar estatísticas
function updateStatistics() {
    const totalRecordsEl = document.getElementById('totalRecords');
    const totalColumnsEl = document.getElementById('totalColumns');
    const lastUpdateEl = document.getElementById('lastUpdate');
    
    if (totalRecordsEl && globalData) {
        totalRecordsEl.textContent = globalData.length || 0;
    }
    if (totalColumnsEl && globalHeaders) {
        totalColumnsEl.textContent = globalHeaders.length || 0;
    }
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Função para atualizar status de conexão
function updateStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (!statusDot || !statusText) {
        return;
    }
    
    switch(status) {
        case 'connected':
            statusDot.style.background = 'var(--color-success)';
            statusText.textContent = 'Conectado';
            statusText.style.color = 'var(--color-success)';
            break;
        case 'loading':
            statusDot.style.background = 'var(--color-warning)';
            statusText.textContent = 'Atualizando...';
            statusText.style.color = 'var(--color-warning)';
            break;
        case 'error':
            statusDot.style.background = 'var(--color-error)';
            statusText.textContent = 'Erro';
            statusText.style.color = 'var(--color-error)';
            break;
    }
}

// Função para renderizar dados
function renderData() {
    if (!globalData || globalData.length === 0) {
        return;
    }
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase() : '';
    const filteredData = filterData(searchTerm);
    
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    const loadingContainer = document.getElementById('loadingContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingContainer) {
        loadingContainer.classList.add('hidden');
    }
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    if (currentView === 'table') {
        renderTable(filteredData);
        if (tableView) tableView.classList.remove('hidden');
        if (cardsView) cardsView.classList.add('hidden');
    } else {
        renderCards(filteredData);
        if (cardsView) cardsView.classList.remove('hidden');
        if (tableView) tableView.classList.add('hidden');
    }
}

// Função para filtrar dados
function filterData(searchTerm) {
    if (!globalData || globalData.length === 0) {
        return [];
    }
    
    if (!searchTerm) {
        return globalData;
    }
    
    return globalData.filter(row => {
        if (!row) {
            return false;
        }
        return Object.values(row).some(value => 
            value !== null && value !== undefined && String(value).toLowerCase().includes(searchTerm)
        );
    });
}

// Função para ordenar headers garantindo que "Placar ao Vivo" fique ao lado de "Placar"
function getOrderedHeaders() {
    if (!globalHeaders || globalHeaders.length === 0) {
        return [];
    }
    
    const orderedHeaders = [...globalHeaders];
    const placarIndex = orderedHeaders.findIndex(h => h && h.toLowerCase().includes('placar') && !h.toLowerCase().includes('vivo'));
    const placarVivoIndex = orderedHeaders.findIndex(h => h && h.toLowerCase().includes('placar') && h.toLowerCase().includes('vivo'));
    
    if (placarIndex !== -1 && placarVivoIndex !== -1 && placarVivoIndex !== placarIndex + 1) {
        const placarVivo = orderedHeaders[placarVivoIndex];
        orderedHeaders.splice(placarVivoIndex, 1);
        orderedHeaders.splice(placarIndex + 1, 0, placarVivo);
    }
    
    return orderedHeaders;
}

// Função para renderizar tabela
function renderTable(data) {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    if (!tableHeader || !tableBody || !globalHeaders || globalHeaders.length === 0) {
        return;
    }
    
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    const orderedHeaders = getOrderedHeaders();
    
    const headerRow = document.createElement('tr');
    orderedHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header || '';
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    
    if (data && data.length > 0) {
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.style.animationDelay = `${index * 0.02}s`;
            
            orderedHeaders.forEach(header => {
                const td = document.createElement('td');
                const cellValue = row && row[header] !== undefined ? String(row[header]) : '';
                
                const headerLower = header ? header.toLowerCase().trim() : '';
                const isPlacarVivo = headerLower.includes('placar') && headerLower.includes('vivo');
                const hasValue = cellValue && cellValue.trim() !== '' && cellValue.trim() !== '-';
                
                if (isPlacarVivo && hasValue) {
                    const cellContent = document.createElement('div');
                    cellContent.style.cssText = 'display: flex; align-items: center; gap: 10px; justify-content: flex-start;';
                    
                    const textSpan = document.createElement('span');
                    textSpan.textContent = cellValue;
                    textSpan.style.flex = '1';
                    
                    const liveIndicator = document.createElement('span');
                    liveIndicator.className = 'live-indicator';
                    liveIndicator.setAttribute('aria-label', 'Ao vivo');
                    liveIndicator.title = 'Jogo ao vivo';
                    
                    cellContent.appendChild(textSpan);
                    cellContent.appendChild(liveIndicator);
                    td.appendChild(cellContent);
                } else {
                    td.textContent = cellValue;
                }
                
                tr.appendChild(td);
            });
            
            tableBody.appendChild(tr);
        });
    }
}

// Função para renderizar cards
function renderCards(data) {
    const cardsContainer = document.getElementById('cardsContainer');
    
    if (!cardsContainer || !globalHeaders || globalHeaders.length === 0) {
        return;
    }
    
    cardsContainer.innerHTML = '';
    
    const orderedHeaders = getOrderedHeaders();
    
    if (data && data.length > 0) {
        data.forEach((row, index) => {
            const card = document.createElement('div');
            card.className = 'data-card';
            card.style.setProperty('--card-index', index);
            
            orderedHeaders.forEach(header => {
                const field = document.createElement('div');
                field.className = 'card-field';
                
                const label = document.createElement('div');
                label.className = 'card-label';
                label.textContent = header || '';
                
                const value = document.createElement('div');
                value.className = 'card-value';
                
                const headerLower = header ? header.toLowerCase().trim() : '';
                const isPlacarVivo = headerLower.includes('placar') && headerLower.includes('vivo');
                const cellValue = row && row[header] !== undefined ? String(row[header]) : '';
                const hasValue = cellValue && cellValue.trim() !== '' && cellValue.trim() !== '-';
                
                if (isPlacarVivo && hasValue) {
                    const valueContent = document.createElement('div');
                    valueContent.style.cssText = 'display: flex; align-items: center; gap: 10px; justify-content: flex-start;';
                    
                    const textSpan = document.createElement('span');
                    textSpan.textContent = cellValue;
                    textSpan.style.flex = '1';
                    
                    const liveIndicator = document.createElement('span');
                    liveIndicator.className = 'live-indicator';
                    liveIndicator.setAttribute('aria-label', 'Ao vivo');
                    liveIndicator.title = 'Jogo ao vivo';
                    
                    valueContent.appendChild(textSpan);
                    valueContent.appendChild(liveIndicator);
                    value.appendChild(valueContent);
                } else {
                    value.textContent = cellValue || '-';
                }
                
                field.appendChild(label);
                field.appendChild(value);
                card.appendChild(field);
            });
            
            cardsContainer.appendChild(card);
        });
    }
}

// Função para animação de sucesso
function animateSuccess() {
    const refreshIcon = document.querySelector('.refresh-icon');
    refreshIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        refreshIcon.style.transform = 'rotate(0deg)';
    }, 500);
}

// Função para exportar dados como JSON
function exportData() {
    const dataStr = JSON.stringify(globalData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dados_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Função para imprimir dados
function printData() {
    window.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    addRefreshControls();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderData();
            }, 300);
        });
    }
    
    const viewButtons = document.querySelectorAll('.view-btn');
    if (viewButtons.length > 0) {
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                renderData();
            });
        });
    }
    
    loadData();
    setupAutoRefresh();
    setInterval(updateRefreshIndicator, 1000);
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        // F5 ou Ctrl+R para refresh manual
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            loadData();
        }
        
        // Ctrl+E para exportar
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            exportData();
        }
    });
    
    // Adicionar efeito de parallax suave ao scroll
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.background-effect');
        if (parallax) {
            parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });
});

// Adiciona controles de refresh ao DOM
function addRefreshControls() {
    const controlsSection = document.querySelector('.controls-section');
    
    if (controlsSection && !document.getElementById('refreshControls')) {
        const initialMinutes = Math.floor(REFRESH_INTERVAL_SECONDS / 60);
        const initialSeconds = REFRESH_INTERVAL_SECONDS % 60;
        const initialText = initialMinutes > 0 
            ? `Próxima atualização em ${initialMinutes}m ${initialSeconds > 0 ? initialSeconds + 's' : ''}`.trim()
            : `Próxima atualização em ${initialSeconds}s`;
        
        const refreshControls = document.createElement('div');
        refreshControls.id = 'refreshControls';
        refreshControls.className = 'refresh-controls';
        refreshControls.innerHTML = `
            <div class="refresh-status">
                <div class="refresh-progress-bar">
                    <div id="refreshProgress" class="refresh-progress"></div>
                </div>
                <span id="refreshIndicator" class="refresh-text">${initialText}</span>
            </div>
        `;
        
        controlsSection.appendChild(refreshControls);
    }
}

// Adicionar animações CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .refresh-controls {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: rgba(39, 39, 42, 0.5);
        backdrop-filter: blur(10px);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        margin-top: 1rem;
    }
    
    .refresh-status {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .refresh-progress-bar {
        width: 100%;
        height: 4px;
        background: var(--color-border);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .refresh-progress {
        height: 100%;
        background: var(--gradient-primary);
        border-radius: 2px;
        transition: width 1s linear;
    }
    
    .refresh-text {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
    }
    
    .data-notification {
        animation-fill-mode: forwards;
    }
    
    .live-indicator {
        width: 12px;
        height: 12px;
        min-width: 12px;
        min-height: 12px;
        border-radius: 50%;
        background: #10b981;
        display: inline-block;
        animation: pulseLive 2s ease-in-out infinite;
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        flex-shrink: 0;
    }
    
    @keyframes pulseLive {
        0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        50% {
            opacity: 0.6;
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
        }
    }
`;
document.head.appendChild(style);
// Estado global da aplicação
let globalData = [];
let globalHeaders = [];
let currentView = 'table';
let isAutoRefreshEnabled = true;
let refreshInterval = 30000; // 30 segundos por padrão
let lastUpdateTime = null;

// Função principal para carregar dados
async function loadData(showLoadingIndicator = true) {
    if (showLoadingIndicator) {
        showLoading(true);
    }
    updateStatus('loading');
    
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            // Verifica se os dados mudaram
            const dataChanged = JSON.stringify(result.data) !== JSON.stringify(globalData);
            
            globalData = result.data;
            globalHeaders = result.headers;
            
            if (dataChanged) {
                updateStatistics();
                renderData();
                showDataChangeNotification();
            }
            
            updateStatus('connected');
            showLoading(false);
            lastUpdateTime = new Date();
            
            // Animação de sucesso
            if (showLoadingIndicator) {
                animateSuccess();
            }
        } else {
            showEmpty();
            updateStatus('error');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (showLoadingIndicator) {
            showEmpty();
        }
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
        
        indicator.textContent = `Próxima atualização em ${secondsUntilRefresh}s`;
        
        // Anima a barra de progresso
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
    
    if (show) {
        loadingContainer.classList.remove('hidden');
        tableView.classList.add('hidden');
        cardsView.classList.add('hidden');
        emptyState.classList.add('hidden');
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
    
    loadingContainer.classList.add('hidden');
    tableView.classList.add('hidden');
    cardsView.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

// Função para atualizar estatísticas
function updateStatistics() {
    document.getElementById('totalRecords').textContent = globalData.length;
    document.getElementById('totalColumns').textContent = globalHeaders.length;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Função para atualizar status de conexão
function updateStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredData = filterData(searchTerm);
    
    if (currentView === 'table') {
        renderTable(filteredData);
        document.getElementById('tableView').classList.remove('hidden');
        document.getElementById('cardsView').classList.add('hidden');
    } else {
        renderCards(filteredData);
        document.getElementById('cardsView').classList.remove('hidden');
        document.getElementById('tableView').classList.add('hidden');
    }
}

// Função para filtrar dados
function filterData(searchTerm) {
    if (!searchTerm) return globalData;
    
    return globalData.filter(row => {
        return Object.values(row).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        );
    });
}

// Função para renderizar tabela
function renderTable(data) {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // Limpar conteúdo anterior
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Criar cabeçalho
    const headerRow = document.createElement('tr');
    globalHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    
    // Criar linhas de dados
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.02}s`;
        
        globalHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
}

// Função para renderizar cards
function renderCards(data) {
    const cardsContainer = document.getElementById('cardsContainer');
    cardsContainer.innerHTML = '';
    
    data.forEach((row, index) => {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.style.setProperty('--card-index', index);
        
        globalHeaders.forEach(header => {
            const field = document.createElement('div');
            field.className = 'card-field';
            
            const label = document.createElement('div');
            label.className = 'card-label';
            label.textContent = header;
            
            const value = document.createElement('div');
            value.className = 'card-value';
            value.textContent = row[header] || '-';
            
            field.appendChild(label);
            field.appendChild(value);
            card.appendChild(field);
        });
        
        cardsContainer.appendChild(card);
    });
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

// Função para alterar intervalo de refresh
function changeRefreshInterval(seconds) {
    refreshInterval = seconds * 1000;
    setupAutoRefresh();
    
    // Salva preferência no localStorage
    localStorage.setItem('refreshInterval', refreshInterval);
    
    // Feedback visual
    const notification = document.createElement('div');
    notification.textContent = `Atualização automática: ${seconds}s`;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-primary);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Recupera preferências salvas
    const savedInterval = localStorage.getItem('refreshInterval');
    if (savedInterval) {
        refreshInterval = parseInt(savedInterval);
    }
    
    // Adiciona controles de refresh no HTML
    addRefreshControls();
    
    // Carregar dados ao iniciar
    loadData();
    
    // Configura auto-refresh
    setupAutoRefresh();
    
    // Atualiza indicador de refresh a cada segundo
    setInterval(updateRefreshIndicator, 1000);
    
    // Busca em tempo real
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderData();
        }, 300);
    });
    
    // Alternar visualizações
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderData();
        });
    });
    
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
        const refreshControls = document.createElement('div');
        refreshControls.id = 'refreshControls';
        refreshControls.className = 'refresh-controls';
        refreshControls.innerHTML = `
            <div class="refresh-options">
                <button class="refresh-option" onclick="changeRefreshInterval(10)" title="Muito Rápido">10s</button>
                <button class="refresh-option active" onclick="changeRefreshInterval(30)" title="Rápido">30s</button>
                <button class="refresh-option" onclick="changeRefreshInterval(60)" title="Normal">1m</button>
                <button class="refresh-option" onclick="changeRefreshInterval(300)" title="Lento">5m</button>
                <button class="refresh-option" onclick="toggleAutoRefresh()" title="Pausar/Retomar">
                    <svg id="pauseIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                </button>
            </div>
            <div class="refresh-status">
                <div class="refresh-progress-bar">
                    <div id="refreshProgress" class="refresh-progress"></div>
                </div>
                <span id="refreshIndicator" class="refresh-text">Próxima atualização em 30s</span>
            </div>
        `;
        
        controlsSection.appendChild(refreshControls);
    }
}

// Função para pausar/retomar auto-refresh
function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (isAutoRefreshEnabled) {
        pauseIcon.innerHTML = `
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
        `;
        setupAutoRefresh();
    } else {
        pauseIcon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"/>
        `;
        clearInterval(window.autoRefreshTimer);
        document.getElementById('refreshIndicator').textContent = 'Auto-refresh pausado';
        document.getElementById('refreshProgress').style.width = '0%';
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
        gap: 2rem;
        padding: 1rem;
        background: rgba(39, 39, 42, 0.5);
        backdrop-filter: blur(10px);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        margin-top: 1rem;
    }
    
    .refresh-options {
        display: flex;
        gap: 0.5rem;
    }
    
    .refresh-option {
        padding: 0.5rem 0.75rem;
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .refresh-option:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
    
    .refresh-option.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }
    
    .refresh-option svg {
        width: 16px;
        height: 16px;
    }
    
    .refresh-status {
        flex: 1;
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
`;
document.head.appendChild(style);
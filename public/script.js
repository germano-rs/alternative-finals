// Estado global da aplicação
let globalData = [];
let globalHeaders = [];
let currentView = 'table';

// Função principal para carregar dados
async function loadData() {
    showLoading(true);
    updateStatus('loading');
    
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            globalData = result.data;
            globalHeaders = result.headers;
            
            updateStatistics();
            renderData();
            updateStatus('connected');
            showLoading(false);
            
            // Animação de sucesso
            animateSuccess();
        } else {
            showEmpty();
            updateStatus('error');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showEmpty();
        updateStatus('error');
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
        minute: '2-digit'
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
            statusText.textContent = 'Carregando...';
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados ao iniciar
    loadData();
    
    // Auto-refresh a cada 5 minutos
    setInterval(loadData, 300000);
    
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
    
    // Adicionar feedback visual ao copiar
    document.addEventListener('copy', () => {
        const toast = document.createElement('div');
        toast.textContent = 'Copiado!';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--color-success);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    });
});

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
`;
document.head.appendChild(style);
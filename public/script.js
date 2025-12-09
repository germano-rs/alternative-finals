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

// Função para encontrar índice real na planilha
function findRealRowIndex(rowData) {
    if (!globalData || !rowData) {
        return -1;
    }
    
    for (let i = 0; i < globalData.length; i++) {
        const globalRow = globalData[i];
        let match = true;
        let hasMatch = false;
        
        for (const key in rowData) {
            if (rowData[key] && String(rowData[key]).trim() !== '') {
                hasMatch = true;
                const rowValue = String(rowData[key]).trim();
                const globalValue = globalRow[key] ? String(globalRow[key]).trim() : '';
                
                if (rowValue !== globalValue) {
                    match = false;
                    break;
                }
            }
        }
        
        if (match && hasMatch) {
            return i + 2;
        }
    }
    
    return -1;
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
            tr.style.cursor = 'pointer';
            tr.classList.add('table-row-clickable');
            tr.dataset.rowIndex = index;
            
            const originalRowData = data[index];
            
            tr.addEventListener('click', () => {
                const realRowIndex = findRealRowIndex(originalRowData);
                if (realRowIndex > 0) {
                    showAuthModalForEdit(originalRowData, realRowIndex);
                }
            });
            
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

// Função para mostrar modal de autenticação
function showAuthModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'authModalOverlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Autenticação</h2>
            <button class="modal-close" onclick="closeAuthModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="authPassword" class="form-label">Senha</label>
                <input type="password" id="authPassword" class="form-input" placeholder="Digite a senha" autocomplete="off">
                <span id="authError" class="form-error hidden"></span>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="closeAuthModal()">Cancelar</button>
            <button class="btn-primary" onclick="validateAuth()">Confirmar</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.classList.add('active');
        document.getElementById('authPassword').focus();
    }, 10);
    
    document.getElementById('authPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validateAuth();
        }
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeAuthModal();
        }
    });
}

// Função para fechar modal de autenticação
function closeAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Função para validar autenticação
function validateAuth() {
    const password = document.getElementById('authPassword').value;
    const errorSpan = document.getElementById('authError');
    const authCallback = window.pendingAuthCallback;
    
    if (password === '123456@') {
        closeAuthModal();
        if (authCallback) {
            setTimeout(() => {
                authCallback();
                window.pendingAuthCallback = null;
            }, 300);
        } else {
            setTimeout(() => {
                showAddGameModal();
            }, 300);
        }
    } else {
        errorSpan.textContent = 'Senha incorreta';
        errorSpan.classList.remove('hidden');
        document.getElementById('authPassword').value = '';
        document.getElementById('authPassword').focus();
    }
}

// Função para mostrar modal de autenticação para edição
function showAuthModalForEdit(rowData, rowIndex) {
    window.pendingAuthCallback = () => {
        showEditGameModal(rowData, rowIndex);
    };
    window.pendingRowIndex = rowIndex;
    showAuthModal();
}

// Função para mostrar modal de cadastro de jogo
function showAddGameModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'addGameModalOverlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-container modal-large';
    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Adicionar Novo Jogo</h2>
            <button class="modal-close" onclick="closeAddGameModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <form id="addGameForm" onsubmit="submitGame(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="fase" class="form-label">Fase *</label>
                        <select id="fase" class="form-select" required>
                            <option value="">Selecione a fase</option>
                            <option value="SEMIS">SEMIS</option>
                            <option value="FINAL">FINAL</option>
                            <option value="OITAVAS - Lado #1">OITAVAS - Lado #1</option>
                            <option value="OITAVAS - Lado #2">OITAVAS - Lado #2</option>
                            <option value="QUARTAS">QUARTAS</option>
                            <option value="PRELIMINAR">PRELIMINAR</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="jogo" class="form-label">Jogo *</label>
                        <input type="text" id="jogo" class="form-input" required placeholder="Ex: Jogo 1">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="confronto" class="form-label">Confronto *</label>
                    <input type="text" id="confronto" class="form-input" required placeholder="Ex: Time A vs Time B">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="data" class="form-label">Data *</label>
                        <input type="date" id="data" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="dia" class="form-label">Dia *</label>
                        <input type="text" id="dia" class="form-input" required placeholder="Ex: Segunda-feira">
                    </div>
                    
                    <div class="form-group">
                        <label for="horario" class="form-label">Horário *</label>
                        <input type="time" id="horario" class="form-input" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="quadra" class="form-label">Quadra *</label>
                    <select id="quadra" class="form-select" required>
                        <option value="">Selecione a quadra</option>
                        <option value="Saibro">Saibro</option>
                        <option value="AABB">AABB</option>
                        <option value="Jabuticabas">Jabuticabas</option>
                    </select>
                </div>
                
                <div id="formError" class="form-error hidden"></div>
                <div id="formSuccess" class="form-success hidden"></div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeAddGameModal()">Cancelar</button>
            <button type="submit" form="addGameForm" class="btn-primary" id="submitBtn">
                <span id="submitBtnText">Adicionar</span>
                <span id="submitBtnLoader" class="btn-loader hidden"></span>
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.classList.add('active');
        document.getElementById('fase').focus();
    }, 10);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeAddGameModal();
        }
    });
}

// Função para fechar modal de cadastro
function closeAddGameModal() {
    const overlay = document.getElementById('addGameModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Função para mostrar modal de edição de jogo
function showEditGameModal(rowData, rowIndex) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'editGameModalOverlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-container modal-large';
    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Editar Jogo</h2>
            <button class="modal-close" onclick="closeEditGameModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <form id="editGameForm" onsubmit="submitEditGame(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editFase" class="form-label">Fase *</label>
                        <select id="editFase" class="form-select" required>
                            <option value="">Selecione a fase</option>
                            <option value="SEMIS">SEMIS</option>
                            <option value="FINAL">FINAL</option>
                            <option value="OITAVAS - Lado #1">OITAVAS - Lado #1</option>
                            <option value="OITAVAS - Lado #2">OITAVAS - Lado #2</option>
                            <option value="QUARTAS">QUARTAS</option>
                            <option value="PRELIMINAR">PRELIMINAR</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="editJogo" class="form-label">Jogo *</label>
                        <input type="text" id="editJogo" class="form-input" required placeholder="Ex: Jogo 1">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="editConfronto" class="form-label">Confronto *</label>
                    <input type="text" id="editConfronto" class="form-input" required placeholder="Ex: Time A vs Time B">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="editData" class="form-label">Data *</label>
                        <input type="date" id="editData" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editDia" class="form-label">Dia *</label>
                        <input type="text" id="editDia" class="form-input" required placeholder="Ex: Segunda-feira">
                    </div>
                    
                    <div class="form-group">
                        <label for="editHorario" class="form-label">Horário *</label>
                        <input type="time" id="editHorario" class="form-input" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="editQuadra" class="form-label">Quadra *</label>
                    <select id="editQuadra" class="form-select" required>
                        <option value="">Selecione a quadra</option>
                        <option value="Saibro">Saibro</option>
                        <option value="AABB">AABB</option>
                        <option value="Jabuticabas">Jabuticabas</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="editPlacarVivo" class="form-label">Placar ao Vivo</label>
                    <input type="text" id="editPlacarVivo" class="form-input" placeholder="Ex: 3x2">
                </div>
                
                <div id="editFormError" class="form-error hidden"></div>
                <div id="editFormSuccess" class="form-success hidden"></div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeEditGameModal()">Cancelar</button>
            <button type="submit" form="editGameForm" class="btn-primary" id="editSubmitBtn">
                <span id="editSubmitBtnText">Salvar</span>
                <span id="editSubmitBtnLoader" class="btn-loader hidden"></span>
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        const headerLower = (header) => header ? header.toLowerCase().trim() : '';
        
        if (rowData) {
            Object.keys(rowData).forEach(key => {
                const keyLower = headerLower(key);
                
                if (keyLower.includes('fase')) {
                    const faseInput = document.getElementById('editFase');
                    if (faseInput) faseInput.value = rowData[key] || '';
                } else if (keyLower.includes('jogo')) {
                    const jogoInput = document.getElementById('editJogo');
                    if (jogoInput) jogoInput.value = rowData[key] || '';
                } else if (keyLower.includes('confronto')) {
                    const confrontoInput = document.getElementById('editConfronto');
                    if (confrontoInput) confrontoInput.value = rowData[key] || '';
                } else if (keyLower.includes('data') && !keyLower.includes('hora')) {
                    const dateValue = rowData[key] || '';
                    const dataInput = document.getElementById('editData');
                    if (dataInput && dateValue) {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) {
                            dataInput.value = date.toISOString().split('T')[0];
                        } else {
                            dataInput.value = dateValue;
                        }
                    }
                } else if (keyLower.includes('dia')) {
                    const diaInput = document.getElementById('editDia');
                    if (diaInput) diaInput.value = rowData[key] || '';
                } else if (keyLower.includes('horário') || keyLower.includes('horario')) {
                    const timeValue = rowData[key] || '';
                    const horarioInput = document.getElementById('editHorario');
                    if (horarioInput && timeValue) {
                        horarioInput.value = timeValue;
                    }
                } else if (keyLower.includes('quadra')) {
                    const quadraInput = document.getElementById('editQuadra');
                    if (quadraInput) quadraInput.value = rowData[key] || '';
                } else if (keyLower.includes('placar') && keyLower.includes('vivo')) {
                    const placarVivoInput = document.getElementById('editPlacarVivo');
                    if (placarVivoInput) placarVivoInput.value = rowData[key] || '';
                }
            });
        }
        
        overlay.classList.add('active');
        const faseInput = document.getElementById('editFase');
        if (faseInput) faseInput.focus();
    }, 10);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeEditGameModal();
        }
    });
}

// Função para fechar modal de edição
function closeEditGameModal() {
    const overlay = document.getElementById('editGameModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Função para submeter formulário de jogo
async function submitGame(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitBtnLoader = document.getElementById('submitBtnLoader');
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    
    formError.classList.add('hidden');
    formSuccess.classList.add('hidden');
    
    const gameData = {
        fase: document.getElementById('fase').value.trim(),
        jogo: document.getElementById('jogo').value.trim(),
        confronto: document.getElementById('confronto').value.trim(),
        data: document.getElementById('data').value,
        dia: document.getElementById('dia').value.trim(),
        horario: document.getElementById('horario').value,
        quadra: document.getElementById('quadra').value.trim()
    };
    
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Adicionando...';
    submitBtnLoader.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/add-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            formSuccess.textContent = 'Jogo adicionado com sucesso!';
            formSuccess.classList.remove('hidden');
            
            setTimeout(() => {
                closeAddGameModal();
                loadData();
            }, 1500);
        } else {
            formError.textContent = result.error || 'Erro ao adicionar jogo';
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Adicionar';
            submitBtnLoader.classList.add('hidden');
        }
    } catch (error) {
        formError.textContent = 'Erro de conexão. Tente novamente.';
        formError.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Adicionar';
        submitBtnLoader.classList.add('hidden');
    }
}

// Função para submeter edição de jogo
async function submitEditGame(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('editSubmitBtn');
    const submitBtnText = document.getElementById('editSubmitBtnText');
    const submitBtnLoader = document.getElementById('editSubmitBtnLoader');
    const formError = document.getElementById('editFormError');
    const formSuccess = document.getElementById('editFormSuccess');
    
    formError.classList.add('hidden');
    formSuccess.classList.add('hidden');
    
    const rowIndex = window.pendingRowIndex;
    
    if (!rowIndex) {
        formError.textContent = 'Erro: índice da linha não encontrado';
        formError.classList.remove('hidden');
        return;
    }
    
    const gameData = {
        fase: document.getElementById('editFase').value.trim(),
        jogo: document.getElementById('editJogo').value.trim(),
        confronto: document.getElementById('editConfronto').value.trim(),
        data: document.getElementById('editData').value,
        dia: document.getElementById('editDia').value.trim(),
        horario: document.getElementById('editHorario').value,
        quadra: document.getElementById('editQuadra').value.trim(),
        placarVivo: document.getElementById('editPlacarVivo').value.trim()
    };
    
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Salvando...';
    submitBtnLoader.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/update-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rowIndex: rowIndex,
                ...gameData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            formSuccess.textContent = 'Jogo atualizado com sucesso!';
            formSuccess.classList.remove('hidden');
            
            setTimeout(() => {
                closeEditGameModal();
                window.pendingRowIndex = null;
                loadData();
            }, 1500);
        } else {
            formError.textContent = result.error || 'Erro ao atualizar jogo';
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Salvar';
            submitBtnLoader.classList.add('hidden');
        }
    } catch (error) {
        formError.textContent = 'Erro de conexão. Tente novamente.';
        formError.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Salvar';
        submitBtnLoader.classList.add('hidden');
    }
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
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .modal-overlay.active {
        opacity: 1;
    }
    
    .modal-container {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
    }
    
    .modal-overlay.active .modal-container {
        transform: translateY(0) scale(1);
    }
    
    .modal-container.modal-large {
        max-width: 700px;
    }
    
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    }
    
    .modal-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
        margin: 0;
        font-family: 'Bebas Neue', sans-serif;
        letter-spacing: 1px;
    }
    
    .modal-close {
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
        width: 32px;
        height: 32px;
    }
    
    .modal-close:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error);
    }
    
    .modal-close svg {
        width: 20px;
        height: 20px;
    }
    
    .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
    }
    
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--color-border);
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        background: var(--color-bg-tertiary);
    }
    
    .form-group {
        margin-bottom: 1.25rem;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.25rem;
    }
    
    .form-label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--color-text);
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .form-input,
    .form-select {
        width: 100%;
        padding: 0.75rem 1rem;
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        transition: var(--transition);
    }
    
    .form-input:focus,
    .form-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .form-input::placeholder {
        color: var(--color-text-tertiary);
    }
    
    .form-select {
        cursor: pointer;
    }
    
    .form-error {
        color: var(--color-error);
        font-size: 0.85rem;
        margin-top: 0.5rem;
        padding: 0.75rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
    }
    
    .form-success {
        color: var(--color-success);
        font-size: 0.85rem;
        margin-top: 0.5rem;
        padding: 0.75rem;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
    }
    
    .btn-primary,
    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.9rem;
        cursor: pointer;
        transition: var(--transition);
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-family: 'JetBrains Mono', monospace;
    }
    
    .btn-primary {
        background: var(--gradient-primary);
        color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    
    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .btn-secondary {
        background: var(--color-bg-tertiary);
        color: var(--color-text);
        border: 1px solid var(--color-border);
    }
    
    .btn-secondary:hover {
        background: var(--color-bg);
        border-color: var(--color-border-light);
    }
    
    .btn-loader {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .hidden {
        display: none !important;
    }
    
    .table-row-clickable {
        transition: var(--transition);
    }
    
    .table-row-clickable:hover {
        background: rgba(99, 102, 241, 0.1) !important;
        transform: translateX(4px);
    }
`;
document.head.appendChild(style);
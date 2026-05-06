import './style.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Configuración y Variables de Estado
// Endpoint de producción (NocoDB)
const NOCODB_API_URL = 'https://proyectos.aldeapucela.org/api/v1/db/public/shared-view/e8c5d5a2-bdaa-47c8-96de-3b9195129e7f/rows?limit=1000';
// Endpoint local de desarrollo (JSON)
const LOCAL_JSON_URL = './json/recursos_valladolid_nocodb.json';

// ==========================================
// CAMBIA EL ENDPOINT AQUÍ SEGÚN LO NECESITES
// ==========================================
// Para producción (NocoDB):
// const API_URL = NOCODB_API_URL;
// Para desarrollo (JSON local):
const API_URL = LOCAL_JSON_URL;

let allData = [];
let filteredData = [];
let categories = new Set();
let tags = new Map(); // Mapa para guardar tag y su frecuencia { 'tag': count }

// Estado de los filtros
let currentFilters = {
  search: '',
  category: 'all',
  oficialOnly: false,
  selectedTags: new Set()
};

// Elementos del DOM
const loadingEl = document.getElementById('loading');
const resultsGrid = document.getElementById('resultsGrid');
const emptyState = document.getElementById('emptyState');
const categorySelect = document.getElementById('categorySelect');
const tagCloud = document.getElementById('tagCloud');
const searchInput = document.getElementById('searchInput');
const oficialToggle = document.getElementById('oficialToggle');

// Inicialización
async function init() {
  setupThemeToggle();
  await fetchData();
  setupEventListeners();
  applyFilters();
}

// 1. Obtener y procesar datos
async function fetchData() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Error al obtener los datos');
    
    const data = await response.json();
    
    // Adaptar si los datos vienen del JSON local (array directo) o de NocoDB ({ list: [...] })
    const dataList = Array.isArray(data) ? data : data.list;

    // Normalizar datos
    allData = dataList.map(row => {
      // Parsear etiquetas (separadas por ;)
      let rowTags = [];
      if (row.etiquetas) {
        rowTags = row.etiquetas.split(';')
          .map(t => t.trim())
          .filter(t => t.length > 0);
      }
      
      // Añadir al Set/Map global
      if (row.categoria) categories.add(row.categoria);
      rowTags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });

      return {
        ...row,
        oficial: row.oficial === 'true' || row.oficial === true,
        tags: rowTags,
        // Texto plano para búsquedas más rápidas
        _searchText: `${row.nombre || ''} ${row.descripcion || ''}`.toLowerCase()
      };
    });

    // Rellenar UI inicial
    populateCategories();
    populateTagCloud();

    // Ocultar loader
    loadingEl.classList.add('hidden');
    resultsGrid.classList.remove('hidden');

  } catch (error) {
    console.error('Error fetching data:', error);
    loadingEl.innerHTML = `<div class="text-red-500 flex flex-col items-center"><i class="fa-solid fa-triangle-exclamation text-4xl mb-2"></i><p>Error al cargar el directorio. Por favor, recarga la página.</p></div>`;
  }
}

// 2. Rellenar Select de Categorías
function populateCategories() {
  const sortedCategories = Array.from(categories).sort();
  sortedCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

// 3. Rellenar Nube de Etiquetas
function populateTagCloud() {
  // Ordenar tags por frecuencia (descendente) y coger los 20 más populares
  const sortedTags = Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30); // Limitar a 30 etiquetas populares para no saturar

  tagCloud.innerHTML = '';
  
  sortedTags.forEach(([tag, count]) => {
    const button = document.createElement('button');
    // Clases base para el tag
    button.className = `tag-btn px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-200 
      bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700
      hover:border-primary hover:text-primary dark:hover:border-primary-dark dark:hover:text-primary-dark`;
    button.dataset.tag = tag;
    button.innerHTML = `${tag} <span class="opacity-50 text-[10px] ml-1">(${count})</span>`;
    
    button.addEventListener('click', () => {
      toggleTagFilter(tag, button);
    });
    
    tagCloud.appendChild(button);
  });
}

// 4. Lógica de Filtrado
function setupEventListeners() {
  searchInput.addEventListener('input', (e) => {
    currentFilters.search = e.target.value.toLowerCase();
    applyFilters();
  });

  categorySelect.addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    applyFilters();
  });

  oficialToggle.addEventListener('change', (e) => {
    currentFilters.oficialOnly = e.target.checked;
    applyFilters();
  });
}

function toggleTagFilter(tag, button) {
  if (currentFilters.selectedTags.has(tag)) {
    currentFilters.selectedTags.delete(tag);
    button.classList.remove('bg-primary', 'dark:bg-primary-dark', 'text-white', 'border-primary', 'dark:border-primary-dark');
    button.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border-slate-200', 'dark:border-slate-700');
  } else {
    currentFilters.selectedTags.add(tag);
    button.classList.add('bg-primary', 'dark:bg-primary-dark', 'text-white', 'border-primary', 'dark:border-primary-dark');
    button.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border-slate-200', 'dark:border-slate-700', 'hover:border-primary', 'hover:text-primary');
  }
  applyFilters();
}

function applyFilters() {
  filteredData = allData.filter(row => {
    // Filtro Búsqueda
    if (currentFilters.search && !row._searchText.includes(currentFilters.search)) {
      return false;
    }
    
    // Filtro Categoría
    if (currentFilters.category !== 'all' && row.categoria !== currentFilters.category) {
      return false;
    }
    
    // Filtro Oficial
    if (currentFilters.oficialOnly && !row.oficial) {
      return false;
    }
    
    // Filtro Etiquetas (debe tener TODAS las etiquetas seleccionadas - AND)
    if (currentFilters.selectedTags.size > 0) {
      for (let tag of currentFilters.selectedTags) {
        if (!row.tags.includes(tag)) {
          return false;
        }
      }
    }
    
    return true;
  });

  renderCards();
}

// 5. Renderizado de Tarjetas
function renderCards() {
  resultsGrid.innerHTML = '';
  
  if (filteredData.length === 0) {
    resultsGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  resultsGrid.classList.remove('hidden');
  emptyState.classList.add('hidden');

  filteredData.forEach(row => {
    const card = document.createElement('article');
    card.className = `flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-300 h-full`;
    
    // URL limpia para display
    let displayUrl = '';
    try {
      const urlObj = new URL(row.url);
      displayUrl = urlObj.hostname.replace('www.', '');
    } catch(e) {
      displayUrl = row.url;
    }

    // Badge oficial
    const oficialBadge = row.oficial 
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" title="Recurso Oficial">
          <i class="fa-solid fa-circle-check"></i> Oficial
         </span>` 
      : '';

    // Tags HTML
    const tagsHtml = row.tags.slice(0, 4).map(tag => 
      `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        ${tag}
      </span>`
    ).join('');
    
    const moreTags = row.tags.length > 4 
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-400">+${row.tags.length - 4}</span>`
      : '';

    card.innerHTML = `
      <div class="p-5 flex flex-col flex-grow">
        <div class="flex justify-between items-start mb-3 gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary-dark/20 dark:text-primary-dark">
            ${row.categoria || 'Sin categoría'}
          </span>
          ${oficialBadge}
        </div>
        
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">
          <a href="${row.url}" target="_blank" rel="noopener noreferrer" class="hover:text-primary dark:hover:text-primary-dark transition-colors">
            ${row.nombre}
          </a>
        </h2>
        
        <a href="${row.url}" target="_blank" rel="noopener noreferrer" class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-3 truncate flex items-center gap-1.5">
          <i class="fa-solid fa-link text-xs"></i> ${displayUrl}
        </a>
        
        <p class="text-slate-600 dark:text-slate-300 text-sm flex-grow line-clamp-3 mb-4">
          ${row.descripcion || 'Sin descripción disponible.'}
        </p>
        
        <div class="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
          ${tagsHtml}
          ${moreTags}
        </div>
      </div>
    `;
    
    resultsGrid.appendChild(card);
  });
}

// 6. Lógica de Modo Oscuro
function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Sincronizar icono inicial
  if (document.documentElement.classList.contains('dark')) {
    themeIcon.classList.replace('fa-moon', 'fa-sun');
  }

  themeToggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      window.localStorage.setItem('aldeapucela_theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
      window.localStorage.setItem('aldeapucela_theme', 'light');
      document.documentElement.style.colorScheme = 'light';
      themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
  });
}

// Arrancar aplicación
document.addEventListener('DOMContentLoaded', init);

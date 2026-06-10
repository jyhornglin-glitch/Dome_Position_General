// Tzu Chi Stage Formation - Relative Position App Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Force reload page by appending timestamp query parameter
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.toString();
    });
  }
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const autocompleteList = document.getElementById('autocompleteList');
  const categoryFilter = document.getElementById('categoryFilter');
  const mainContent = document.getElementById('mainContent');
  const emptyState = document.getElementById('emptyState');
  
  // Performer Summary Elements
  const perfAvatar = document.getElementById('perfAvatar');
  const perfName = document.getElementById('perfName');
  const perfCategory = document.getElementById('perfCategory');
  const perfID = document.getElementById('perfID');
  
  // SVG relative Map Elements
  const stageWatermark = document.getElementById('stageWatermark');
  const localGridLines = document.getElementById('localGridLines');
  const localPathSegments = document.getElementById('localPathSegments');
  const localPathPoints = document.getElementById('localPathPoints');
  
  // Mobile Navigation Tabs
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  const mobileTabPanels = document.querySelectorAll('.mobile-tab-panel');
  
  // Navigation Steps Flow
  const navStepsFlow = document.getElementById('navStepsFlow');
  
  // Map Control Elements
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const activeFormNum = document.getElementById('activeFormNum');
  const activeFormTitle = document.getElementById('activeFormTitle');
  
  // State variables
  let currentPerformer = null;
  let activeTab = 'localGrid'; // Default mobile tab is Grid view
  let activeFormationIdx = 0; // Current active formation index (0 to 5)
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let rotationAngle = 0;

  // Relative Grid coordinate configuration
  const GRID_CENTER_X = 180;
  const GRID_CENTER_Y = 180;
  let GRID_SPACING = 15; // 1 coord unit = 15 pixels
  let MAX_GRID_COORD = 10;

  // 7 Formations metadata
  const formations = [
    { key: 'basic', name: '起點 (基本隊形)', label: '基本' },
    { key: 'circle', name: '01圓形', label: '圓形' },
    { key: 'xingYuan', name: '02行願', label: '行願' },
    { key: 'jingSi', name: '04靜思家風', label: '靜思' },
    { key: 'lamp', name: '05-1有法船', label: '有法船' },
    { key: 'noBoat', name: '05-2無法船', label: '無法船' },
    { key: 'bigV', name: '06四弘誓願', label: '四弘誓願' }
  ];

  // Get coordinate and name dynamically to handle inconsistent data keys in data.js
  function getPerformerFields(performer) {
    if (!performer) return { coordinate: '', name: '' };
    // Check if the 'name' field contains digits or hyphens, indicating it is the coordinate
    if (/[\d-]/.test(performer.name)) {
      return {
        coordinate: performer.name,
        name: performer.id
      };
    } else {
      return {
        coordinate: performer.id,
        name: performer.name
      };
    }
  }

  // Initialize App
  init();

  function init() {
    setupTime();
    setupAutocomplete();
    setupFilters();
    setupMobileTabs();
    setupEventListeners();
    setupDownloadListeners();
    setupZoomAndPan();
  }

  // Real-time status bar clock
  function setupTime() {
    const timeEl = document.getElementById('phoneTime');
    function updateClock() {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${hrs}:${mins}`;
    }
    updateClock();
    setInterval(updateClock, 60000);
  }

  // Parse coord strings: e.g. "5.2-46.2", "平台中-8-58.5", "二階-52.2", or "舞台上"
  function parseCoordinate(coordStr) {
    if (!coordStr) return { x: null, y: null, isText: true, text: '無資料' };
    
    // Clean string by removing parentheses
    const cleanStr = coordStr.replace(/[()]/g, '').trim();
    
    // Flexible regex to match (-?[0-9.]+)-(-?[0-9.]+) anywhere in the string,
    // optionally ignoring text separator characters in the middle
    const match = cleanStr.match(/(-?[0-9.]+)[^0-9.-]*-(-?[0-9.]+)/);
    if (match) {
      return {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        isText: false,
        text: coordStr
      };
    } else {
      // Return description and set dummy relative offsets for visual rendering
      // e.g. "舞台上" is upstage, "上階梯" is upstage and left
      let mockXOffset = 0;
      let mockYOffset = 0;
      if (coordStr.includes('階梯')) {
        mockXOffset = -3.0; // Left relative (towards center line)
        mockYOffset = -4.0; // Upstage relative (towards Stage A / up)
      } else if (coordStr.includes('舞台')) {
        mockXOffset = 0.0;  // Center relative
        mockYOffset = -5.0; // Upstage relative (towards Stage A / up)
      }
      return {
        x: null,
        y: null,
        isText: true,
        text: coordStr,
        mockX: mockXOffset,
        mockY: mockYOffset
      };
    }
  }

  // Helper to split landmark text and numeric coordinates
  function splitLandmarkAndCoordinate(coordStr) {
    if (!coordStr) return { landmark: '', coordinate: '' };
    const cleanStr = coordStr.replace(/[()]/g, '').trim();
    // Match coordinate patterns like -8-58.5, 6.2-49.2, -50.2, etc. at the end
    const coordRegex = /(-?\d+(\.\d+)?([^\d.-]*-?\d+(\.\d+)?)*)$/;
    const match = cleanStr.match(coordRegex);
    if (match) {
      const coordinatePart = match[1];
      const landmarkPart = cleanStr.substring(0, cleanStr.length - coordinatePart.length).replace(/[-#\s]+$/, '').trim();
      return {
        landmark: landmarkPart,
        coordinate: coordinatePart
      };
    } else {
      return {
        landmark: cleanStr,
        coordinate: ''
      };
    }
  }

  // Color mapping helper
  function getCategoryColor(category) {
    switch(category) {
      case 'A白': return 'var(--color-a-white)';
      case 'A藍': return 'var(--color-a-blue)';
      case 'B白': return 'var(--color-b-white)';
      case 'B藍': return 'var(--color-b-blue)';
      default: return 'var(--text-secondary)';
    }
  }

  // Autocomplete functionality
  function setupAutocomplete() {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      if (!val) {
        autocompleteList.style.display = 'none';
        clearSearchBtn.style.display = 'none';
        return;
      }
      
      clearSearchBtn.style.display = 'block';
      const category = categoryFilter.value;
      
      const filtered = performersData.filter(p => {
        if (category !== 'all' && p.category !== category) return false;
        
        // Normalize search term and fields for comparison (e.g. "04-50" -> "4-50")
        const normalizedVal = val.replace(/^0+(\d+)/, '$1').replace(/-0+(\d+)/, '-$1');
        const normalizedId = p.id.replace(/^0+(\d+)/, '$1').replace(/-0+(\d+)/, '-$1');
        
        return p.name.toLowerCase().includes(val) || 
               p.id.includes(val) || 
               normalizedId.includes(normalizedVal);
      }).slice(0, 100);
      
      renderAutocomplete(filtered);
    });

    searchInput.addEventListener('focus', () => {
      const val = searchInput.value.trim().toLowerCase();
      if (val) autocompleteList.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.style.display = 'none';
      }
    });
  }

  function renderAutocomplete(list) {
    autocompleteList.innerHTML = '';
    
    if (list.length === 0) {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = '無符合資料';
      div.style.color = 'var(--text-secondary)';
      div.style.cursor = 'default';
      autocompleteList.appendChild(div);
      autocompleteList.style.display = 'block';
      return;
    }
    
    list.forEach(p => {
      const fields = getPerformerFields(p);
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'name-id';
      textDiv.innerHTML = `${fields.name} <span>(${fields.coordinate})</span>`;
      
      const badge = document.createElement('span');
      badge.className = `category-badge cat-${p.category}`;
      badge.textContent = p.category;
      
      div.appendChild(textDiv);
      div.appendChild(badge);
      
      div.addEventListener('click', () => {
        selectPerformer(p);
        searchInput.value = fields.name;
        autocompleteList.style.display = 'none';
      });
      
      autocompleteList.appendChild(div);
    });
    
    autocompleteList.style.display = 'block';
  }

  // Filter change resets search
  function setupFilters() {
    categoryFilter.addEventListener('change', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
    });
  }



  // Mobile Tabs bar toggling
  function setupMobileTabs() {
    mobileTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mobileTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const targetTab = btn.dataset.tab;
        mobileTabPanels.forEach(p => p.classList.remove('active'));
        
        const targetPanel = document.getElementById(`panel-${targetTab}`);
        if (targetPanel) targetPanel.classList.add('active');
        
        activeTab = targetTab;
        if (activeTab === 'localGrid' && currentPerformer) {
          drawLocalGridPath();
        }
      });
    });
  }

  // Search event listeners
  function setupEventListeners() {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
      resetToEmptyState();
    });

    prevBtn.addEventListener('click', () => {
      if (activeFormationIdx > 0) {
        activeFormationIdx--;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (activeFormationIdx < formations.length - 1) {
        activeFormationIdx++;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      }
    });

    const showFullTrajectory = document.getElementById('showFullTrajectory');
    if (showFullTrajectory) {
      showFullTrajectory.addEventListener('change', () => {
        drawLocalGridPath();
      });
    }
  }

  function resetToEmptyState() {
    currentPerformer = null;
    mainContent.style.display = 'none';
    emptyState.style.display = 'flex';
  }

  // Select performer and query details
  function selectPerformer(performer) {
    currentPerformer = performer;
    activeFormationIdx = 0; // Reset active formation index to 0 (Basic)
    resetZoomAndPan();
    
    // Reset trajectory toggle checkbox to unchecked
    const showFullTrajectory = document.getElementById('showFullTrajectory');
    if (showFullTrajectory) {
      showFullTrajectory.checked = false;
    }
    
    const fields = getPerformerFields(performer);
    
    // Update summary card
    perfAvatar.textContent = fields.name.charAt(0);
    perfAvatar.className = `performer-avatar cat-${performer.category}`;
    perfName.textContent = fields.name;
    perfCategory.textContent = performer.category;
    perfCategory.className = `meta-badge cat-${performer.category}`;
    perfID.textContent = `起點座標: ${fields.coordinate}`;
    
    // Show main view
    emptyState.style.display = 'none';
    mainContent.style.display = 'flex';
    
    // Update controls, cards, map, and walkthrough path
    updateFormationControls();
    updateFormationCards();
    drawLocalGridPath();
    updateNavigationSteps();
    syncActiveCardAndStep();
    
    // Default to relative grid map tab on mobile viewport
    const defaultMobileTab = document.querySelector('.mobile-tab-btn[data-tab="localGrid"]');
    if (defaultMobileTab) defaultMobileTab.click();
    
    // Scroll to top of app screen
    document.querySelector('.phone-screen').scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update detail cards values & icons
  function updateFormationCards() {
    const fields = getPerformerFields(currentPerformer);
    formations.forEach(f => {
      const card = document.getElementById(`card-${f.key}`);
      const coordBadge = document.getElementById(`coord-${f.key}`);
      const iconWrapper = document.getElementById(`icon-${f.key}`);
      const vectorHome = document.getElementById(`vector-${f.key}-home`);
      const vectorPrev = document.getElementById(`vector-${f.key}-prev`);
      
      let coordStr = f.key === 'basic' ? fields.coordinate : currentPerformer[f.key];
      coordBadge.textContent = coordStr;
      
      // Render HTML landmark icons
      drawHtmlLandmarkIcon(iconWrapper, f.key, currentPerformer.category, fields.name);
      
      // Render lyrics inside Card
      let lyricsItem = card.querySelector('.lyrics-item');
      if (!lyricsItem) {
        lyricsItem = document.createElement('div');
        lyricsItem.className = 'lyrics-item';
        lyricsItem.innerHTML = `
          <div class="lyrics-title"><i class="fa-solid fa-microphone"></i> 唱誦提示</div>
          <div class="lyrics-text"></div>
        `;
        card.querySelector('.card-body').appendChild(lyricsItem);
      }
      const lyricsLines = (typeof chantLyrics !== 'undefined' ? chantLyrics[f.key] : []) || [];
      lyricsItem.querySelector('.lyrics-text').textContent = lyricsLines.join('\n');
      
      const currentCoord = parseCoordinate(coordStr);
      const basicCoord = parseCoordinate(fields.coordinate);
      
      // Calculate relative step descriptions
      if (f.key === 'basic') {
        // basic has no offset description, it is the center
      } else {
        vectorHome.textContent = getVectorDescription(basicCoord, currentCoord);
        
        const prevKey = formations[formations.findIndex(x => x.key === f.key) - 1].key;
        let prevCoordStr = prevKey === 'basic' ? fields.coordinate : currentPerformer[prevKey];
        
        const prevCoord = parseCoordinate(prevCoordStr);
        vectorPrev.textContent = getVectorDescription(prevCoord, currentCoord);
      }
      // Disabled card click interaction as per request
      card.onclick = null;
    });
  }

  // Describe offsets in step counts and directions (with screen top as performer's front)
  function getVectorDescription(from, to) {
    if (from.isText || to.isText) {
      if (from.isText && to.isText) return `從 [${from.text}] 移動至 [${to.text}]`;
      if (from.isText) return `從 [${from.text}] 前往 坐標 (${to.text})`;
      return `從 坐標 (${from.text}) 前往 [${to.text}]`;
    }
    
    const dx = to.x - from.x; // Column difference (horizontal: right-left)
    const dy = to.y - from.y; // Row difference (vertical: down-up)
    
    if (dx === 0 && dy === 0) return '原地 (0 步)';
    
    let parts = [];
    if (dy !== 0) {
      const direction = dy > 0 ? '向後 (往乙舞台)' : '向前 (往甲舞台)';
      parts.push(`${direction}走 ${Math.abs(dy).toFixed(1)} 步`);
    }
    if (dx !== 0) {
      const direction = dx > 0 ? '向右 (往右側)' : '向左 (往中線)';
      parts.push(`${direction}走 ${Math.abs(dx).toFixed(1)} 步`);
    }
    
    const dist = Math.sqrt(dx*dx + dy*dy).toFixed(1);
    return `${parts.join('，')} (直線 ${dist} 步)`;
  }

  // Transform relative coordinate to SVG screen coordinates (standard horizontal/vertical layout)
  function gridToSvg(dx_rel, dy_rel) {
    // Column difference dx_rel: positive is right, negative is left
    const svgX = GRID_CENTER_X + dx_rel * GRID_SPACING;
    
    // Row difference dy_rel: positive is down, negative is up
    const svgY = GRID_CENTER_Y + dy_rel * GRID_SPACING;
    
    return { x: svgX, y: svgY };
  }

  // Draw Dynamic SVG Landmark Image inside grid map using PNG stickers
  function drawSvgLandmarkImage(parentGroup, type, category, x, y, size, isMainSvg = true) {
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `images/stickers/${type}_${category}.png`);
    img.setAttribute('x', x - size / 2);
    img.setAttribute('y', y - size / 2);
    img.setAttribute('width', size);
    img.setAttribute('height', size);
    img.setAttribute('class', 'svg-sticker-image');
    
    if (isMainSvg) {
      // Add click event to image to sync active formation
      img.addEventListener('click', () => {
        const idx = formations.findIndex(x => x.key === type);
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      });
    }
    
    parentGroup.appendChild(img);

    if (type === 'basic' && currentPerformer) {
      const fields = getPerformerFields(currentPerformer);
      const centerColor = category.startsWith('B') ? '#7dbf32' : '#e65537';
      
      const overlayCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      overlayCircle.setAttribute('cx', x);
      overlayCircle.setAttribute('cy', y);
      overlayCircle.setAttribute('r', (size * 0.3).toFixed(2));
      overlayCircle.setAttribute('fill', centerColor);
      parentGroup.appendChild(overlayCircle);
      
      const parts = fields.coordinate.split('-');
      if (parts.length === 2) {
        // Draw white dividing line
        const midLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        midLine.setAttribute('x1', (x - size * 0.18).toFixed(2));
        midLine.setAttribute('y1', y);
        midLine.setAttribute('x2', (x + size * 0.18).toFixed(2));
        midLine.setAttribute('y2', y);
        midLine.setAttribute('stroke', '#ffffff');
        midLine.setAttribute('stroke-width', (size * 0.024).toFixed(2));
        parentGroup.appendChild(midLine);
        
        // Top number
        const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        topText.setAttribute('x', x);
        topText.setAttribute('y', (y - size * 0.06).toFixed(2));
        topText.setAttribute('text-anchor', 'middle');
        topText.setAttribute('class', 'sticker-coord-text');
        topText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        topText.textContent = parts[0].padStart(2, '0');
        parentGroup.appendChild(topText);
        
        // Bottom number
        const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bottomText.setAttribute('x', x);
        bottomText.setAttribute('y', (y + size * 0.192).toFixed(2));
        bottomText.setAttribute('text-anchor', 'middle');
        bottomText.setAttribute('class', 'sticker-coord-text');
        bottomText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        bottomText.textContent = parts[1].padStart(2, '0');
        parentGroup.appendChild(bottomText);
      } else {
        const overlayText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        overlayText.setAttribute('x', x);
        overlayText.setAttribute('y', (y + size * 0.088).toFixed(2));
        overlayText.setAttribute('text-anchor', 'middle');
        overlayText.setAttribute('class', 'sticker-coord-text');
        overlayText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        overlayText.textContent = fields.coordinate.padStart(2, '0');
        parentGroup.appendChild(overlayText);
      }
    }
  }

  // Draw relative coordinate grid path centered at basic ID (0,0) (standard unrotated axes)
  function drawLocalGridPath(targetSvg = null, targetIdx = null) {
    if (!currentPerformer) return;
    
    const svgEl = targetSvg || document.getElementById('localGridSvg');
    const fIdx = (targetIdx !== null) ? targetIdx : activeFormationIdx;
    const isMainSvg = (svgEl === document.getElementById('localGridSvg'));
    
    const showFullToggle = document.getElementById('showFullTrajectory');
    const showFull = (targetSvg === null && showFullToggle) ? showFullToggle.checked : false;
    
    // Save original scales to avoid preview rendering overriding main scales
    const originalMaxGridCoord = MAX_GRID_COORD;
    const originalGridSpacing = GRID_SPACING;
    
    const fields = getPerformerFields(currentPerformer);
    // Home coordinates
    const homeCoord = parseCoordinate(fields.coordinate);
    const category = currentPerformer.category;

    // Calculate dynamic scale based on maximum coordinate offset of points to display
    let maxOffset = 0;
    const tempPoints = formations.map((f) => {
      let coordStr = f.key === 'basic' ? fields.coordinate : currentPerformer[f.key];
      
      const coord = parseCoordinate(coordStr);
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        dx_rel = coord.mockX || 0;
        dy_rel = coord.mockY || 0;
      }
      return { dx_rel, dy_rel };
    });
    
    // Calculate scale based on all 6 points so that all performer positions are always inside the grid boundaries
    tempPoints.forEach(pt => {
      maxOffset = Math.max(maxOffset, Math.abs(pt.dx_rel), Math.abs(pt.dy_rel));
    });
    
    // Always include Stage B center (-8, 37.5) in the visible map area
    if (!homeCoord.isText) {
      const stageB_dx_rel = -8 - homeCoord.x;
      const stageB_dy_rel = 37.5 - homeCoord.y;
      maxOffset = Math.max(maxOffset, Math.abs(stageB_dx_rel), Math.abs(stageB_dy_rel));
    }
    
    // Determine MAX_GRID_COORD and GRID_SPACING dynamically
    MAX_GRID_COORD = 4;
    while (MAX_GRID_COORD < maxOffset + 1.5) {
      MAX_GRID_COORD += 4;
    }
    GRID_SPACING = 180 / MAX_GRID_COORD;

    // Adjust label frequency based on coordinate density
    let labelStep = 2;
    if (MAX_GRID_COORD <= 6) {
      labelStep = 1;
    } else if (MAX_GRID_COORD <= 12) {
      labelStep = 2;
    } else if (MAX_GRID_COORD <= 24) {
      labelStep = 4;
    } else {
      labelStep = 8;
    }
    
    const wmkGroup = svgEl.querySelector('.stage-watermark') || svgEl.querySelector('#stageWatermark');
    const linesGroup = svgEl.querySelector('.grid-lines') || svgEl.querySelector('#localGridLines');
    const pathSegmentsGroup = svgEl.querySelector('#localPathSegments');
    const pathPointsGroup = svgEl.querySelector('#localPathPoints');
    
    wmkGroup.innerHTML = '';
    linesGroup.innerHTML = '';
    pathSegmentsGroup.innerHTML = '';
    pathPointsGroup.innerHTML = '';
    
    // Update grid clipping path rect
    const gridClipRect = svgEl.querySelector('#gridClipRect') || svgEl.querySelector('clipPath rect');
    if (gridClipRect) {
      gridClipRect.setAttribute('x', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('y', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('width', 2 * MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('height', 2 * MAX_GRID_COORD * GRID_SPACING);
    }
    
    // Draw Stage B blueprint watermark background
    if (!homeCoord.isText) {
      // 0. Draw Stage Background to mask the grid lines underneath
      const bg_x1_rel = -11 - homeCoord.x;
      const bg_y1_rel = -MAX_GRID_COORD;
      const bg_svgTopLeft = gridToSvg(bg_x1_rel, bg_y1_rel);
      const bg_width = 6 * GRID_SPACING;
      const bg_height = 2 * MAX_GRID_COORD * GRID_SPACING;
      
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', bg_svgTopLeft.x);
      bgRect.setAttribute('y', bg_svgTopLeft.y);
      bgRect.setAttribute('width', bg_width);
      bgRect.setAttribute('height', bg_height);
      bgRect.setAttribute('class', 'watermark-bg');
      wmkGroup.appendChild(bgRect);
      
      // Stage B Circular Background: Col = -8, Row = 37.5, Radius = 8.7 (outermost step)
      const stageB_dx_rel = -8 - homeCoord.x;
      const stageB_dy_rel = 37.5 - homeCoord.y;
      const stageB_svg = gridToSvg(stageB_dx_rel, stageB_dy_rel);
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', stageB_svg.x);
      bgCircle.setAttribute('cy', stageB_svg.y);
      bgCircle.setAttribute('r', 8.7 * GRID_SPACING);
      bgCircle.setAttribute('class', 'watermark-bg');
      wmkGroup.appendChild(bgCircle);

      // 1. Draw Runway Central Rectangle: Col = -11 to -5, Row = 32.5 to 42.5
      const rect_x1_rel = -11 - homeCoord.x;
      const rect_y1_rel = 32.5 - homeCoord.y;
      const rect_svgTopLeft = gridToSvg(rect_x1_rel, rect_y1_rel);
      const rect_width = 6 * GRID_SPACING;
      const rect_height = 10 * GRID_SPACING;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', rect_svgTopLeft.x);
      rect.setAttribute('y', rect_svgTopLeft.y);
      rect.setAttribute('width', rect_width);
      rect.setAttribute('height', rect_height);
      rect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(rect);
      
      // 1.5 Draw central square in circle (size 6.0)
      const squareSize = 6.0 * GRID_SPACING;
      const squareRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      squareRect.setAttribute('x', stageB_svg.x - squareSize / 2);
      squareRect.setAttribute('y', stageB_svg.y - squareSize / 2);
      squareRect.setAttribute('width', squareSize);
      squareRect.setAttribute('height', squareSize);
      squareRect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(squareRect);
      
      // 2. Draw bulging concentric lines representing stage B circles and runway steps on BOTH sides
      const sides = [1, -1];
      sides.forEach(side => {
        for (let i = 0; i <= 6; i++) {
          const R_i = 6.0 + i * 0.45;
          const W_i = 3.0 + i * 0.45;
          
          const col_top = -8 + side * W_i - homeCoord.x;
          const col_mid = -8 + side * R_i - homeCoord.x;
          const col_bottom = -8 + side * W_i - homeCoord.x;
          
          const row_top_start = -MAX_GRID_COORD;
          const row_top_curve = 37.5 - 12 - homeCoord.y;
          const row_mid = 37.5 - homeCoord.y;
          const row_bottom_curve = 37.5 + 12 - homeCoord.y;
          const row_bottom_end = MAX_GRID_COORD;
          
          const x_top = GRID_CENTER_X + col_top * GRID_SPACING;
          const x_mid = GRID_CENTER_X + col_mid * GRID_SPACING;
          const x_bottom = GRID_CENTER_X + col_bottom * GRID_SPACING;
          
          const y_top_start = GRID_CENTER_Y + row_top_start * GRID_SPACING;
          const y_top_curve = GRID_CENTER_Y + row_top_curve * GRID_SPACING;
          const y_mid = GRID_CENTER_Y + row_mid * GRID_SPACING;
          const y_bottom_curve = GRID_CENTER_Y + row_bottom_curve * GRID_SPACING;
          const y_bottom_end = GRID_CENTER_Y + row_bottom_end * GRID_SPACING;
          
          const y_control_top = GRID_CENTER_Y + (37.5 - 6 - homeCoord.y) * GRID_SPACING;
          const y_control_bottom = GRID_CENTER_Y + (37.5 + 6 - homeCoord.y) * GRID_SPACING;
          
          const pathD = `M ${x_top} ${y_top_start} ` +
                        `L ${x_top} ${y_top_curve} ` +
                        `C ${x_top} ${y_control_top}, ${x_mid} ${y_control_top}, ${x_mid} ${y_mid} ` +
                        `C ${x_mid} ${y_control_bottom}, ${x_bottom} ${y_control_bottom}, ${x_bottom} ${y_bottom_curve} ` +
                        `L ${x_bottom} ${y_bottom_end}`;
                        
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill', 'none');
          
          if (i === 0) {
            path.setAttribute('class', 'watermark-line-accent');
          } else if (i % 2 === 1) {
            path.setAttribute('class', 'watermark-line-yellow');
          } else {
            path.setAttribute('class', 'watermark-line');
          }
          wmkGroup.appendChild(path);
        }
      });
      
      // 3. Draw radial stairs/steps on Stage B: radiating from center (-8, 37.5) on BOTH sides
      const rightAngles = [-45, -30, -15, 0, 15, 30, 45];
      const leftAngles = [135, 150, 165, 180, 195, 210, 225];
      const allAngles = [...rightAngles, ...leftAngles];
      
      allAngles.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const r_start = 6.0 * GRID_SPACING;
        const r_end = 8.7 * GRID_SPACING;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', stageB_svg.x + r_start * Math.cos(rad));
        line.setAttribute('y1', stageB_svg.y + r_start * Math.sin(rad));
        line.setAttribute('x2', stageB_svg.x + r_end * Math.cos(rad));
        line.setAttribute('y2', stageB_svg.y + r_end * Math.sin(rad));
        line.setAttribute('class', 'watermark-line');
        wmkGroup.appendChild(line);
      });
      
      // 4. Draw Faint text label "乙舞台" centered at (-8, 37.5)
      const stageBText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      stageBText.setAttribute('x', stageB_svg.x);
      stageBText.setAttribute('y', stageB_svg.y + 3);
      stageBText.setAttribute('class', 'watermark-text');
      stageBText.textContent = '乙舞台';
      wmkGroup.appendChild(stageBText);
    }
    
    // Draw background grid lines (centered at 180, 180) - horizontal and vertical
    for (let i = -MAX_GRID_COORD; i <= MAX_GRID_COORD; i++) {
      const posOffset = i * GRID_SPACING;
      
      // Vertical line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y1', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      vLine.setAttribute('x2', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y2', GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING);
      if (i === 0) vLine.setAttribute('class', 'axis');
      linesGroup.appendChild(vLine);
      
      // Horizontal line
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hLine.setAttribute('x1', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y1', GRID_CENTER_Y + posOffset);
      hLine.setAttribute('x2', GRID_CENTER_X + MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y2', GRID_CENTER_Y + posOffset);
      if (i === 0) hLine.setAttribute('class', 'axis');
      linesGroup.appendChild(hLine);
      
      // Grid coordinates labels
      if (i % labelStep === 0 && i !== 0) {
        const xText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xText.setAttribute('x', GRID_CENTER_X + posOffset);
        xText.setAttribute('y', GRID_CENTER_Y + 11);
        if (!homeCoord.isText) {
          const val = homeCoord.x + i;
          xText.textContent = val.toFixed(1).replace('.0', '');
        } else {
          xText.textContent = i > 0 ? `右${i}` : `左${Math.abs(i)}`;
        }
        linesGroup.appendChild(xText);
        
        const yText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yText.setAttribute('x', GRID_CENTER_X - 10);
        yText.setAttribute('y', GRID_CENTER_Y + posOffset + 3);
        if (!homeCoord.isText) {
          const val = homeCoord.y + i;
          yText.textContent = val.toFixed(1).replace('.0', '');
        } else {
          yText.textContent = i > 0 ? `後${i}` : `前${Math.abs(i)}`;
        }
        linesGroup.appendChild(yText);
      }
    }
    
    // Center coordinate label removed by request
    
    // Calculate relative coordinates and map to SVG coords
    const allPoints = formations.map((f, idx) => {
      let coordStr = f.key === 'basic' ? fields.coordinate : currentPerformer[f.key];
      
      const coord = parseCoordinate(coordStr);
      
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        dx_rel = coord.mockX;
        dy_rel = coord.mockY;
      }
      
      const ptSvg = gridToSvg(dx_rel, dy_rel);
      
      return {
        key: f.key,
        name: f.name,
        label: f.label,
        coord: coord,
        dx_rel: dx_rel,
        dy_rel: dy_rel,
        pos: ptSvg,
        index: idx
      };
    });
    
    // Map all 6 points to display on the SVG grid
    const pointsToDisplay = allPoints.map((pt, idx) => {
      let role = 'prev';
      let roleLabel = pt.label;
      if (idx === 0) {
        role = 'basic';
        roleLabel = '起點';
      }
      if (idx === fIdx) {
        role = 'current';
        roleLabel = `目前: ${pt.label}`;
      }
      return {
        ...pt,
        role,
        roleLabel
      };
    });
    
    // Define custom colors for each formation key
    const formationColors = {
      basic: '#eab308',      // 黃色
      circle: '#854d0e',     // 棕色
      xingYuan: '#16a34a',   // 綠色
      jingSi: '#eab308',     // 黃色
      lamp: '#4ade80',       // 淺綠色
      noBoat: '#3b82f6',     // 藍色
      bigV: '#ec4899'        // 粉紅色
    };
    
    // Draw all transition path segments sequentially
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (!showFull && i + 1 !== fIdx) continue;
      
      const startPt = allPoints[i];
      const endPt = allPoints[i + 1];
      
      if (startPt.pos.x !== endPt.pos.x || startPt.pos.y !== endPt.pos.y) {
        const pathD = `M ${startPt.pos.x} ${startPt.pos.y} L ${endPt.pos.x} ${endPt.pos.y}`;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        
        const targetKey = endPt.key;
        const color = formationColors[targetKey];
        path.style.stroke = color;
        
        if (i + 1 === fIdx) {
          path.setAttribute('class', 'local-path-line');
          path.setAttribute('marker-end', `url(#local-arrow-${targetKey})`);
          path.style.filter = `drop-shadow(0 0 3px ${color})`;
        } else {
          path.setAttribute('class', 'local-path-line-static');
          path.setAttribute('marker-end', `url(#local-arrow-static-${targetKey})`);
          path.style.filter = 'none';
        }
        pathSegmentsGroup.appendChild(path);
      }
    }
    
    // Render Display Nodes on SVG
    pointsToDisplay.forEach(pt => {
      if (!showFull && pt.index !== 0 && pt.index !== fIdx && pt.index !== fIdx - 1) {
        return;
      }
      
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `path-point pt-${pt.key} role-${pt.role} ${pt.key === formations[fIdx].key ? 'active-formation' : ''}`);
      g.setAttribute('id', `local-point-${pt.key}`);
      
      // Calculate dynamic landmark size based on grid spacing (scaled down by another 80%)
      const landmarkSize = Math.max(12, Math.min(32, GRID_SPACING * 1.8)) * 0.8;
      
      // Render the sticker image dynamically sized
      drawSvgLandmarkImage(g, pt.key, category, pt.pos.x, pt.pos.y, landmarkSize, isMainSvg);
      
      // Draw coordinate label under the node (scaled down to 62.5% of original, i.e., 25% larger than 50%)
      if (pt.coord && pt.coord.text) {
        const split = splitLandmarkAndCoordinate(pt.coord.text);
        let labelToShow = '';
        if (pt.role === 'current') {
          labelToShow = pt.coord.text;
        } else {
          labelToShow = split.landmark;
        }
        
        if (labelToShow) {
          const textLength = labelToShow.length;
          const bgWidth = (textLength * 5.2 + 6) * 0.625;
          const bgHeight = 6.875;
          const labelY = pt.pos.y + landmarkSize / 2 + 6.5; // position label dynamically below the node
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', pt.pos.x - bgWidth / 2);
          rect.setAttribute('y', labelY - bgHeight / 2);
          rect.setAttribute('width', bgWidth);
          rect.setAttribute('height', bgHeight);
          let bgClass = 'path-label-bg';
          if (pt.role === 'current') bgClass += ' bg-current';
          rect.setAttribute('class', bgClass);
          g.appendChild(rect);
          
          const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('x', pt.pos.x);
          textEl.setAttribute('y', labelY + 1.56); // vertical baseline alignment for 62.5% scale
          let textClass = 'path-label-text';
          if (pt.role === 'current') textClass += ' label-current';
          else if (pt.role === 'prev') textClass += ' label-prev';
          textEl.setAttribute('class', textClass);
          textEl.textContent = labelToShow;
          g.appendChild(textEl);
        }
      }
      
      if (isMainSvg) {
        // Sync on node click
        g.addEventListener('click', () => {
          const idx = formations.findIndex(x => x.key === pt.key);
          activeFormationIdx = idx;
          updateFormationControls();
          drawLocalGridPath();
          syncActiveCardAndStep();
        });
      }
      
      pathPointsGroup.appendChild(g);
    });

    // Only update auxiliary UI if we are drawing the main SVG
    if (isMainSvg) {
      // Update top coordinate display bar
      const coordBar = document.getElementById('mapCoordDisplayBar');
      if (coordBar) {
        coordBar.innerHTML = '';
        
        const coordBarPoints = [];
        coordBarPoints.push({
          ...allPoints[0],
          role: 'basic',
          roleLabel: '起點'
        });
        
        if (activeFormationIdx > 0) {
          const prevIdx = activeFormationIdx - 1;
          if (prevIdx > 0) {
            coordBarPoints.push({
              ...allPoints[prevIdx],
              role: 'prev',
              roleLabel: `上一個: ${allPoints[prevIdx].label}`
            });
          } else {
            coordBarPoints[0].roleLabel = '起點 (上一個位置)';
            coordBarPoints[0].isAlsoPrev = true;
          }
          
          coordBarPoints.push({
            ...allPoints[activeFormationIdx],
            role: 'current',
            roleLabel: `目前: ${allPoints[activeFormationIdx].label}`
          });
        } else {
          coordBarPoints[0].roleLabel = '目前位置 (起點)';
          coordBarPoints[0].role = 'current';
        }
        
        coordBarPoints.forEach(pt => {
          const itemDiv = document.createElement('div');
          itemDiv.className = `map-coord-item ${pt.role === 'current' ? 'active-node' : ''}`;
          
          const labelSpan = document.createElement('span');
          labelSpan.className = 'label';
          labelSpan.textContent = pt.roleLabel;
          
          const valSpan = document.createElement('span');
          valSpan.className = 'val';
          // 3個點都只要顯示身分證位置，不要顯示真實座標
          valSpan.textContent = pt.coord.text;
          
          itemDiv.appendChild(labelSpan);
          itemDiv.appendChild(valSpan);
          coordBar.appendChild(itemDiv);
        });
      }

      // Update movement guide text below the map
      const mapMovementGuide = document.getElementById('mapMovementGuide');
      if (mapMovementGuide) {
        const f = formations[activeFormationIdx];
        let coordStr = f.key === 'basic' ? fields.coordinate : currentPerformer[f.key];

        if (activeFormationIdx === 0) {
          mapMovementGuide.innerHTML = `<i class="fa-solid fa-street-view" style="color: var(--red-color); margin-right: 5px;"></i><strong>起點就位</strong>：至起點座標點 <strong>(${coordStr})</strong> 就定位。`;
        } else {
          const prevKey = formations[activeFormationIdx - 1].key;
          let prevCoordStr = prevKey === 'basic' ? fields.coordinate : currentPerformer[prevKey];
          
          const prevCoord = parseCoordinate(prevCoordStr);
          const currentCoord = parseCoordinate(coordStr);
          
          const movement = getVectorDescription(prevCoord, currentCoord);
          const prevName = formations[activeFormationIdx - 1].name.split(' ')[0];
          
          mapMovementGuide.innerHTML = `<i class="fa-solid fa-route" style="color: var(--blue-color); margin-right: 5px;"></i><strong>隊形移動</strong>：從 ${prevName} <strong>(${prevCoordStr})</strong> 移動至 ${f.name.split(' ')[0]} <strong>(${coordStr})</strong>。<br>跑法：<strong>${movement}</strong>。`;
        }
      }

      // Update lyrics guide text below the map
      const mapLyricsGuide = document.getElementById('mapLyricsGuide');
      if (mapLyricsGuide) {
        const f = formations[activeFormationIdx];
        const lyricsLines = (typeof chantLyrics !== 'undefined' ? chantLyrics[f.key] : []) || [];
        if (lyricsLines.length > 0) {
          mapLyricsGuide.innerHTML = `<div class="lyrics-title"><i class="fa-solid fa-microphone"></i> <strong>唱誦提示</strong> (${f.label})</div><div class="lyrics-text">${lyricsLines.join('\n')}</div>`;
          mapLyricsGuide.style.display = 'block';
        } else {
          mapLyricsGuide.style.display = 'none';
        }
      }
    }
    
    // Manage zoom viewport centering on active point
    if (isMainSvg) {
      if (zoomLevel > 1.0) {
        // Calculate rotated coordinates to center correctly if rotated
        const rad = (rotationAngle * Math.PI) / 180;
        const rotatedX = 180 + (allPoints[fIdx].pos.x - 180) * Math.cos(rad) - (allPoints[fIdx].pos.y - 180) * Math.sin(rad);
        const rotatedY = 180 + (allPoints[fIdx].pos.x - 180) * Math.sin(rad) + (allPoints[fIdx].pos.y - 180) * Math.cos(rad);
        panX = rotatedX - 180;
        panY = rotatedY - 180;
      } else {
        panX = 0;
        panY = 0;
      }
      updateSvgViewBox(svgEl);
    } else {
      // Restore previous scale for preview renders to keep main SVG state pure
      MAX_GRID_COORD = originalMaxGridCoord;
      GRID_SPACING = originalGridSpacing;
    }
  }

  // Draw Card Landmark Icon in HTML using the cropped PNG stickers
  function drawHtmlLandmarkIcon(wrapper, type, category, id) {
    wrapper.innerHTML = '';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    
    const img = document.createElement('img');
    img.src = `images/stickers/${type}_${category}.png`;
    img.className = 'landmark-sticker-img';
    img.alt = `${type} sticker`;
    
    img.onerror = () => {
      console.error(`Failed to load sticker: images/stickers/${type}_${category}.png`);
      wrapper.textContent = type;
    };
    
    wrapper.appendChild(img);

    if (type === 'basic' && currentPerformer) {
      const fields = getPerformerFields(currentPerformer);
      const circleOverlay = document.createElement('div');
      circleOverlay.className = 'sticker-circle-overlay';
      
      const centerColor = category.startsWith('B') ? '#7dbf32' : '#e65537';
      circleOverlay.style.backgroundColor = centerColor;
      
      const parts = fields.coordinate.split('-');
      if (parts.length === 2) {
        const topSpan = document.createElement('span');
        topSpan.className = 'sticker-coord-part-html top';
        topSpan.textContent = parts[0].padStart(2, '0');
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'sticker-coord-line-html';
        
        const bottomSpan = document.createElement('span');
        bottomSpan.className = 'sticker-coord-part-html bottom';
        bottomSpan.textContent = parts[1].padStart(2, '0');
        
        circleOverlay.appendChild(topSpan);
        circleOverlay.appendChild(lineDiv);
        circleOverlay.appendChild(bottomSpan);
      } else {
        const textSpan = document.createElement('span');
        textSpan.className = 'sticker-coord-text-html';
        textSpan.textContent = fields.coordinate.padStart(2, '0');
        circleOverlay.appendChild(textSpan);
      }
      
      wrapper.appendChild(circleOverlay);
    }
  }

  // Update Top Toggle Controls display text and button states
  function updateFormationControls() {
    const f = formations[activeFormationIdx];
    activeFormNum.textContent = String(activeFormationIdx + 1).padStart(2, '0');
    activeFormTitle.textContent = f.name;
    
    prevBtn.disabled = (activeFormationIdx === 0);
    nextBtn.disabled = (activeFormationIdx === formations.length - 1);
  }

  // Sync highlighting of detail cards and walkthrough steps
  function syncActiveCardAndStep() {
    const activeKey = formations[activeFormationIdx].key;
    
    // Detail Card Highlight and Auto-scroll
    unhighlightAllCards();
    const card = document.getElementById(`card-${activeKey}`);
    if (card) {
      // Scroll into view but do not highlight/change color as per request
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Walkthrough Step Highlight
    const steps = document.querySelectorAll('.nav-step-item');
    steps.forEach((s, idx) => {
      if (idx === activeFormationIdx) {
        s.classList.add('active');
        s.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        s.classList.remove('active');
      }
    });
  }

  // Highlight detail card from map hover
  function highlightFormationCard(key) {
    unhighlightAllCards();
    const card = document.getElementById(`card-${key}`);
    if (card) {
      // Scroll card container into view but do not highlight as per request
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function unhighlightAllCards() {
    const cards = document.querySelectorAll('.formation-card');
    cards.forEach(c => c.classList.remove('highlighted'));
  }

  // Highlight relative point on map from card click
  function highlightFormation(key) {
    unhighlightAllCards();
    const card = document.getElementById(`card-${key}`);
    // Disabled card highlighted class toggle as per request
    
    const allPts = document.querySelectorAll('.path-point');
    allPts.forEach(pt => pt.classList.remove('active-formation'));
    
    const localPt = document.getElementById(`local-point-${key}`);
    if (localPt) localPt.classList.add('active-formation');
  }

  // Render step navigation flow walkthrough list
  function updateNavigationSteps() {
    navStepsFlow.innerHTML = '';
    const fields = getPerformerFields(currentPerformer);
    
    formations.forEach((f, idx) => {
      const item = document.createElement('div');
      item.className = 'nav-step-item';
      
      const dot = document.createElement('div');
      dot.className = 'nav-step-dot';
      item.appendChild(dot);
      
      const content = document.createElement('div');
      content.className = 'nav-step-content';
      
      const title = document.createElement('div');
      title.className = 'nav-step-title';
      
      let coordStr = f.key === 'basic' ? fields.coordinate : currentPerformer[f.key];
      
      const stepName = document.createElement('span');
      stepName.className = 'step-name';
      stepName.textContent = `${idx + 1}. ${f.name}`;
      
      const stepCoord = document.createElement('span');
      stepCoord.className = 'step-coord';
      stepCoord.textContent = coordStr;
      
      title.appendChild(stepName);
      title.appendChild(stepCoord);
      content.appendChild(title);
      
      const descr = document.createElement('div');
      descr.className = 'nav-step-descr';
      
      if (f.key === 'basic') {
        descr.innerHTML = `<strong>起點就位</strong>：至起點座標點 <strong>(${coordStr})</strong> 就定位。`;
      } else {
        const prevKey = formations[idx - 1].key;
        let prevCoordStr = prevKey === 'basic' ? fields.coordinate : currentPerformer[prevKey];
        
        const prevCoord = parseCoordinate(prevCoordStr);
        const currentCoord = parseCoordinate(coordStr);
        
        const movement = getVectorDescription(prevCoord, currentCoord);
        const prevName = formations[idx - 1].name.split(' ')[0];
        
        descr.innerHTML = `<strong>隊形移動</strong>：從 ${prevName} <strong>(${prevCoordStr})</strong> 移動至 ${f.name.split(' ')[0]} <strong>(${coordStr})</strong>。跑法：<strong>${movement}</strong>。`;
      }
      
      content.appendChild(descr);
      item.appendChild(content);
      
      item.addEventListener('click', () => {
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
        
        // Switch tab to grid to show visual changes
        const tabGrid = document.querySelector('.mobile-tab-btn[data-tab="localGrid"]');
        if (tabGrid) tabGrid.click();
      });
      
      navStepsFlow.appendChild(item);
    });
    
    syncActiveCardAndStep();
  }

  // Get base64 representation of an HTML image element
  function getBase64FromImageEl(imgEl) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth || imgEl.width || 44;
      canvas.height = imgEl.naturalHeight || imgEl.height || 44;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error getting base64 from image element', e);
      return imgEl.src;
    }
  }

  // Convert SVG element to Canvas and return PNG base64 Data URL
  function convertSvgToPngDataUrl(svgEl, stepName = '') {
    return new Promise((resolve, reject) => {
      try {
        const clonedSvg = svgEl.cloneNode(true);
        clonedSvg.setAttribute('viewBox', '0 0 360 360');
        
        // 1. Convert relative images inside SVG to base64
        const images = clonedSvg.querySelectorAll('image');
        images.forEach(img => {
          const href = img.getAttribute('href') || img.getAttribute('xlink:href');
          if (href && !href.startsWith('data:')) {
            const filename = href.split('/').pop();
            const key = filename.split('_')[0];
            const cardImg = document.querySelector(`#card-${key} img.landmark-sticker-img`);
            if (cardImg) {
              const base64 = getBase64FromImageEl(cardImg);
              img.setAttribute('href', base64);
              img.removeAttribute('xlink:href');
            }
          }
        });
        
        // 2. Inject style sheet rules
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
          svg {
            background-color: #ffffff;
          }
          .grid-lines line {
            stroke: rgba(15, 23, 42, 0.06);
            stroke-width: 0.5px;
          }
          .grid-lines line.axis {
            stroke: rgba(15, 23, 42, 0.2);
            stroke-width: 1px;
          }
          .grid-lines text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 8px;
            fill: rgba(15, 23, 42, 0.65);
            text-anchor: middle;
          }
          .stage-watermark .watermark-bg {
            fill: #fef08a;
            stroke: none;
          }
          .stage-watermark .watermark-line {
            fill: none;
            stroke: #94a3b8;
            stroke-width: 0.75px;
          }
          .stage-watermark .watermark-line-accent {
            fill: none;
            stroke: #475569;
            stroke-width: 1.25px;
          }
          .stage-watermark .watermark-line-yellow {
            fill: none;
            stroke: #d97706;
            stroke-width: 0.75px;
          }
          .stage-watermark .watermark-rect {
            fill: #fde047;
            stroke: #475569;
            stroke-width: 1.25px;
          }
          .stage-watermark .watermark-text {
            fill: #0f172a;
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 8px;
            font-weight: bold;
            text-anchor: middle;
          }
          .local-path-line {
            fill: none;
            stroke: url(#local-path-grad);
            stroke-width: 1.75px;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 6, 4;
          }
          .local-path-line-static {
            fill: none;
            stroke: #0284c7;
            stroke-width: 1.05px;
            stroke-linecap: round;
            stroke-linejoin: round;
            opacity: 0.55;
          }
          .path-node-glow {
            opacity: 0.3;
          }
          .path-node-glow.glow-basic {
            fill: #ef4444;
          }
          .path-node-glow.glow-prev {
            fill: #0284c7;
          }
          .path-node-glow.glow-current {
            fill: #d97706;
            opacity: 0.5;
          }
          .svg-sticker-image {
            filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));
          }
          .path-label-bg {
            fill: rgba(8, 12, 20, 0.9);
            stroke: rgba(255, 255, 255, 0.08);
            stroke-width: 0.5px;
            rx: 1.2px;
          }
          .path-label-bg.bg-current {
            fill: rgba(15, 23, 42, 0.95);
            stroke: rgba(245, 158, 11, 0.3);
            stroke-width: 0.75px;
          }
          .path-label-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 4.69px;
            font-weight: 700;
            fill: #f8fafc;
            text-anchor: middle;
          }
          .path-label-text.label-current {
            fill: #fbbf24;
            font-weight: 800;
          }
          .path-label-text.label-prev {
            fill: #38bdf8;
          }
          .sticker-coord-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 5.2px;
            font-weight: bold;
            fill: #000000;
            text-anchor: middle;
          }
          .svg-pdf-title-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 15px;
            font-weight: bold;
            fill: #0f172a;
            text-anchor: middle;
          }
        `;
        clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
        
        // 2.5. Inject step name title if provided
        if (stepName) {
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleText.setAttribute('x', '180');
          titleText.setAttribute('y', '20');
          titleText.setAttribute('text-anchor', 'middle');
          titleText.setAttribute('class', 'svg-pdf-title-text');
          titleText.textContent = stepName;
          clonedSvg.appendChild(titleText);
        }
        
        // 3. Serialize to XML string
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);
        
        // 4. Create blob url
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        // 5. Draw onto a Canvas
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            
            // Fill solid white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 720, 720);
            
            // Draw SVG
            ctx.drawImage(img, 0, 0, 720, 720);
            
            // Clean URL
            URL.revokeObjectURL(blobURL);
            
            const pngURL = canvas.toDataURL('image/png');
            resolve(pngURL);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(blobURL);
          reject(err);
        };
        img.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  }

  // Download single SVG as a 1-page PDF
  function downloadSvgAsPdf(svgEl, filename, stepName) {
    return convertSvgToPngDataUrl(svgEl, stepName).then(pngDataUrl => {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [720, 720]
      });
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 720, 720);
      pdf.save(filename);
    });
  }

  // Setup Download & Modal Event Listeners
  function setupDownloadListeners() {
    const viewAllMapsBtn = document.getElementById('viewAllMapsBtn');
    const allMapsModal = document.getElementById('allMapsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    // 1. Open Modal & render previews
    viewAllMapsBtn.addEventListener('click', () => {
      if (!currentPerformer) return;
      const fields = getPerformerFields(currentPerformer);
      
      modalTitle.textContent = `${fields.name} (${fields.coordinate}) - 所有隊形定點圖`;
      modalBody.innerHTML = '';
      
      // Render 6 previews inside modal
      formations.forEach((f, idx) => {
        const card = document.createElement('div');
        card.className = 'modal-map-card';
        
        const title = document.createElement('div');
        title.className = 'modal-map-title';
        title.textContent = `${String(idx + 1).padStart(2, '0')}. ${f.name}`;
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'modal-map-preview';
        
        // Clone main SVG structure
        const previewSvg = document.getElementById('localGridSvg').cloneNode(true);
        previewSvg.setAttribute('viewBox', '0 0 360 360');
        previewSvg.removeAttribute('id');
        previewSvg.setAttribute('style', 'pointer-events: none;');
        previewSvg.querySelector('.grid-lines').innerHTML = '';
        previewSvg.querySelector('.stage-watermark').innerHTML = '';
        previewSvg.querySelector('#localPathSegments').innerHTML = '';
        previewSvg.querySelector('#localPathPoints').innerHTML = '';
        
        // Render into clone SVG
        drawLocalGridPath(previewSvg, idx);
        
        previewDiv.appendChild(previewSvg);
        
        // Download button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'control-btn modal-map-btn';
        dlBtn.innerHTML = `<i class="fa-solid fa-download"></i> 下載 PDF`;
        dlBtn.addEventListener('click', () => {
          const filename = `${fields.name}_${fields.coordinate}_${idx + 1}_${f.label}.pdf`;
          dlBtn.disabled = true;
          dlBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>...`;
          const stepName = `${String(idx + 1).padStart(2, '0')}. ${f.name}`;
          downloadSvgAsPdf(previewSvg, filename, stepName)
            .finally(() => {
              dlBtn.disabled = false;
              dlBtn.innerHTML = `<i class="fa-solid fa-download"></i> 下載 PDF`;
            });
        });
        
        card.appendChild(title);
        card.appendChild(previewDiv);
        card.appendChild(dlBtn);
        modalBody.appendChild(card);
      });
      
      allMapsModal.style.display = 'flex';
    });

    // 3. Close Modal
    closeModalBtn.addEventListener('click', () => {
      allMapsModal.style.display = 'none';
    });
    
    // Close modal on click outside container
    allMapsModal.addEventListener('click', (e) => {
      if (e.target === allMapsModal) {
        allMapsModal.style.display = 'none';
      }
    });

    // 4. Download All combined as a single multi-page PDF
    downloadAllBtn.addEventListener('click', async () => {
      if (!currentPerformer) return;
      downloadAllBtn.disabled = true;
      const originalText = downloadAllBtn.innerHTML;
      
      const fields = getPerformerFields(currentPerformer);
      
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [720, 720]
        });
        
        for (let idx = 0; idx < formations.length; idx++) {
          downloadAllBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 轉換中 (${idx + 1}/${formations.length})`;
          
          const card = modalBody.children[idx];
          if (card) {
            const svg = card.querySelector('svg');
            if (svg) {
              const f = formations[idx];
              const stepName = `${String(idx + 1).padStart(2, '0')}. ${f.name}`;
              const pngDataUrl = await convertSvgToPngDataUrl(svg, stepName);
              if (idx > 0) {
                pdf.addPage([720, 720]);
              }
              pdf.addImage(pngDataUrl, 'PNG', 0, 0, 720, 720);
            }
          }
          // Small delay to allow canvas rendering thread to breathe
          await new Promise(r => setTimeout(r, 100));
        }
        
        const filename = `${fields.name}_${fields.coordinate}_所有定點.pdf`;
        pdf.save(filename);
        
        downloadAllBtn.innerHTML = `<i class="fa-solid fa-check"></i> 下載完成`;
      } catch (err) {
        console.error('Failed to download combined PDF', err);
        downloadAllBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 錯誤`;
      }
      
      setTimeout(() => {
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = originalText;
      }, 2000);
    });
  }

  // Update viewBox of SVG based on zoom and pan offsets
  function updateSvgViewBox(svgEl) {
    if (!svgEl) return;
    const w = 360 / zoomLevel;
    const h = 360 / zoomLevel;
    const x = 180 - (180 / zoomLevel) + panX;
    const y = 180 - (180 / zoomLevel) + panY;
    svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  // Apply rotation transform to local grid content group
  function applyRotation() {
    const contentEl = document.getElementById('localGridContent');
    if (contentEl) {
      contentEl.setAttribute('transform', `rotate(${rotationAngle}, 180, 180)`);
    }
  }

  // Reset zoom, pan, and rotation variables and update
  function resetZoomAndPan() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    rotationAngle = 0;
    const svgEl = document.getElementById('localGridSvg');
    updateSvgViewBox(svgEl);
    applyRotation();
  }

  // Bind zoom and pan controls and drag/swipe handlers
  function setupZoomAndPan() {
    const svgEl = document.getElementById('localGridSvg');
    const wrapper = svgEl.parentElement; // .svg-wrapper
    
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const rotateCcwBtn = document.getElementById('rotateCcwBtn');
    const rotateCwBtn = document.getElementById('rotateCwBtn');
    
    // Zoom In
    zoomInBtn.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel * 1.25, 4.0);
      updateSvgViewBox(svgEl);
    });
    
    // Zoom Out
    zoomOutBtn.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel / 1.25, 0.5);
      updateSvgViewBox(svgEl);
    });
    
    // Zoom Reset
    zoomResetBtn.addEventListener('click', () => {
      resetZoomAndPan();
    });

    // Rotate CCW
    if (rotateCcwBtn) {
      rotateCcwBtn.addEventListener('click', () => {
        rotationAngle = (rotationAngle - 45) % 360;
        applyRotation();
      });
    }

    // Rotate CW
    if (rotateCwBtn) {
      rotateCwBtn.addEventListener('click', () => {
        rotationAngle = (rotationAngle + 45) % 360;
        applyRotation();
      });
    }
    
    // Drag/Pan Logic
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    
    function startDrag(e) {
      if (zoomLevel <= 1.0) return;
      
      // Disable dragging if starting on a landmark node
      if (e.target.closest('.path-point')) return;
      
      isDragging = true;
      svgEl.classList.add('dragging');
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      startX = clientX;
      startY = clientY;
      startPanX = panX;
      startPanY = panY;
    }
    
    function moveDrag(e) {
      if (!isDragging) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const dx = clientX - startX;
      const dy = clientY - startY;
      
      const displayWidth = wrapper.clientWidth || 320;
      const displayHeight = wrapper.clientHeight || 320;
      
      panX = startPanX - (dx * (360 / zoomLevel) / displayWidth);
      panY = startPanY - (dy * (360 / zoomLevel) / displayHeight);
      
      updateSvgViewBox(svgEl);
      
      if (e.cancelable) {
        e.preventDefault();
      }
    }
    
    function endDrag() {
      if (isDragging) {
        isDragging = false;
        svgEl.classList.remove('dragging');
      }
    }
    
    // Mouse Event Listeners
    svgEl.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    
    // Touch Event Listeners (mobile)
    svgEl.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
  }

  // Final sync check
  syncActiveCardAndStep();
});

// Tzu Chi Stage Formation - Relative Position App Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
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
  const localPath = document.getElementById('localPath');
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

  // Relative Grid coordinate configuration
  const GRID_CENTER_X = 180;
  const GRID_CENTER_Y = 180;
  let GRID_SPACING = 15; // 1 coord unit = 15 pixels
  let MAX_GRID_COORD = 10;

  // 6 Formations metadata
  const formations = [
    { key: 'basic', name: '身分證 (基本隊形)', label: '基本' },
    { key: 'circle', name: '圓型', label: '圓型' },
    { key: 'xingYuan', name: '行願', label: '行願' },
    { key: 'jingSi', name: '靜思家風', label: '靜思' },
    { key: 'lamp', name: '點一盞燈', label: '點燈' },
    { key: 'bigV', name: '大Ｖ小Ｖ隊形', label: '大V小V' }
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

  // Parse coord strings: e.g. "5.2-46.2" or "舞台上"
  function parseCoordinate(coordStr) {
    if (!coordStr) return { x: null, y: null, isText: true, text: '無資料' };
    
    const match = coordStr.trim().match(/^([0-9.]+)-([0-9.]+)$/);
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
        return p.name.toLowerCase().includes(val) || p.id.includes(val);
      }).slice(0, 8);
      
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
    
    const fields = getPerformerFields(performer);
    
    // Update summary card
    perfAvatar.textContent = fields.name.charAt(0);
    perfAvatar.className = `performer-avatar cat-${performer.category}`;
    perfName.textContent = fields.name;
    perfCategory.textContent = performer.category;
    perfCategory.className = `meta-badge cat-${performer.category}`;
    perfID.textContent = `身分證: ${fields.coordinate}`;
    
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
      
      let coordStr = '';
      if (f.key === 'basic') coordStr = fields.coordinate;
      else if (f.key === 'circle') coordStr = currentPerformer.circle;
      else if (f.key === 'xingYuan') coordStr = currentPerformer.xingYuan;
      else if (f.key === 'jingSi') coordStr = currentPerformer.jingSi;
      else if (f.key === 'lamp') coordStr = currentPerformer.lamp;
      else if (f.key === 'bigV') coordStr = currentPerformer.bigV;
      coordBadge.textContent = coordStr;
      
      // Render HTML landmark icons
      drawHtmlLandmarkIcon(iconWrapper, f.key, currentPerformer.category, fields.name);
      
      const currentCoord = parseCoordinate(coordStr);
      const basicCoord = parseCoordinate(fields.coordinate);
      
      // Calculate relative step descriptions
      if (f.key === 'basic') {
        // basic has no offset description, it is the center
      } else {
        vectorHome.textContent = getVectorDescription(basicCoord, currentCoord);
        
        const prevKey = formations[formations.findIndex(x => x.key === f.key) - 1].key;
        let prevCoordStr = '';
        if (prevKey === 'basic') prevCoordStr = fields.coordinate;
        else if (prevKey === 'circle') prevCoordStr = currentPerformer.circle;
        else if (prevKey === 'xingYuan') prevCoordStr = currentPerformer.xingYuan;
        else if (prevKey === 'jingSi') prevCoordStr = currentPerformer.jingSi;
        else if (prevKey === 'lamp') prevCoordStr = currentPerformer.lamp;
        
        const prevCoord = parseCoordinate(prevCoordStr);
        vectorPrev.textContent = getVectorDescription(prevCoord, currentCoord);
      }
      card.onclick = () => {
        const idx = formations.findIndex(x => x.key === f.key);
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      };
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
  function drawSvgLandmarkImage(parentGroup, type, category, x, y, size) {
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `images/stickers/${type}_${category}.png`);
    img.setAttribute('x', x - size / 2);
    img.setAttribute('y', y - size / 2);
    img.setAttribute('width', size);
    img.setAttribute('height', size);
    img.setAttribute('class', 'svg-sticker-image');
    
    // Add click event to image to sync active formation
    img.addEventListener('click', () => {
      const idx = formations.findIndex(x => x.key === type);
      activeFormationIdx = idx;
      updateFormationControls();
      drawLocalGridPath();
      syncActiveCardAndStep();
    });
    
    parentGroup.appendChild(img);
  }

  // Draw relative coordinate grid path centered at basic ID (0,0) (standard unrotated axes)
  function drawLocalGridPath() {
    if (!currentPerformer) return;
    
    const fields = getPerformerFields(currentPerformer);
    // Home coordinates
    const homeCoord = parseCoordinate(fields.coordinate);
    const category = currentPerformer.category;

    // Calculate dynamic scale based on maximum coordinate offset of points to display
    let maxOffset = 0;
    const tempPoints = formations.map((f) => {
      let coordStr = '';
      if (f.key === 'basic') coordStr = fields.coordinate;
      else if (f.key === 'circle') coordStr = currentPerformer.circle;
      else if (f.key === 'xingYuan') coordStr = currentPerformer.xingYuan;
      else if (f.key === 'jingSi') coordStr = currentPerformer.jingSi;
      else if (f.key === 'lamp') coordStr = currentPerformer.lamp;
      else if (f.key === 'bigV') coordStr = currentPerformer.bigV;
      
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
    
    const displayedIndices = [0];
    if (activeFormationIdx > 0) {
      displayedIndices.push(activeFormationIdx - 1);
      displayedIndices.push(activeFormationIdx);
    }
    
    displayedIndices.forEach(idx => {
      const pt = tempPoints[idx];
      maxOffset = Math.max(maxOffset, Math.abs(pt.dx_rel), Math.abs(pt.dy_rel));
    });
    
    // Determine MAX_GRID_COORD and GRID_SPACING dynamically
    MAX_GRID_COORD = 4;
    while (MAX_GRID_COORD < maxOffset + 1.5) {
      MAX_GRID_COORD += 4;
    }
    GRID_SPACING = 150 / MAX_GRID_COORD;

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
    
    stageWatermark.innerHTML = '';
    localGridLines.innerHTML = '';
    localPathPoints.innerHTML = '';
    
    // Update grid clipping path rect
    const gridClipRect = document.getElementById('gridClipRect');
    if (gridClipRect) {
      gridClipRect.setAttribute('x', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('y', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('width', 2 * MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('height', 2 * MAX_GRID_COORD * GRID_SPACING);
    }
    
    // Draw Stage B blueprint watermark background
    if (!homeCoord.isText) {
      // 0. Draw Stage Background to mask the grid lines underneath
      // Runway Background: Col = -8 to -2, running vertically
      const bg_x1_rel = -8 - homeCoord.x;
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
      stageWatermark.appendChild(bgRect);
      
      // Stage B Circular Background: Col = -6, Row = 37, Radius = 10.5
      const stageB_dx_rel = -6 - homeCoord.x;
      const stageB_dy_rel = 37 - homeCoord.y;
      const stageB_svg = gridToSvg(stageB_dx_rel, stageB_dy_rel);
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', stageB_svg.x);
      bgCircle.setAttribute('cy', stageB_svg.y);
      bgCircle.setAttribute('r', 10.5 * GRID_SPACING);
      bgCircle.setAttribute('class', 'watermark-bg');
      stageWatermark.appendChild(bgCircle);

      // 1. Draw Runway Central Rectangle: Col = -8 to -4, Row = 32 to 42
      const rect_x1_rel = -8 - homeCoord.x;
      const rect_y1_rel = 32 - homeCoord.y;
      const rect_svgTopLeft = gridToSvg(rect_x1_rel, rect_y1_rel);
      const rect_width = 4 * GRID_SPACING;
      const rect_height = 10 * GRID_SPACING;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', rect_svgTopLeft.x);
      rect.setAttribute('y', rect_svgTopLeft.y);
      rect.setAttribute('width', rect_width);
      rect.setAttribute('height', rect_height);
      rect.setAttribute('class', 'watermark-rect');
      stageWatermark.appendChild(rect);
      
      // 2. Draw 13 bulging concentric lines representing stage B circles and runway steps
      // Radii range from 4.5 to 10.5 in steps of 0.5
      for (let i = 0; i <= 12; i++) {
        const R_i = 4.5 + i * 0.5;
        // Runway offset at top and bottom (representing steps width 2.0 to 4.0 relative to center -6)
        const W_i = 2.0 + i * (2.0 / 12.0);
        
        // Relative column coordinates for left, mid, right
        const col_top = -6 + W_i - homeCoord.x;
        const col_mid = -6 + R_i - homeCoord.x;
        const col_bottom = -6 + W_i - homeCoord.x;
        
        // Rel rows for transition points
        const row_top_start = -MAX_GRID_COORD;
        const row_top_curve = 37 - 12 - homeCoord.y;
        const row_mid = 37 - homeCoord.y;
        const row_bottom_curve = 37 + 12 - homeCoord.y;
        const row_bottom_end = MAX_GRID_COORD;
        
        // Project to SVG coordinates
        const x_top = GRID_CENTER_X + col_top * GRID_SPACING;
        const x_mid = GRID_CENTER_X + col_mid * GRID_SPACING;
        const x_bottom = GRID_CENTER_X + col_bottom * GRID_SPACING;
        
        const y_top_start = GRID_CENTER_Y + row_top_start * GRID_SPACING;
        const y_top_curve = GRID_CENTER_Y + row_top_curve * GRID_SPACING;
        const y_mid = GRID_CENTER_Y + row_mid * GRID_SPACING;
        const y_bottom_curve = GRID_CENTER_Y + row_bottom_curve * GRID_SPACING;
        const y_bottom_end = GRID_CENTER_Y + row_bottom_end * GRID_SPACING;
        
        // Cubic bezier control Y coordinates
        const y_control_top = GRID_CENTER_Y + (37 - 6 - homeCoord.y) * GRID_SPACING;
        const y_control_bottom = GRID_CENTER_Y + (37 + 6 - homeCoord.y) * GRID_SPACING;
        
        // Construct SVG path string
        const pathD = `M ${x_top} ${y_top_start} ` +
                      `L ${x_top} ${y_top_curve} ` +
                      `C ${x_top} ${y_control_top}, ${x_mid} ${y_control_top}, ${x_mid} ${y_mid} ` +
                      `C ${x_mid} ${y_control_bottom}, ${x_bottom} ${y_control_bottom}, ${x_bottom} ${y_bottom_curve} ` +
                      `L ${x_bottom} ${y_bottom_end}`;
                      
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        
        // Alternate colors: odd indices (yellow), even indices (gray)
        if (i % 2 === 1) {
          path.setAttribute('class', 'watermark-line-yellow');
        } else {
          // Highlight outermost boundary line (index 12, R = 10.5)
          if (i === 12) {
            path.setAttribute('class', 'watermark-line-accent');
          } else {
            path.setAttribute('class', 'watermark-line');
          }
        }
        stageWatermark.appendChild(path);
      }
      
      // 3. Draw radial stairs/steps on Stage B: radiating from center (-6, 37)
      // Since it's centered at Col = -6, Row = 37:
      
      // Radial stairs radiating outwards to the right (angles from -45 to 45)
      const angles = [-45, -30, -15, 0, 15, 30, 45];
      angles.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const r_start = 4.5 * GRID_SPACING; // Innermost step circle
        const r_end = 10.5 * GRID_SPACING;  // Outermost step circle
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', stageB_svg.x + r_start * Math.cos(rad));
        line.setAttribute('y1', stageB_svg.y + r_start * Math.sin(rad));
        line.setAttribute('x2', stageB_svg.x + r_end * Math.cos(rad));
        line.setAttribute('y2', stageB_svg.y + r_end * Math.sin(rad));
        line.setAttribute('class', 'watermark-line');
        stageWatermark.appendChild(line);
      });
      
      // 4. Draw Faint text label "乙舞台" centered at (-6, 37)
      const stageBText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      stageBText.setAttribute('x', stageB_svg.x);
      stageBText.setAttribute('y', stageB_svg.y + 3);
      stageBText.setAttribute('class', 'watermark-text');
      stageBText.textContent = '乙舞台';
      stageWatermark.appendChild(stageBText);
    }
    
    // Draw background grid lines (centered at 180, 180) - horizontal and vertical
    for (let i = -MAX_GRID_COORD; i <= MAX_GRID_COORD; i++) {
      const posOffset = i * GRID_SPACING;
      
      // Vertical line (constant X offset, running vertically along Y)
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y1', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      vLine.setAttribute('x2', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y2', GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING);
      if (i === 0) vLine.setAttribute('class', 'axis');
      localGridLines.appendChild(vLine);
      
      // Horizontal line (constant Y offset, running horizontally along X)
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hLine.setAttribute('x1', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y1', GRID_CENTER_Y + posOffset);
      hLine.setAttribute('x2', GRID_CENTER_X + MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y2', GRID_CENTER_Y + posOffset);
      if (i === 0) hLine.setAttribute('class', 'axis');
      localGridLines.appendChild(hLine);
      
      // Grid coordinates labels (every labelStep units)
      if (i % labelStep === 0 && i !== 0) {
        // Label for Cartesian X (Column index) along the horizontal axis
        const xText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xText.setAttribute('x', GRID_CENTER_X + posOffset);
        xText.setAttribute('y', GRID_CENTER_Y + 11);
        if (!homeCoord.isText) {
          const val = - (homeCoord.x + i);
          xText.textContent = val.toFixed(1).replace('.0', '');
        } else {
          xText.textContent = i > 0 ? `右${i}` : `左${Math.abs(i)}`;
        }
        localGridLines.appendChild(xText);
        
        // Label for Cartesian Y (Row index) along the vertical axis
        const yText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yText.setAttribute('x', GRID_CENTER_X - 10);
        yText.setAttribute('y', GRID_CENTER_Y + posOffset + 3);
        if (!homeCoord.isText) {
          const val = homeCoord.y + i;
          yText.textContent = val.toFixed(1).replace('.0', '');
        } else {
          yText.textContent = i > 0 ? `後${i}` : `前${Math.abs(i)}`;
        }
        localGridLines.appendChild(yText);
      }
    }
    
    // Add center coordinate label "身分證 (0,0)"
    const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerText.setAttribute('x', GRID_CENTER_X - 25);
    centerText.setAttribute('y', GRID_CENTER_Y - 10);
    centerText.setAttribute('fill', 'var(--red-color)');
    centerText.setAttribute('font-weight', 'bold');
    centerText.textContent = `身分證 (${fields.name})`;
    localGridLines.appendChild(centerText);
    
    // Calculate relative coordinates and map to SVG coords
    const allPoints = formations.map((f, idx) => {
      let coordStr = '';
      if (f.key === 'basic') coordStr = fields.coordinate;
      else if (f.key === 'circle') coordStr = currentPerformer.circle;
      else if (f.key === 'xingYuan') coordStr = currentPerformer.xingYuan;
      else if (f.key === 'jingSi') coordStr = currentPerformer.jingSi;
      else if (f.key === 'lamp') coordStr = currentPerformer.lamp;
      else if (f.key === 'bigV') coordStr = currentPerformer.bigV;
      
      const coord = parseCoordinate(coordStr);
      
      // Calculate relative offsets (in grid units)
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        // Use pre-mapped mock offsets for text coordinates so they draw visually
        dx_rel = coord.mockX;
        dy_rel = coord.mockY;
      }
      
      // Project using standard gridToSvg
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
    
    // Filter points to display at most 3 coordinates: Basic, Previous, Current
    const pointsToDisplay = [];
    
    // Always include Basic (index 0)
    pointsToDisplay.push({
      ...allPoints[0],
      role: 'basic',
      roleLabel: '身分證(起點)'
    });
    
    if (activeFormationIdx > 0) {
      const prevIdx = activeFormationIdx - 1;
      const currIdx = activeFormationIdx;
      
      if (prevIdx > 0) {
        // Previous is a separate node
        pointsToDisplay.push({
          ...allPoints[prevIdx],
          role: 'prev',
          roleLabel: `上一個: ${allPoints[prevIdx].label}`
        });
      } else {
        // Active index is 1 (Circle). Basic (index 0) is also the Previous node.
        pointsToDisplay[0].roleLabel = '身分證 (上一個位置)';
        pointsToDisplay[0].isAlsoPrev = true;
      }
      
      // Include Current node
      pointsToDisplay.push({
        ...allPoints[currIdx],
        role: 'current',
        roleLabel: `目前: ${allPoints[currIdx].label}`
      });
      
      // Construct and show the path line from Previous to Current
      const prevPt = allPoints[prevIdx];
      const currPt = allPoints[currIdx];
      if (prevPt.pos.x !== currPt.pos.x || prevPt.pos.y !== currPt.pos.y) {
        const pathD = `M ${prevPt.pos.x} ${prevPt.pos.y} L ${currPt.pos.x} ${currPt.pos.y}`;
        localPath.setAttribute('d', pathD);
        localPath.style.display = 'block';
        
        // Ensure marker fill color is gold to match the path gradient destination
        const markerPath = document.querySelector('#local-arrow path');
        if (markerPath) {
          markerPath.setAttribute('fill', '#fbbf24');
        }
      } else {
        localPath.style.display = 'none';
      }
    } else {
      // activeFormationIdx is 0 (Basic only). Style basic as current.
      pointsToDisplay[0].roleLabel = '目前位置 (身分證)';
      pointsToDisplay[0].role = 'current';
      localPath.style.display = 'none';
    }
    
    // Render Display Nodes on SVG
    pointsToDisplay.forEach(pt => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `path-point pt-${pt.key} role-${pt.role} ${pt.key === formations[activeFormationIdx].key ? 'active-formation' : ''}`);
      g.setAttribute('id', `local-point-${pt.key}`);
      
      // Background glow circle
      const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCircle.setAttribute('cx', pt.pos.x);
      glowCircle.setAttribute('cy', pt.pos.y);
      glowCircle.setAttribute('r', '16');
      
      if (pt.role === 'current') {
        glowCircle.setAttribute('class', 'path-node-glow glow-current');
      } else if (pt.role === 'prev') {
        glowCircle.setAttribute('class', 'path-node-glow glow-prev');
      } else {
        glowCircle.setAttribute('class', 'path-node-glow glow-basic');
      }
      g.appendChild(glowCircle);
      
      // Render the sticker image (size = 28px)
      drawSvgLandmarkImage(g, pt.key, category, pt.pos.x, pt.pos.y, 28);
      
      // Sync on node click
      g.addEventListener('click', () => {
        const idx = formations.findIndex(x => x.key === pt.key);
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      });
      
      localPathPoints.appendChild(g);
    });

    // Update top coordinate display bar above the SVG map
    const coordBar = document.getElementById('mapCoordDisplayBar');
    if (coordBar) {
      coordBar.innerHTML = '';
      pointsToDisplay.forEach(pt => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `map-coord-item ${pt.role === 'current' ? 'active-node' : ''}`;
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'label';
        
        let roleName = '';
        if (pt.role === 'basic') {
          roleName = pt.isAlsoPrev ? '身分證(上一個)' : '身分證(起點)';
        } else if (pt.role === 'prev') {
          roleName = `上一個: ${pt.label}`;
        } else {
          roleName = `目前: ${pt.label}`;
        }
        labelSpan.textContent = roleName;
        
        const valSpan = document.createElement('span');
        valSpan.className = 'val';
        if (!pt.coord.isText) {
          valSpan.textContent = `${pt.coord.text} (-${pt.coord.x.toFixed(1).replace('.0', '')}, ${pt.coord.y.toFixed(1).replace('.0', '')})`;
        } else {
          valSpan.textContent = pt.coord.text;
        }
        
        itemDiv.appendChild(labelSpan);
        itemDiv.appendChild(valSpan);
        coordBar.appendChild(itemDiv);
      });
    }

    // Update movement guide text below the map
    const mapMovementGuide = document.getElementById('mapMovementGuide');
    if (mapMovementGuide) {
      const f = formations[activeFormationIdx];
      let coordStr = '';
      if (f.key === 'basic') coordStr = fields.coordinate;
      else if (f.key === 'circle') coordStr = currentPerformer.circle;
      else if (f.key === 'xingYuan') coordStr = currentPerformer.xingYuan;
      else if (f.key === 'jingSi') coordStr = currentPerformer.jingSi;
      else if (f.key === 'lamp') coordStr = currentPerformer.lamp;
      else if (f.key === 'bigV') coordStr = currentPerformer.bigV;

      if (activeFormationIdx === 0) {
        mapMovementGuide.innerHTML = `<i class="fa-solid fa-street-view" style="color: var(--red-color); margin-right: 5px;"></i><strong>起點就位</strong>：至身分證座標點 <strong>(${coordStr})</strong> 就定位。`;
      } else {
        const prevKey = formations[activeFormationIdx - 1].key;
        let prevCoordStr = '';
        if (prevKey === 'basic') prevCoordStr = fields.coordinate;
        else if (prevKey === 'circle') prevCoordStr = currentPerformer.circle;
        else if (prevKey === 'xingYuan') prevCoordStr = currentPerformer.xingYuan;
        else if (prevKey === 'jingSi') prevCoordStr = currentPerformer.jingSi;
        else if (prevKey === 'lamp') prevCoordStr = currentPerformer.lamp;
        
        const prevCoord = parseCoordinate(prevCoordStr);
        const currentCoord = parseCoordinate(coordStr);
        
        const movement = getVectorDescription(prevCoord, currentCoord);
        const prevName = formations[activeFormationIdx - 1].name.split(' ')[0];
        
        mapMovementGuide.innerHTML = `<i class="fa-solid fa-route" style="color: var(--blue-color); margin-right: 5px;"></i><strong>隊形移動</strong>：從 ${prevName} <strong>(${prevCoordStr})</strong> 移動至 ${f.name.split(' ')[0]} <strong>(${coordStr})</strong>。<br>跑法：<strong>${movement}</strong>。`;
      }
    }
  }

  // Draw Card Landmark Icon in HTML using the cropped PNG stickers
  function drawHtmlLandmarkIcon(wrapper, type, category, id) {
    wrapper.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = `images/stickers/${type}_${category}.png`;
    img.className = 'landmark-sticker-img';
    img.alt = `${type} sticker`;
    
    img.onerror = () => {
      console.error(`Failed to load sticker: images/stickers/${type}_${category}.png`);
      wrapper.textContent = type;
    };
    
    wrapper.appendChild(img);
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
      card.classList.add('highlighted');
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
      card.classList.add('highlighted');
      // Scroll card container into view inside screen
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
    if (card) card.classList.add('highlighted');
    
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
      
      let coordStr = '';
      if (f.key === 'basic') coordStr = fields.coordinate;
      else if (f.key === 'circle') coordStr = currentPerformer.circle;
      else if (f.key === 'xingYuan') coordStr = currentPerformer.xingYuan;
      else if (f.key === 'jingSi') coordStr = currentPerformer.jingSi;
      else if (f.key === 'lamp') coordStr = currentPerformer.lamp;
      else if (f.key === 'bigV') coordStr = currentPerformer.bigV;
      
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
        descr.innerHTML = `<strong>起點就位</strong>：至身分證座標點 <strong>(${coordStr})</strong> 就定位。`;
      } else {
        const prevKey = formations[idx - 1].key;
        let prevCoordStr = '';
        if (prevKey === 'basic') prevCoordStr = fields.coordinate;
        else if (prevKey === 'circle') prevCoordStr = currentPerformer.circle;
        else if (prevKey === 'xingYuan') prevCoordStr = currentPerformer.xingYuan;
        else if (prevKey === 'jingSi') prevCoordStr = currentPerformer.jingSi;
        else if (prevKey === 'lamp') prevCoordStr = currentPerformer.lamp;
        
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
});

/* ═══════════════════════════════════════════════════════════
   IMCS — Factory Layout Designer  (Canvas Engine)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Constants ──
  const STATUS_COLORS = { running: '#107e3e', idle: '#0a6ed1', maintenance: '#e9730c', down: '#bb0000' };
  const GRID_SIZE = 40;
  const MACHINE_W = 80, MACHINE_H = 60;
  const ICONS = { 'CNC Machine': '⚙️', 'Lathe': '🔩', 'Robot Arm': '🤖', 'Conveyor': '➡️', 'Press': '🔨', 'Welding Station': '🔥', 'Inspection': '🔬', 'Packaging': '📦', 'Storage': '🏗️', 'Generator': '⚡' };

  // ── State ──
  let canvas, ctx, mmCanvas, mmCtx, container;
  let W = 800, H = 600;
  let cam = { x: 0, y: 0, zoom: 1 };
  let showGrid = true, snapGrid = true;
  let tool = 'select'; // select | zone | connect
  let machines = []; // placed machine objects
  let zones = []; // zone rectangles
  let connections = []; // {from, to} machine ids
  let selected = null; // { type:'machine'|'zone', idx }
  let dragging = null; // drag state
  let connecting = null; // partial connection source idx
  let zoneDrawing = null; // {sx,sy,ex,ey} while drawing zone
  let isPanning = false, panStart = { x: 0, y: 0 };
  let dbMachines = []; // machines from API
  let savedLayouts = [];
  let nextId = 1;
  let highlightId = null;
  let animationEnabled = true;
  let animationStart = performance.now();
  let syncState = { online: null, lastSyncAt: null };
  let viewMode = '2d';
  let productionLines = [];
  let layers = { machines: true, connections: true, zones: true };
  let viewer3D = { renderer: null, scene: null, camera: null, controls: null, rafId: null, fallback: null };

  // ── Init ──
  function init() {
    canvas = document.getElementById('factoryCanvas');
    ctx = canvas.getContext('2d');
    mmCanvas = document.getElementById('minimapCanvas');
    mmCtx = mmCanvas.getContext('2d');
    container = document.getElementById('canvasContainer');
    resize();
    window.addEventListener('resize', resize);
    bindEvents();
    bindToolbar();
    bindPaletteDrag();
    bind3DViewer();
    loadDBMachines();
    loadSavedLayouts();
    refreshLiveStatus();
    setInterval(refreshLiveStatus, 15000);
    requestAnimationFrame(animationLoop);
    render();
  }

  function resize() {
    W = container.clientWidth;
    H = container.clientHeight;
    canvas.width = W; canvas.height = H;
    mmCanvas.width = 180; mmCanvas.height = 120;
    render();
  }

  // ── Coordinate helpers ──
  function screenToWorld(sx, sy) {
    return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
  }
  function worldToScreen(wx, wy) {
    return { x: wx * cam.zoom + cam.x, y: wy * cam.zoom + cam.y };
  }
  function snap(v) { return snapGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v; }

  // ── Render ──
  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // Grid
    if (showGrid) drawGrid();

    // Zones
    if (layers.zones) zones.forEach((z, i) => {
      ctx.fillStyle = z.color + '22';
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 2 / cam.zoom;
      ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([]);
      // Zone label
      ctx.fillStyle = z.color;
      ctx.font = `bold ${13 / cam.zoom}px Tahoma,Arial,sans-serif`;
      ctx.fillText(z.name || 'Zone', z.x + 6 / cam.zoom, z.y + 16 / cam.zoom);
      // Selection
      if (selected && selected.type === 'zone' && selected.idx === i) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / cam.zoom;
        ctx.setLineDash([4 / cam.zoom, 3 / cam.zoom]);
        ctx.strokeRect(z.x - 3 / cam.zoom, z.y - 3 / cam.zoom, z.w + 6 / cam.zoom, z.h + 6 / cam.zoom);
        ctx.setLineDash([]);
      }
    });

    // Zone drawing preview
    if (zoneDrawing) {
      let zx = Math.min(zoneDrawing.sx, zoneDrawing.ex), zy = Math.min(zoneDrawing.sy, zoneDrawing.ey);
      let zw = Math.abs(zoneDrawing.ex - zoneDrawing.sx), zh = Math.abs(zoneDrawing.ey - zoneDrawing.sy);
      ctx.fillStyle = '#0a6ed122'; ctx.strokeStyle = '#0a6ed1';
      ctx.lineWidth = 2 / cam.zoom; ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
      ctx.fillRect(zx, zy, zw, zh); ctx.strokeRect(zx, zy, zw, zh);
      ctx.setLineDash([]);
    }

    // Connections
    if (layers.connections) connections.forEach(c => {
      let from = machines.find(m => m.id === c.from);
      let to = machines.find(m => m.id === c.to);
      if (!from || !to) return;
      let fx = from.x + MACHINE_W / 2, fy = from.y + MACHINE_H / 2;
      let tx = to.x + MACHINE_W / 2, ty = to.y + MACHINE_H / 2;
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2 / cam.zoom;
      ctx.setLineDash([8 / cam.zoom, 4 / cam.zoom]);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
      // Arrow
      let angle = Math.atan2(ty - fy, tx - fx);
      let asz = 10 / cam.zoom;
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.moveTo(tx - MACHINE_W / 2 * Math.cos(angle), ty - MACHINE_H / 2 * Math.sin(angle));
      ctx.lineTo(tx - MACHINE_W / 2 * Math.cos(angle) - asz * Math.cos(angle - 0.4), ty - MACHINE_H / 2 * Math.sin(angle) - asz * Math.sin(angle - 0.4));
      ctx.lineTo(tx - MACHINE_W / 2 * Math.cos(angle) - asz * Math.cos(angle + 0.4), ty - MACHINE_H / 2 * Math.sin(angle) - asz * Math.sin(angle + 0.4));
      ctx.fill();

      if (animationEnabled) {
        let phase = ((performance.now() - animationStart) / 1300) % 1;
        let px = fx + (tx - fx) * phase;
        let py = fy + (ty - fy) * phase;
        ctx.fillStyle = '#0a6ed1';
        ctx.beginPath();
        ctx.arc(px, py, 4 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Machines
    if (layers.machines) machines.forEach((m, i) => {
      drawMachine(m, i);
    });

    // Connection in progress
    if (connecting !== null) {
      let from = machines[connecting];
      if (from) {
        let fx = from.x + MACHINE_W / 2, fy = from.y + MACHINE_H / 2;
        ctx.strokeStyle = '#0a6ed1'; ctx.lineWidth = 2 / cam.zoom;
        ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
        let mp = screenToWorld(lastMouse.x, lastMouse.y);
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(mp.x, mp.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
    renderMinimap();
    updateStatusBar();
  }

  function drawGrid() {
    ctx.strokeStyle = '#C8C8C8';
    ctx.lineWidth = 0.5 / cam.zoom;
    let vp = getViewport();
    let sx = Math.floor(vp.x / GRID_SIZE) * GRID_SIZE;
    let sy = Math.floor(vp.y / GRID_SIZE) * GRID_SIZE;
    for (let x = sx; x < vp.x + vp.w; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, vp.y); ctx.lineTo(x, vp.y + vp.h); ctx.stroke();
    }
    for (let y = sy; y < vp.y + vp.h; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(vp.x, y); ctx.lineTo(vp.x + vp.w, y); ctx.stroke();
    }
  }

  function drawMachine(m, idx) {
    let isSelected = selected && selected.type === 'machine' && selected.idx === idx;
    let isHighlight = highlightId === m.id;
    let statusColor = STATUS_COLORS[m.status] || '#999';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(m.x + 3 / cam.zoom, m.y + 3 / cam.zoom, MACHINE_W, MACHINE_H);

    // Body
    ctx.fillStyle = '#F0F0F0';
    ctx.strokeStyle = isSelected ? '#000080' : (isHighlight ? '#FF6600' : '#808080');
    ctx.lineWidth = isSelected || isHighlight ? 3 / cam.zoom : 1.5 / cam.zoom;
    ctx.fillRect(m.x, m.y, MACHINE_W, MACHINE_H);
    ctx.strokeRect(m.x, m.y, MACHINE_W, MACHINE_H);

    if (animationEnabled && m.status === 'running') {
      let pulse = 0.5 + 0.5 * Math.sin((performance.now() - animationStart) / 320);
      ctx.fillStyle = `rgba(16,126,62,${0.09 + pulse * 0.16})`;
      ctx.fillRect(m.x - 2 / cam.zoom, m.y - 2 / cam.zoom, MACHINE_W + 4 / cam.zoom, MACHINE_H + 4 / cam.zoom);
    }

    // 3D border effect
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1 / cam.zoom;
    ctx.beginPath(); ctx.moveTo(m.x, m.y + MACHINE_H); ctx.lineTo(m.x, m.y); ctx.lineTo(m.x + MACHINE_W, m.y); ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath(); ctx.moveTo(m.x + MACHINE_W, m.y); ctx.lineTo(m.x + MACHINE_W, m.y + MACHINE_H); ctx.lineTo(m.x, m.y + MACHINE_H); ctx.stroke();

    // Status bar at bottom
    ctx.fillStyle = statusColor;
    ctx.fillRect(m.x + 1, m.y + MACHINE_H - 6, MACHINE_W - 2, 5);

    // Icon
    ctx.font = `${22 / cam.zoom}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(m.icon || '⚙️', m.x + MACHINE_W / 2, m.y + MACHINE_H / 2 - 6 / cam.zoom);

    // Label
    ctx.fillStyle = '#003366';
    ctx.font = `bold ${9 / cam.zoom}px Tahoma,Arial,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let label = m.name || m.type;
    if (label.length > 12) label = label.substring(0, 11) + '…';
    ctx.fillText(label, m.x + MACHINE_W / 2, m.y + MACHINE_H - 18 / cam.zoom);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // Linked indicator
    if (m.dbId) {
      ctx.fillStyle = '#0a6ed1';
      ctx.beginPath();
      ctx.arc(m.x + MACHINE_W - 8 / cam.zoom, m.y + 8 / cam.zoom, 4 / cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight glow
    if (isHighlight) {
      ctx.strokeStyle = '#FF6600'; ctx.lineWidth = 3 / cam.zoom;
      ctx.setLineDash([5 / cam.zoom, 3 / cam.zoom]);
      ctx.strokeRect(m.x - 4 / cam.zoom, m.y - 4 / cam.zoom, MACHINE_W + 8 / cam.zoom, MACHINE_H + 8 / cam.zoom);
      ctx.setLineDash([]);
    }
  }

  function getViewport() {
    return { x: -cam.x / cam.zoom, y: -cam.y / cam.zoom, w: W / cam.zoom, h: H / cam.zoom };
  }

  function renderMinimap() {
    if (!mmCtx) return;
    mmCtx.clearRect(0, 0, 180, 120);
    mmCtx.fillStyle = '#F5F5F5'; mmCtx.fillRect(0, 0, 180, 120);

    // Calculate bounds
    let bounds = getBounds();
    let scale = Math.min(170 / Math.max(bounds.w, 200), 110 / Math.max(bounds.h, 200));
    let ox = 5 - bounds.minX * scale, oy = 5 - bounds.minY * scale;

    // Draw zones
    zones.forEach(z => {
      mmCtx.fillStyle = z.color + '33';
      mmCtx.fillRect(z.x * scale + ox, z.y * scale + oy, z.w * scale, z.h * scale);
    });

    // Draw machines
    machines.forEach(m => {
      mmCtx.fillStyle = STATUS_COLORS[m.status] || '#999';
      mmCtx.fillRect(m.x * scale + ox, m.y * scale + oy, MACHINE_W * scale, MACHINE_H * scale);
    });

    // Viewport rect
    let vp = getViewport();
    mmCtx.strokeStyle = '#bb0000'; mmCtx.lineWidth = 1.5;
    mmCtx.strokeRect(vp.x * scale + ox, vp.y * scale + oy, vp.w * scale, vp.h * scale);
  }

  function getBounds() {
    let minX = 0, minY = 0, maxX = 800, maxY = 600;
    machines.forEach(m => {
      minX = Math.min(minX, m.x); minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + MACHINE_W); maxY = Math.max(maxY, m.y + MACHINE_H);
    });
    zones.forEach(z => {
      minX = Math.min(minX, z.x); minY = Math.min(minY, z.y);
      maxX = Math.max(maxX, z.x + z.w); maxY = Math.max(maxY, z.y + z.h);
    });
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  // ── Events ──
  let lastMouse = { x: 0, y: 0 };

  function bindEvents() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('dblclick', onDblClick);
    document.addEventListener('keydown', onKeyDown);

    // Drop from palette
    canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    canvas.addEventListener('drop', onCanvasDrop);

    // Close context menu on click
    document.addEventListener('click', () => {
      document.getElementById('contextMenu').style.display = 'none';
    });

    // Context menu actions
    document.getElementById('contextMenu').addEventListener('click', onContextAction);
  }

  function hitTest(wx, wy) {
    // Test machines in reverse order (top first)
    for (let i = machines.length - 1; i >= 0; i--) {
      let m = machines[i];
      if (wx >= m.x && wx <= m.x + MACHINE_W && wy >= m.y && wy <= m.y + MACHINE_H) {
        return { type: 'machine', idx: i };
      }
    }
    // Test zones
    for (let i = zones.length - 1; i >= 0; i--) {
      let z = zones[i];
      if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) {
        return { type: 'zone', idx: i };
      }
    }
    return null;
  }

  function onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle button or Alt+click: pan
      isPanning = true;
      panStart = { x: e.clientX - cam.x, y: e.clientY - cam.y };
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (e.button !== 0) return;

    let rect = canvas.getBoundingClientRect();
    let sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    let wp = screenToWorld(sx, sy);

    if (tool === 'zone') {
      zoneDrawing = { sx: snap(wp.x), sy: snap(wp.y), ex: snap(wp.x), ey: snap(wp.y) };
      return;
    }

    if (tool === 'connect') {
      let hit = hitTest(wp.x, wp.y);
      if (hit && hit.type === 'machine') {
        if (connecting === null) {
          connecting = hit.idx;
        } else {
          if (connecting !== hit.idx) {
            connections.push({ from: machines[connecting].id, to: machines[hit.idx].id });
          }
          connecting = null;
        }
        render();
      }
      return;
    }

    // Select tool
    let hit = hitTest(wp.x, wp.y);
    if (hit) {
      selected = hit;
      if (hit.type === 'machine') {
        let m = machines[hit.idx];
        dragging = { idx: hit.idx, offX: wp.x - m.x, offY: wp.y - m.y };
      } else if (hit.type === 'zone') {
        let z = zones[hit.idx];
        dragging = { idx: hit.idx, type: 'zone', offX: wp.x - z.x, offY: wp.y - z.y };
      }
      showProperties();
    } else {
      selected = null;
      isPanning = true;
      panStart = { x: e.clientX - cam.x, y: e.clientY - cam.y };
      canvas.style.cursor = 'grabbing';
      showProperties();
    }
    render();
  }

  function onMouseMove(e) {
    let rect = canvas.getBoundingClientRect();
    let sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    lastMouse = { x: sx, y: sy };
    let wp = screenToWorld(sx, sy);

    document.getElementById('sbCursor').textContent = `${Math.round(wp.x)}, ${Math.round(wp.y)}`;

    if (isPanning) {
      cam.x = e.clientX - panStart.x;
      cam.y = e.clientY - panStart.y;
      render();
      return;
    }

    if (zoneDrawing) {
      zoneDrawing.ex = snap(wp.x);
      zoneDrawing.ey = snap(wp.y);
      render();
      return;
    }

    if (dragging) {
      if (dragging.type === 'zone') {
        let z = zones[dragging.idx];
        z.x = snap(wp.x - dragging.offX);
        z.y = snap(wp.y - dragging.offY);
      } else {
        let m = machines[dragging.idx];
        m.x = snap(wp.x - dragging.offX);
        m.y = snap(wp.y - dragging.offY);
      }
      render();
      return;
    }

    if (connecting !== null) {
      render();
    }

    // Hover cursor
    let hit = hitTest(wp.x, wp.y);
    canvas.style.cursor = hit ? 'pointer' : (tool === 'zone' ? 'crosshair' : 'default');
  }

  function onMouseUp(e) {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = tool === 'zone' ? 'crosshair' : 'default';
    }
    if (dragging) {
      dragging = null;
      refresh3DIfOpen();
    }
    if (zoneDrawing) {
      let zx = Math.min(zoneDrawing.sx, zoneDrawing.ex), zy = Math.min(zoneDrawing.sy, zoneDrawing.ey);
      let zw = Math.abs(zoneDrawing.ex - zoneDrawing.sx), zh = Math.abs(zoneDrawing.ey - zoneDrawing.sy);
      if (zw > 20 && zh > 20) {
        let modal = document.getElementById('zoneModal');
        modal.classList.remove('hidden');
        document.getElementById('zoneNameInput').value = 'Zone ' + (zones.length + 1);
        document.getElementById('zoneColorInput').value = ['#0a6ed1', '#107e3e', '#e9730c', '#9b59b6', '#3498db'][zones.length % 5];
        document.getElementById('confirmZoneBtn').onclick = () => {
          zones.push({
            id: nextId++, x: zx, y: zy, w: zw, h: zh,
            name: document.getElementById('zoneNameInput').value || 'Zone',
            color: document.getElementById('zoneColorInput').value
          });
          modal.classList.add('hidden');
          refresh3DIfOpen();
          render();
        };
      }
      zoneDrawing = null;
      render();
    }
  }

  function onWheel(e) {
    e.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newZoom = Math.max(0.2, Math.min(5, cam.zoom * delta));
    // Zoom toward cursor
    cam.x = mx - (mx - cam.x) * (newZoom / cam.zoom);
    cam.y = my - (my - cam.y) * (newZoom / cam.zoom);
    cam.zoom = newZoom;
    document.getElementById('zoomDisplay').textContent = Math.round(cam.zoom * 100) + '%';
    render();
  }

  function onContextMenu(e) {
    e.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    let hit = hitTest(wp.x, wp.y);
    if (hit) {
      selected = hit;
      showProperties();
      render();
      let cm = document.getElementById('contextMenu');
      cm.style.display = 'block';
      cm.style.left = e.clientX + 'px';
      cm.style.top = e.clientY + 'px';
    }
  }

  function onContextAction(e) {
    let action = e.target.dataset.action;
    if (!action || !selected) return;
    let cm = document.getElementById('contextMenu');
    cm.style.display = 'none';

    switch (action) {
      case 'delete': deleteSelected(); break;
      case 'duplicate':
        if (selected.type === 'machine') {
          let orig = machines[selected.idx];
          let dup = { ...orig, id: nextId++, x: orig.x + GRID_SIZE, y: orig.y + GRID_SIZE, dbId: null, name: orig.name + ' (copy)' };
          machines.push(dup);
          selected = { type: 'machine', idx: machines.length - 1 };
        }
        break;
      case 'bringFront':
        if (selected.type === 'machine') {
          let m = machines.splice(selected.idx, 1)[0];
          machines.push(m);
          selected.idx = machines.length - 1;
        }
        break;
      case 'sendBack':
        if (selected.type === 'machine') {
          let m = machines.splice(selected.idx, 1)[0];
          machines.unshift(m);
          selected.idx = 0;
        }
        break;
      case 'link':
        if (selected.type === 'machine') promptLinkMachine(selected.idx);
        break;
      case 'properties': showProperties(); break;
    }
    render();
  }

  function onDblClick(e) {
    let rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    let hit = hitTest(wp.x, wp.y);
    if (hit && hit.type === 'machine' && machines[hit.idx].dbId) {
      window.open('/machine/' + machines[hit.idx].dbId, '_blank');
    }
  }

  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    switch (e.key) {
      case 'Delete': case 'Backspace': deleteSelected(); break;
      case 'v': case 'V': setTool('select'); break;
      case 'z': case 'Z': setTool('zone'); break;
      case 'c': case 'C': if (!e.ctrlKey) setTool('connect'); break;
      case 'g': case 'G': toggleGrid(); break;
      case 's': case 'S':
        if (e.ctrlKey) { e.preventDefault(); openSaveModal(); }
        else toggleSnap();
        break;
      case 'f': case 'F': fitAll(); break;
      case 'a': case 'A': toggleAnimation(); break;
      case '3': toggleViewMode(); break;
      case '+': case '=': zoomIn(); break;
      case '-': zoomOut(); break;
      case 'Escape':
        if (is3DOpen()) close3DViewer();
        connecting = null; selected = null; zoneDrawing = null; showProperties(); render();
        break;
    }
  }

  function onCanvasDrop(e) {
    e.preventDefault();
    let type = e.dataTransfer.getData('text/machine-type');
    let icon = e.dataTransfer.getData('text/machine-icon');
    let dbId = e.dataTransfer.getData('text/machine-dbid');
    let dbName = e.dataTransfer.getData('text/machine-name');
    let dbStatus = e.dataTransfer.getData('text/machine-status');
    if (!type) return;

    let rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    machines.push({
      id: nextId++,
      type: type,
      name: dbName || type,
      icon: icon || ICONS[type] || '⚙️',
      x: snap(wp.x - MACHINE_W / 2),
      y: snap(wp.y - MACHINE_H / 2),
      status: dbStatus || 'idle',
      dbId: dbId ? parseInt(dbId) : null,
      efficiency: 0,
      capacity: '',
      powerKw: '',
      lineId: null
    });
    refresh3DIfOpen();
    render();
  }

  // ── Palette drag setup ──
  function bindPaletteDrag() {
    document.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/machine-type', el.dataset.type);
        e.dataTransfer.setData('text/machine-icon', el.dataset.icon);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  // ── Toolbar ──
  function bindToolbar() {
    document.getElementById('btnSelect').addEventListener('click', () => setTool('select'));
    document.getElementById('btnAddZone').addEventListener('click', () => setTool('zone'));
    document.getElementById('btnConnect').addEventListener('click', () => setTool('connect'));
    document.getElementById('btnToggleGrid').addEventListener('click', toggleGrid);
    document.getElementById('btnSnapGrid').addEventListener('click', toggleSnap);
    document.getElementById('btnZoomIn').addEventListener('click', zoomIn);
    document.getElementById('btnZoomOut').addEventListener('click', zoomOut);
    document.getElementById('btnFitAll').addEventListener('click', fitAll);
    document.getElementById('btnDelete').addEventListener('click', deleteSelected);
    document.getElementById('btnSave').addEventListener('click', openSaveModal);
    document.getElementById('btnExport').addEventListener('click', exportPNG);
    document.getElementById('btnAnimate').addEventListener('click', toggleAnimation);
    document.getElementById('btnSyncNow').addEventListener('click', refreshLiveStatus);
    document.getElementById('btnView3D').addEventListener('click', toggleViewMode);
    document.getElementById('btnBuildLines').addEventListener('click', buildProductionLines);
    document.getElementById('layerMachines').addEventListener('change', e => { layers.machines = e.target.checked; render(); });
    document.getElementById('layerConnections').addEventListener('change', e => { layers.connections = e.target.checked; render(); });
    document.getElementById('layerZones').addEventListener('change', e => { layers.zones = e.target.checked; render(); });

    document.getElementById('searchMachine').addEventListener('input', e => {
      let q = e.target.value.toLowerCase().trim();
      highlightId = null;
      if (q) {
        let found = machines.find(m => (m.name || m.type).toLowerCase().includes(q));
        if (found) {
          highlightId = found.id;
          cam.x = W / 2 - found.x * cam.zoom - MACHINE_W / 2 * cam.zoom;
          cam.y = H / 2 - found.y * cam.zoom - MACHINE_H / 2 * cam.zoom;
        }
      }
      render();
    });
  }

  function setTool(t) {
    tool = t;
    connecting = null;
    zoneDrawing = null;
    document.getElementById('btnSelect').classList.toggle('active', t === 'select');
    document.getElementById('btnAddZone').classList.toggle('active', t === 'zone');
    document.getElementById('btnConnect').classList.toggle('active', t === 'connect');
    canvas.style.cursor = t === 'zone' ? 'crosshair' : 'default';
    document.getElementById('sbTool').textContent = t.charAt(0).toUpperCase() + t.slice(1);
  }

  function toggleAnimation() {
    animationEnabled = !animationEnabled;
    document.getElementById('btnAnimate').classList.toggle('active', animationEnabled);
    render();
  }

  function toggleViewMode() {
    if (is3DOpen()) close3DViewer();
    else open3DViewer();
  }

  function bind3DViewer() {
    const closeBtn = document.getElementById('close3DModalBtn');
    const modal = document.getElementById('viewer3DModal');
    if (closeBtn) closeBtn.addEventListener('click', close3DViewer);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close3DViewer();
      });
    }
  }

  function is3DOpen() {
    const modal = document.getElementById('viewer3DModal');
    return modal && !modal.classList.contains('hidden');
  }

  function open3DViewer() {
    const modal = document.getElementById('viewer3DModal');
    if (!modal) return;
    viewMode = '3d';
    modal.classList.remove('hidden');
    document.getElementById('btnView3D').classList.add('active');
    document.getElementById('sbViewMode').textContent = '3D';
    init3DScene();
    if (!viewer3D.renderer) return;
    rebuild3DScene();
  }

  function close3DViewer() {
    const modal = document.getElementById('viewer3DModal');
    if (!modal) return;
    viewMode = '2d';
    modal.classList.add('hidden');
    document.getElementById('btnView3D').classList.remove('active');
    document.getElementById('sbViewMode').textContent = '2D';
    if (viewer3D.rafId) cancelAnimationFrame(viewer3D.rafId);
    viewer3D.rafId = null;
  }

  function init3DScene() {
    if (viewer3D.renderer) return;
    const root = document.getElementById('factory3DViewport');
    if (!root) return;
    if (!window.THREE) {
      show3DError('3D library failed to load. Please check internet/CDN access and refresh.');
      return;
    }

    viewer3D.scene = new THREE.Scene();
    viewer3D.scene.background = new THREE.Color(0x111827);

    const w = root.clientWidth || 900;
    const h = root.clientHeight || 500;
    viewer3D.camera = new THREE.PerspectiveCamera(55, w / h, 1, 5000);
    viewer3D.camera.position.set(420, 360, 420);

    try {
      viewer3D.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err) {
      show3DError('WebGL is not available in this browser/GPU settings.');
      return;
    }
    viewer3D.renderer.setPixelRatio(window.devicePixelRatio || 1);
    viewer3D.renderer.setSize(w, h);
    root.innerHTML = '';
    root.appendChild(viewer3D.renderer.domElement);

    const Orbit = (window.THREE && window.THREE.OrbitControls) || window.OrbitControls;
    if (Orbit) {
      viewer3D.controls = new Orbit(viewer3D.camera, viewer3D.renderer.domElement);
      viewer3D.controls.enableDamping = true;
      viewer3D.controls.dampingFactor = 0.06;
      viewer3D.controls.target.set(220, 0, 180);
      viewer3D.fallback = null;
    } else {
      viewer3D.controls = null;
      setupFallback3DControls();
    }

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(220, 380, 180);
    viewer3D.scene.add(amb, dir);

    window.addEventListener('resize', resize3DViewer);
    animate3DViewer();
  }

  function resize3DViewer() {
    if (!viewer3D.renderer || !is3DOpen()) return;
    const root = document.getElementById('factory3DViewport');
    const w = root.clientWidth || 900;
    const h = root.clientHeight || 500;
    viewer3D.camera.aspect = w / h;
    viewer3D.camera.updateProjectionMatrix();
    viewer3D.renderer.setSize(w, h);
  }

  function animate3DViewer() {
    if (!viewer3D.renderer || !is3DOpen()) return;
    if (viewer3D.controls) viewer3D.controls.update();
    if (viewer3D.fallback) updateFallback3DCamera();
    viewer3D.renderer.render(viewer3D.scene, viewer3D.camera);
    viewer3D.rafId = requestAnimationFrame(animate3DViewer);
  }

  function rebuild3DScene() {
    if (!viewer3D.scene || !is3DOpen()) return;
    const scene = viewer3D.scene;

    for (let i = scene.children.length - 1; i >= 0; i--) {
      const obj = scene.children[i];
      if (obj.userData && obj.userData.dynamic3d) scene.remove(obj);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95, metalness: 0.05, wireframe: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.userData.dynamic3d = true;
    scene.add(floor);

    zones.forEach(z => {
      const zone = new THREE.Mesh(
        new THREE.BoxGeometry(z.w, 4, z.h),
        new THREE.MeshStandardMaterial({ color: parseInt((z.color || '#0a6ed1').replace('#', ''), 16), transparent: true, opacity: 0.35 })
      );
      zone.position.set(z.x + z.w / 2, 2, z.y + z.h / 2);
      zone.userData.dynamic3d = true;
      scene.add(zone);
    });

    machines.forEach(m => {
      const colorHex = (STATUS_COLORS[m.status] || '#777777').replace('#', '');
      const lineBoost = (m.lineId ? (m.lineId % 4) * 0.8 : 0);
      const height = 24 + lineBoost;
      const machine = new THREE.Mesh(
        new THREE.BoxGeometry(MACHINE_W, height, MACHINE_H),
        new THREE.MeshStandardMaterial({ color: parseInt(colorHex, 16), roughness: 0.45, metalness: 0.35 })
      );
      machine.position.set(m.x + MACHINE_W / 2, height / 2, m.y + MACHINE_H / 2);
      machine.userData.dynamic3d = true;
      scene.add(machine);
    });

    connections.forEach(c => {
      const from = machines.find(m => m.id === c.from);
      const to = machines.find(m => m.id === c.to);
      if (!from || !to) return;
      const pts = [
        new THREE.Vector3(from.x + MACHINE_W / 2, 18, from.y + MACHINE_H / 2),
        new THREE.Vector3(to.x + MACHINE_W / 2, 18, to.y + MACHINE_H / 2)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x8ab4f8 }));
      line.userData.dynamic3d = true;
      scene.add(line);
    });
  }

  function refresh3DIfOpen() {
    if (is3DOpen()) rebuild3DScene();
  }

  function show3DError(message) {
    const root = document.getElementById('factory3DViewport');
    if (!root) return;
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:16px;color:#fff;background:#1f2937;font-size:13px;text-align:center;">${message}</div>`;
  }

  function setupFallback3DControls() {
    const el = viewer3D.renderer && viewer3D.renderer.domElement;
    if (!el || !viewer3D.camera) return;
    const target = new THREE.Vector3(220, 0, 180);
    const offset = viewer3D.camera.position.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    viewer3D.fallback = {
      target,
      spherical,
      drag: null,
      panSpeed: 0.6,
      orbitSpeed: 0.006
    };

    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mousedown', (e) => {
      viewer3D.fallback.drag = { button: e.button, x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => {
      if (viewer3D.fallback) viewer3D.fallback.drag = null;
    });
    window.addEventListener('mousemove', (e) => {
      const fb = viewer3D.fallback;
      if (!fb || !fb.drag || !is3DOpen()) return;
      const dx = e.clientX - fb.drag.x;
      const dy = e.clientY - fb.drag.y;
      fb.drag.x = e.clientX;
      fb.drag.y = e.clientY;

      if (fb.drag.button === 2) {
        const right = new THREE.Vector3();
        viewer3D.camera.getWorldDirection(right);
        right.cross(viewer3D.camera.up).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        fb.target.addScaledVector(right, -dx * fb.panSpeed);
        fb.target.addScaledVector(up, dy * fb.panSpeed * 0.4);
      } else {
        fb.spherical.theta -= dx * fb.orbitSpeed;
        fb.spherical.phi -= dy * fb.orbitSpeed;
        fb.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.2, fb.spherical.phi));
      }
    });
    el.addEventListener('wheel', (e) => {
      const fb = viewer3D.fallback;
      if (!fb) return;
      e.preventDefault();
      fb.spherical.radius *= e.deltaY > 0 ? 1.08 : 0.92;
      fb.spherical.radius = Math.max(80, Math.min(2200, fb.spherical.radius));
    }, { passive: false });
  }

  function updateFallback3DCamera() {
    const fb = viewer3D.fallback;
    if (!fb || !viewer3D.camera) return;
    const offset = new THREE.Vector3().setFromSpherical(fb.spherical);
    viewer3D.camera.position.copy(fb.target).add(offset);
    viewer3D.camera.lookAt(fb.target);
  }

  function buildProductionLines() {
    const out = new Map();
    const indeg = new Map();
    machines.forEach(m => { out.set(m.id, []); indeg.set(m.id, 0); });
    connections.forEach(c => {
      if (out.has(c.from) && indeg.has(c.to)) {
        out.get(c.from).push(c.to);
        indeg.set(c.to, indeg.get(c.to) + 1);
      }
    });
    const starts = machines.filter(m => (indeg.get(m.id) || 0) === 0);
    productionLines = [];
    starts.forEach((s, idx) => {
      const queue = [s.id];
      const visited = new Set();
      const chain = [];
      while (queue.length) {
        const cur = queue.shift();
        if (visited.has(cur)) continue;
        visited.add(cur);
        chain.push(cur);
        (out.get(cur) || []).forEach(n => { if (!visited.has(n)) queue.push(n); });
      }
      if (chain.length) productionLines.push({ id: idx + 1, machineIds: chain });
    });
    machines.forEach(m => { m.lineId = null; });
    productionLines.forEach(line => {
      line.machineIds.forEach(mid => {
        const m = machines.find(x => x.id === mid);
        if (m && !m.lineId) m.lineId = line.id;
      });
    });
    renderProductionLines();
    if (selected) showProperties();
    refresh3DIfOpen();
    render();
  }

  function renderProductionLines() {
    const list = document.getElementById('productionLinesList');
    if (!list) return;
    if (!productionLines.length) {
      list.innerHTML = 'No lines generated';
      return;
    }
    list.innerHTML = productionLines.map(line => {
      const names = line.machineIds
        .map(id => machines.find(m => m.id === id))
        .filter(Boolean)
        .map(m => m.name || m.type)
        .join(' → ');
      return `<div style="margin-bottom:8px;padding:6px;border:1px solid #C0C0C0;background:#F6F6F6;"><strong>Line ${line.id}</strong><br><span style="color:#444;">${names || '-'}</span></div>`;
    }).join('');
  }

  function toggleGrid() {
    showGrid = !showGrid;
    document.getElementById('btnToggleGrid').classList.toggle('active', showGrid);
    render();
  }

  function toggleSnap() {
    snapGrid = !snapGrid;
    document.getElementById('btnSnapGrid').classList.toggle('active', snapGrid);
  }

  function zoomIn() {
    cam.zoom = Math.min(5, cam.zoom * 1.2);
    document.getElementById('zoomDisplay').textContent = Math.round(cam.zoom * 100) + '%';
    render();
  }

  function zoomOut() {
    cam.zoom = Math.max(0.2, cam.zoom / 1.2);
    document.getElementById('zoomDisplay').textContent = Math.round(cam.zoom * 100) + '%';
    render();
  }

  function fitAll() {
    let b = getBounds();
    let pad = 60;
    let scaleX = (W - pad * 2) / Math.max(b.w, 100);
    let scaleY = (H - pad * 2) / Math.max(b.h, 100);
    cam.zoom = Math.min(scaleX, scaleY, 2);
    cam.x = (W - b.w * cam.zoom) / 2 - b.minX * cam.zoom;
    cam.y = (H - b.h * cam.zoom) / 2 - b.minY * cam.zoom;
    document.getElementById('zoomDisplay').textContent = Math.round(cam.zoom * 100) + '%';
    render();
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.type === 'machine') {
      let mid = machines[selected.idx].id;
      machines.splice(selected.idx, 1);
      connections = connections.filter(c => c.from !== mid && c.to !== mid);
    } else if (selected.type === 'zone') {
      zones.splice(selected.idx, 1);
    }
    selected = null;
    showProperties();
    refresh3DIfOpen();
    render();
  }

  // ── Properties Panel ──
  function showProperties() {
    let panel = document.getElementById('propertiesContent');
    let stats = document.getElementById('liveStatsContent');
    if (!selected) {
      panel.innerHTML = '<div style="font-size:11px;color:#888;text-align:center;padding:20px 8px;">Select a machine or zone<br>to view properties</div>';
      stats.innerHTML = '<div style="font-size:11px;color:#888;text-align:center;padding:20px 8px;">Select a linked machine<br>to view live stats</div>';
      return;
    }

    if (selected.type === 'machine') {
      let m = machines[selected.idx];
      let statusBadgeColor = STATUS_COLORS[m.status] || '#999';
      panel.innerHTML = `
        <div class="prop-row"><span class="prop-label">Name</span><input class="prop-input" id="propName" value="${m.name || m.type}"></div>
        <div class="prop-row"><span class="prop-label">Type</span><span class="prop-value">${m.type}</span></div>
        <div class="prop-row"><span class="prop-label">Status</span><span class="status-badge" style="background:${statusBadgeColor};color:#fff;">${m.status || 'idle'}</span></div>
        <div class="prop-row"><span class="prop-label">Position</span><span class="prop-value">X: ${Math.round(m.x)}, Y: ${Math.round(m.y)}</span></div>
        <div class="prop-row"><span class="prop-label">Line</span><span class="prop-value">${m.lineId ? 'Line ' + m.lineId : 'Unassigned'}</span></div>
        <div class="prop-row"><span class="prop-label">Capacity</span><input class="prop-input" id="propCapacity" value="${m.capacity || ''}" placeholder="units/hour"></div>
        <div class="prop-row"><span class="prop-label">Power</span><input class="prop-input" id="propPower" value="${m.powerKw || ''}" placeholder="kW"></div>
        <div class="prop-row"><span class="prop-label">Linked</span><span class="prop-value">${m.dbId ? 'Machine #' + m.dbId : 'Not linked'}</span></div>
        ${m.dbId ? '<button class="btn" style="width:100%;margin-top:6px;font-size:11px;" onclick="window.open(\'/machine/' + m.dbId + '\')">🔗 Open Machine Details</button>' : '<button class="btn" style="width:100%;margin-top:6px;font-size:11px;" id="propLinkBtn">🔗 Link to DB Machine</button>'}
      `;
      document.getElementById('propName').addEventListener('change', function () {
        machines[selected.idx].name = this.value;
        render();
      });
      document.getElementById('propCapacity').addEventListener('change', function () { machines[selected.idx].capacity = this.value; });
      document.getElementById('propPower').addEventListener('change', function () { machines[selected.idx].powerKw = this.value; });
      let linkBtn = document.getElementById('propLinkBtn');
      if (linkBtn) linkBtn.addEventListener('click', () => promptLinkMachine(selected.idx));

      // Live stats
      if (m.dbId) {
        let dbm = dbMachines.find(dm => dm.id === m.dbId);
        stats.innerHTML = `
          <div class="kpi-mini">
            <div class="kpi-mini-item"><div class="val">${dbm ? Math.round(dbm.efficiency || 0) + '%' : '-'}</div><div class="lbl">Efficiency</div></div>
            <div class="kpi-mini-item"><div class="val" style="color:${statusBadgeColor}">${(m.status || 'idle').toUpperCase()}</div><div class="lbl">Status</div></div>
            <div class="kpi-mini-item"><div class="val">${dbm ? dbm.type || '-' : '-'}</div><div class="lbl">Type</div></div>
            <div class="kpi-mini-item"><div class="val">${dbm ? dbm.location || '-' : '-'}</div><div class="lbl">Location</div></div>
          </div>
        `;
      } else {
        stats.innerHTML = '<div style="font-size:11px;color:#888;text-align:center;padding:20px 8px;">Link to a DB machine<br>to view live stats</div>';
      }
    } else if (selected.type === 'zone') {
      let z = zones[selected.idx];
      panel.innerHTML = `
        <div class="prop-row"><span class="prop-label">Name</span><input class="prop-input" id="propZoneName" value="${z.name}"></div>
        <div class="prop-row"><span class="prop-label">Color</span><input type="color" class="prop-color" id="propZoneColor" value="${z.color}" style="width:100%;height:28px;"></div>
        <div class="prop-row"><span class="prop-label">Size</span><span class="prop-value">${Math.round(z.w)} × ${Math.round(z.h)}</span></div>
        <div class="prop-row"><span class="prop-label">Position</span><span class="prop-value">X: ${Math.round(z.x)}, Y: ${Math.round(z.y)}</span></div>
      `;
      document.getElementById('propZoneName').addEventListener('change', function () { zones[selected.idx].name = this.value; render(); });
      document.getElementById('propZoneColor').addEventListener('input', function () { zones[selected.idx].color = this.value; render(); });
      stats.innerHTML = '<div style="font-size:11px;color:#888;text-align:center;padding:20px 8px;">Zone selected</div>';
    }
  }

  function promptLinkMachine(idx) {
    if (dbMachines.length === 0) { alert('No machines in database. Add machines in the Machinery page first.'); return; }
    let options = dbMachines.map(m => `${m.id}: ${m.name} (${m.status})`).join('\n');
    let input = prompt('Enter machine ID to link:\n\n' + options);
    if (input) {
      let dbId = parseInt(input);
      let dbm = dbMachines.find(m => m.id === dbId);
      if (dbm) {
        machines[idx].dbId = dbId;
        machines[idx].status = dbm.status || 'idle';
        machines[idx].name = dbm.name;
        machines[idx].efficiency = dbm.efficiency || 0;
        showProperties();
        render();
      }
    }
  }

  // ── API Calls ──
  async function fetchJson(url, opts) {
    try { let r = await fetch(url, opts); if (!r.ok) return null; return await r.json(); } catch { return null; }
  }

  async function loadDBMachines() {
    let data = await fetchJson('/api/machines');
    if (data) {
      dbMachines = data;
      renderDBMachinesList();
    }
  }

  async function refreshLiveStatus() {
    let data = await fetchJson('/api/machines');
    if (!data) {
      syncState.online = false;
      updateSyncIndicators();
      return;
    }
    syncState.online = true;
    syncState.lastSyncAt = new Date();
    dbMachines = data;
    renderDBMachinesList();
    machines.forEach(m => {
      if (m.dbId) {
        let dbm = data.find(d => d.id === m.dbId);
        if (dbm) {
          m.status = dbm.status || 'idle';
          m.efficiency = dbm.efficiency || 0;
        }
      }
    });
    render();
    if (selected && selected.type === 'machine') showProperties();
    updateSyncIndicators();
    refresh3DIfOpen();
  }

  function renderDBMachinesList() {
    let list = document.getElementById('dbMachinesList');
    if (dbMachines.length === 0) {
      list.innerHTML = '<div style="font-size:10px;color:#888;padding:4px;">No machines yet</div>';
      return;
    }
    list.innerHTML = dbMachines.map(m => {
      let sc = STATUS_COLORS[m.status] || '#999';
      return `<div class="palette-item" draggable="true" data-type="${m.type}" data-icon="${ICONS[m.type] || '⚙️'}" data-dbid="${m.id}" data-name="${m.name}" data-status="${m.status}">
        <div class="palette-icon" style="border-color:${sc};">${ICONS[m.type] || '⚙️'}</div>
        <div class="palette-label">${m.name}<small>${m.status} · ${Math.round(m.efficiency || 0)}%</small></div>
      </div>`;
    }).join('');
    list.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/machine-type', el.dataset.type);
        e.dataTransfer.setData('text/machine-icon', el.dataset.icon);
        e.dataTransfer.setData('text/machine-dbid', el.dataset.dbid || '');
        e.dataTransfer.setData('text/machine-name', el.dataset.name || '');
        e.dataTransfer.setData('text/machine-status', el.dataset.status || 'idle');
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  function updateSyncIndicators() {
    const syncEl = document.getElementById('sbSyncState');
    const lastEl = document.getElementById('sbLastSync');
    if (!syncEl || !lastEl) return;
    if (syncState.online === false) {
      syncEl.textContent = 'Offline';
      syncEl.style.color = '#bb0000';
    } else if (syncState.online === true) {
      syncEl.textContent = 'Connected';
      syncEl.style.color = '#107e3e';
    } else {
      syncEl.textContent = 'Connecting...';
      syncEl.style.color = '#666';
    }
    lastEl.textContent = syncState.lastSyncAt
      ? syncState.lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '-';
  }

  async function loadSavedLayouts() {
    let data = await fetchJson('/api/factory-layouts');
    savedLayouts = data || [];
    let list = document.getElementById('savedLayoutsList');
    if (!data || data.length === 0) {
      list.innerHTML = '<div style="font-size:10px;color:#888;padding:4px;">No saved layouts</div>';
      return;
    }
    list.innerHTML = data.map(l => `
      <div class="saved-layout-item" data-id="${l.id}">
        <div><span class="name">${l.name}</span><br><span class="meta">${l.created_by || ''} · ${(l.updated_at || '').substring(0, 10)}</span></div>
        <button class="del-btn" data-lid="${l.id}" title="Delete">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.saved-layout-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.classList.contains('del-btn')) return;
        loadLayout(parseInt(el.dataset.id));
      });
    });
    list.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Delete this layout?')) return;
        await fetchJson('/api/factory-layouts/' + btn.dataset.lid, { method: 'DELETE' });
        loadSavedLayouts();
      });
    });

    // Populate save mode dropdown
    let sel = document.getElementById('saveMode');
    sel.innerHTML = '<option value="new">Save as new layout</option>' +
      data.map(l => `<option value="${l.id}">Update: ${l.name}</option>`).join('');
  }

  async function loadLayout(id) {
    let data = await fetchJson('/api/factory-layouts/' + id);
    if (!data || !data.layout_data) return;
    let ld = data.layout_data;
    machines = ld.machines || [];
    zones = ld.zones || [];
    connections = ld.connections || [];
    productionLines = ld.productionLines || [];
    nextId = Math.max(...machines.map(m => m.id || 0), ...zones.map(z => z.id || 0), 0) + 1;
    selected = null;
    renderProductionLines();
    showProperties();
    fitAll();
    refreshLiveStatus();
    refresh3DIfOpen();
  }

  function openSaveModal() {
    document.getElementById('saveModal').classList.remove('hidden');
    document.getElementById('saveLayoutName').focus();
    document.getElementById('confirmSaveBtn').onclick = saveLayout;
  }

  async function saveLayout() {
    let name = document.getElementById('saveLayoutName').value.trim();
    let mode = document.getElementById('saveMode').value;
    if (!name && mode === 'new') { alert('Please enter a layout name'); return; }

    let layoutData = { machines, zones, connections, productionLines };

    if (mode === 'new') {
      await fetchJson('/api/factory-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, layout_data: layoutData })
      });
    } else {
      await fetchJson('/api/factory-layouts/' + mode, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, layout_data: layoutData })
      });
    }
    document.getElementById('saveModal').classList.add('hidden');
    loadSavedLayouts();
  }

  function exportPNG() {
    // Render clean version without selection
    let oldSel = selected;
    let oldHl = highlightId;
    selected = null; highlightId = null;
    render();

    let link = document.createElement('a');
    link.download = 'factory-layout.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    selected = oldSel; highlightId = oldHl;
    render();
  }

  function updateStatusBar() {
    document.getElementById('sbObjects').textContent = machines.length;
    document.getElementById('sbConnections').textContent = connections.length;
    document.getElementById('sbZones').textContent = zones.length;
  }

  function animationLoop() {
    if (animationEnabled) render();
    requestAnimationFrame(animationLoop);
  }

  // ── Start ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Set initial tool active states
  setTimeout(() => {
    setTool('select');
    document.getElementById('btnToggleGrid').classList.add('active');
    document.getElementById('btnSnapGrid').classList.add('active');
  }, 100);

})();

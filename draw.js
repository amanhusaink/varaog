// draw.js
document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    
    let isDrawing = false;
    let wasDragging = false;
    let currentSvg = null;
    let currentPath = null;
    let pathData = '';
    let startX = 0;
    let minX = 0;
    let maxX = 0;
    let targetContainer = null;
    let initialX = 0;
    let initialY = 0;

    // Listen for pointerdown on task items to start drawing
    taskList.addEventListener('pointerdown', (e) => {
        const container = e.target.closest('.strikethrough-container');
        if (!container) return;
        
        const li = container.closest('.task-item');
        // Ignore if already completed
        if (!li || li.classList.contains('task-completed')) return;
        
        isDrawing = true;
        wasDragging = false;
        targetContainer = container;
        
        initialX = e.clientX;
        initialY = e.clientY;
        
        const rect = container.getBoundingClientRect();
        startX = e.clientX - rect.left;
        minX = startX;
        maxX = startX;
        
        // Create live drawing SVG overlay
        currentSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        currentSvg.setAttribute('class', 'live-drawing absolute top-0 left-0 w-full h-full pointer-events-none');
        currentSvg.style.zIndex = '50';
        
        currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        currentPath.setAttribute('stroke', '#64748b'); // Pencil color
        currentPath.setAttribute('stroke-width', '2');
        currentPath.setAttribute('fill', 'none');
        currentPath.setAttribute('stroke-linecap', 'round');
        currentPath.setAttribute('stroke-linejoin', 'round');
        
        pathData = `M ${startX} ${e.clientY - rect.top}`;
        currentPath.setAttribute('d', pathData);
        
        currentSvg.appendChild(currentPath);
        container.appendChild(currentSvg);
        
        e.preventDefault(); // Prevent text selection while drawing
    });

    document.addEventListener('pointermove', (e) => {
        if (!isDrawing || !targetContainer) return;
        
        const dx = e.clientX - initialX;
        const dy = e.clientY - initialY;
        
        // Threshold to differentiate click vs drag
        if (Math.sqrt(dx*dx + dy*dy) > 5) {
            wasDragging = true;
        }
        
        const rect = targetContainer.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = e.clientY - rect.top;
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        
        // Add some noise for a rough, hand-drawn look
        const noiseY = y + (Math.random() - 0.5) * 2;
        
        pathData += ` L ${x} ${noiseY}`;
        currentPath.setAttribute('d', pathData);
    });

    document.addEventListener('pointerup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        const widthDrawn = maxX - minX;
        const rect = targetContainer.getBoundingClientRect();
        const containerWidth = rect.width;
        
        // If user drew across at least 60% of the task
        if (widthDrawn > containerWidth * 0.6) {
            const li = targetContainer.closest('.task-item');
            if (li && window.completeTask) {
                const index = parseInt(li.getAttribute('data-index'));
                if (!isNaN(index)) {
                    
                    // Save custom path to the task so it stays exactly as drawn
                    const scaleX = 100 / containerWidth;
                    const normalizedPath = pathData.replace(/([ML])\s+([0-9.]+)\s+([0-9.-]+)/g, (m, cmd, px, py) => {
                        return `${cmd} ${parseFloat(px) * scaleX} ${parseFloat(py)}`;
                    });
                    
                    if (window.saveCustomPath) {
                        window.saveCustomPath(index, normalizedPath, rect.height || 30);
                    }

                    // Complete the task
                    window.completeTask(index);
                }
            }
        } else {
            // Unsuccessful draw, clean up the temporary SVG
            if (currentSvg && currentSvg.parentNode) {
                currentSvg.parentNode.removeChild(currentSvg);
            }
        }
        
        currentSvg = null;
        currentPath = null;
        targetContainer = null;
    });
});

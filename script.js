document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let tasks = JSON.parse(localStorage.getItem('antigravity_tasks')) || [];


    const getLocalYYYYMMDD = (date) => {
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - userTimezoneOffset).toISOString().split('T')[0];
    };

    const getTodayString = () => getLocalYYYYMMDD(new Date());
    let currentViewDate = getTodayString();
    
    // Migrate old tasks to today
    let migrated = false;
    tasks = tasks.map(task => {
        if (!task.date) {
            task.date = getTodayString();
            migrated = true;
        }
        return task;
    });
    if (migrated) localStorage.setItem('antigravity_tasks', JSON.stringify(tasks));

    const formatDateDisplay = (dateString) => {
        if (dateString === getTodayString()) return 'Today';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const dateDisplay = document.getElementById('current-date-display');
    
    const updateDateUI = () => {
        dateDisplay.textContent = formatDateDisplay(currentViewDate);
        const notebookPage = document.getElementById('notebook-page');
        
        if (currentViewDate === getTodayString()) {
            nextDayBtn.disabled = true;
            nextDayBtn.classList.add('opacity-50', 'cursor-not-allowed');
            document.body.classList.remove('read-only-mode');
            notebookPage.setAttribute('draggable', 'true');
        } else {
            nextDayBtn.disabled = false;
            nextDayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            document.body.classList.add('read-only-mode');
            notebookPage.removeAttribute('draggable');
        }
    };
    
    prevDayBtn.addEventListener('click', () => {
        const date = new Date(currentViewDate + 'T00:00:00');
        date.setDate(date.getDate() - 1);
        currentViewDate = getLocalYYYYMMDD(date);
        updateDateUI();
        renderTasks();
    });

    nextDayBtn.addEventListener('click', () => {
        if (currentViewDate === getTodayString()) return;
        const date = new Date(currentViewDate + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        currentViewDate = getLocalYYYYMMDD(date);
        updateDateUI();
        renderTasks();
    });

    // --- Custom Cursor Logic ---
    const cursor = document.getElementById('custom-cursor');
    
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Handle hovering on interactive elements
    const updateInteractiveElements = () => {
        const interactiveElements = document.querySelectorAll('.interactive, button, input, .task-text, .delete-btn');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
        });
    };

    // Handle clicking animation
    document.addEventListener('mousedown', () => document.body.classList.add('clicking'));
    document.addEventListener('mouseup', () => document.body.classList.remove('clicking'));

    // --- Task Rendering ---
    const saveTasks = () => {
        const tasksJson = JSON.stringify(tasks);
        localStorage.setItem('antigravity_tasks', tasksJson);

    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        
        const hasTasksForDate = tasks.some(t => t.date === currentViewDate && !t.trashed);
        
        if (!hasTasksForDate) {
            const emptyState = document.createElement('li');
            emptyState.className = 'text-slate-400 font-["Caveat"] text-2xl text-center mt-8';
            emptyState.textContent = currentViewDate === getTodayString() 
                ? "Your notebook is empty. Time to fly!" 
                : "No active tasks recorded on this day.";
            taskList.appendChild(emptyState);
            return;
        }

        tasks.forEach((task, index) => {
            if (task.date !== currentViewDate || task.trashed) return;
            const li = document.createElement('li');
            li.className = `task-item flex items-center justify-between group interactive ${task.completed ? 'task-completed' : ''}`;
            li.setAttribute('data-index', index);
            
            // Generate a slight random rotation for handwritten feel
            const randomRotation = (Math.random() - 0.5) * 2; // -1deg to 1deg
            
            li.innerHTML = `
                <div class="flex items-center gap-3 flex-1 select-none">
                    <!-- Custom checkbox marker (optional, mostly relying on text strike) -->
                    <div class="w-2 h-2 rounded-full ${task.completed ? 'bg-slate-400' : 'bg-slate-300'} transition-colors"></div>
                    
                    <div class="strikethrough-container relative">
                        <span class="task-text font-['Caveat'] text-2xl md:text-3xl text-slate-800 tracking-wide transition-colors" 
                              style="display: inline-block; transform: rotate(${randomRotation}deg);">
                            ${escapeHTML(task.text)}
                        </span>
                        <svg class="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 ${task.height || 40}">
                            <path d="${task.customPath || 'M 0 20 Q 25 17 50 21 T 100 19'}" stroke="#64748b" stroke-width="2" fill="none" class="strike-path" ${task.customPath ? '' : 'pathLength="100"'}></path>
                        </svg>
                    </div>
                    ${task.completed ? `<span class="ml-2 font-['Caveat'] text-xl text-slate-400">Completed ✓</span>` : ''}
                </div>
                <button onclick="deleteTask(${index})" class="delete-btn text-slate-400 hover:text-red-500 p-2 interactive focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            taskList.appendChild(li);
        });

        // Re-attach hover listeners to new elements
        updateInteractiveElements();
    };

    // --- Task Actions ---
    window.completeTask = (index) => {
        if (!tasks[index].completed) {
            tasks[index].completed = true;
            saveTasks();
            renderTasks();
        }
    };

    window.deleteTask = (index) => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    };

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            // Add task temporarily to check if it fits
            tasks.unshift({ text, completed: false, date: currentViewDate });
            renderTasks(); // Update DOM to measure
            
            const notebookPage = document.getElementById('notebook-page');
            
            // Check if the page is now overflowing its max-h-[90vh] container
            if (notebookPage.scrollHeight > notebookPage.clientHeight + 2) {
                // Revert!
                tasks.shift();
                renderTasks();
                alert("This page is full! Please drag the notebook to the trash to start a new page, or navigate to another day.");
                return;
            }
            
            taskInput.value = '';
            saveTasks();
        }
    });

    // Helper to prevent XSS
    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    };

    // --- Background Particles (Antigravity Feel) ---
    const createParticles = () => {
        const container = document.getElementById('particles');
        const numParticles = 15;

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random properties
            const size = Math.random() * 8 + 2; // 2px to 10px
            const left = Math.random() * 100; // 0% to 100%
            const duration = Math.random() * 15 + 10; // 10s to 25s
            const delay = Math.random() * 5; // 0s to 5s

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;

            container.appendChild(particle);
        }
    };

    // --- Page Drag and Drop to Dustbin Logic ---
    const dustbin = document.getElementById('dustbin');
    const notebookPage = document.getElementById('notebook-page');
    let isDraggingPage = false;

    notebookPage.addEventListener('dragstart', (e) => {
        isDraggingPage = true;
        
        setTimeout(() => {
            notebookPage.classList.add('crumpling-page');
            document.body.classList.add('is-dragging');
        }, 0);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'page');
    });

    notebookPage.addEventListener('dragend', (e) => {
        isDraggingPage = false;
        notebookPage.classList.remove('crumpling-page');
        document.body.classList.remove('is-dragging');
        dustbin.classList.remove('dustbin-active');
    });

    dustbin.addEventListener('dragover', (e) => {
        if (!isDraggingPage) return;
        e.preventDefault(); // Required to allow drop
        e.dataTransfer.dropEffect = 'move';
        dustbin.classList.add('dustbin-active');
    });

    dustbin.addEventListener('dragleave', () => {
        dustbin.classList.remove('dustbin-active');
    });

    dustbin.addEventListener('drop', (e) => {
        if (!isDraggingPage) return;
        e.preventDefault();
        dustbin.classList.remove('dustbin-active');
        document.body.classList.remove('is-dragging');
        
        // Shrinking animation into the bin
        notebookPage.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        notebookPage.style.transform = 'scale(0) translate(100%, 100%)';
        notebookPage.style.opacity = '0';
        
        setTimeout(() => {
            // Soft delete by marking as trashed
            tasks = tasks.map(t => {
                if (t.date === currentViewDate && !t.trashed) {
                    return { ...t, trashed: true };
                }
                return t;
            });
            saveTasks();
            
            // Reset page styles and bring in fresh page
            notebookPage.style.transition = 'none';
            notebookPage.style.transform = 'none';
            notebookPage.style.opacity = '1';
            
            notebookPage.classList.remove('crumpling-page');
            
            // Add fresh-page animation class
            notebookPage.classList.remove('fresh-page');
            void notebookPage.offsetWidth; // trigger reflow
            notebookPage.classList.add('fresh-page');
            
            renderTasks();
            document.getElementById('task-input').focus();
        }, 400);
    });

    // --- Dashboard Logic ---
    const dashboardToggle = document.getElementById('dashboard-toggle');
    const dashboardView = document.getElementById('dashboard-view');
    const editorView = document.getElementById('editor-view');
    const dashboardGrid = document.getElementById('dashboard-grid');

    let isDashboardOpen = false;

    const toggleDashboard = () => {
        isDashboardOpen = !isDashboardOpen;
        if (isDashboardOpen) {
            renderDashboard();
            dashboardView.classList.add('dashboard-active');
            editorView.classList.add('editor-hidden');
        } else {
            dashboardView.classList.remove('dashboard-active');
            editorView.classList.remove('editor-hidden');
        }
    };

    dashboardToggle.addEventListener('click', toggleDashboard);

    const renderDashboard = () => {
        const dashboardGridActive = document.getElementById('dashboard-grid-active');
        const dashboardGridTrashed = document.getElementById('dashboard-grid-trashed');
        const trashedSectionContainer = document.getElementById('trashed-section-container');
        const activeNotesTitle = document.getElementById('active-notes-title');

        dashboardGridActive.innerHTML = '';
        dashboardGridTrashed.innerHTML = '';
        
        // Group tasks by date and trashed status
        const activeHistory = {};
        const trashedHistory = {};
        
        tasks.forEach(t => {
            if (t.trashed) {
                if (!trashedHistory[t.date]) trashedHistory[t.date] = [];
                trashedHistory[t.date].push(t);
            } else {
                if (!activeHistory[t.date]) activeHistory[t.date] = [];
                activeHistory[t.date].push(t);
            }
        });
        
        const sortedActive = Object.keys(activeHistory).sort((a,b) => b.localeCompare(a));
        const sortedTrashed = Object.keys(trashedHistory).sort((a,b) => b.localeCompare(a));
        
        if (sortedActive.length === 0 && sortedTrashed.length === 0) {
            dashboardGridActive.innerHTML = `<div class="col-span-full text-center text-slate-500 font-['Caveat'] text-3xl mt-10">No history found. Time to fly!</div>`;
            trashedSectionContainer.classList.add('hidden');
            activeNotesTitle.classList.add('hidden');
            return;
        }

        if (sortedActive.length > 0) activeNotesTitle.classList.remove('hidden');
        else activeNotesTitle.classList.add('hidden');

        if (sortedTrashed.length > 0) trashedSectionContainer.classList.remove('hidden');
        else trashedSectionContainer.classList.add('hidden');

        const createCard = (dateString, dateTasks, isTrashed) => {
            const displayDate = formatDateDisplay(dateString);
            const card = document.createElement('div');
            card.className = `mini-note interactive flex flex-col group ${isTrashed ? 'mini-note-trashed' : ''}`;
            
            const randomRotation = (Math.random() - 0.5) * 6; // -3 to +3 deg
            card.style.setProperty('--rot', `${randomRotation}deg`);
            
            const previewTasks = dateTasks.slice(0, 3).map(t => 
                `<div class="mini-note-task ${t.completed ? 'line-through opacity-50' : ''}">- ${escapeHTML(t.text)}</div>`
            ).join('');
            
            const moreIndicator = dateTasks.length > 3 ? `<div class="text-slate-400 font-['Caveat'] text-lg mt-1">...and ${dateTasks.length - 3} more</div>` : '';

            card.innerHTML = `
                <div class="mini-note-count">${dateTasks.length}</div>
                <div class="mini-note-title">${displayDate} ${isTrashed ? '<span class="text-xs text-emerald-500 font-sans ml-2 uppercase tracking-wide font-bold">Completed</span>' : ''}</div>
                <div class="flex-1">
                    ${previewTasks}
                    ${moreIndicator}
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (isTrashed) {
                    if (confirm(`Do you want to restore your notebook page from ${displayDate}?`)) {
                        tasks.forEach(t => {
                            if (t.date === dateString && t.trashed) {
                                t.trashed = false;
                            }
                        });
                        saveTasks();
                        renderTasks();
                        renderDashboard(); // Refresh dashboard
                    }
                } else {
                    currentViewDate = dateString;
                    updateDateUI();
                    renderTasks();
                    toggleDashboard();
                }
            });
            
            return card;
        };

        sortedActive.forEach(date => dashboardGridActive.appendChild(createCard(date, activeHistory[date], false)));
        sortedTrashed.forEach(date => dashboardGridTrashed.appendChild(createCard(date, trashedHistory[date], true)));
        
        // Re-attach hover listeners to new elements
        updateInteractiveElements();
    };

    // --- Initialization ---
    updateDateUI();
    renderTasks();
    createParticles();
    updateInteractiveElements();
});

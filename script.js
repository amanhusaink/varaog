document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Management ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('vara_theme') || 'light';
    if (savedTheme === 'dark') {
        htmlElement.classList.add('dark');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (htmlElement.classList.contains('dark')) {
                htmlElement.classList.remove('dark');
                localStorage.setItem('vara_theme', 'light');
            } else {
                htmlElement.classList.add('dark');
                localStorage.setItem('vara_theme', 'dark');
            }
        });
    }

    // --- State Management ---
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
    // Migration: Check if old tasks exist and need to be converted
    let oldTasks = JSON.parse(localStorage.getItem('antigravity_tasks'));
    let notes = JSON.parse(localStorage.getItem('vara_notes')) || [];

    if (oldTasks && oldTasks.length > 0 && notes.length === 0) {
        // Group old tasks by date
        const grouped = {};
        oldTasks.forEach(t => {
            const date = t.date || new Date().toISOString().split('T')[0];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(t);
        });

        for (const date in grouped) {
            notes.push({
                id: generateId(),
                title: date === new Date().toISOString().split('T')[0] ? "Today's Note" : `Note for ${date}`,
                date: date,
                trashed: grouped[date].every(t => t.trashed), // if all tasks were trashed, trash the note
                tasks: grouped[date]
            });
        }
        localStorage.setItem('vara_notes', JSON.stringify(notes));
    }

    let currentNoteId = null;

    const saveNotes = () => {
        localStorage.setItem('vara_notes', JSON.stringify(notes));
    };

    const getNote = (id) => notes.find(n => n.id === id);

    // --- Custom Cursor Logic ---
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('pointermove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    const updateInteractiveElements = () => {
        const interactiveElements = document.querySelectorAll('.interactive, button, input, .task-text, .delete-btn, .mini-note');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
        });
    };

    document.addEventListener('mousedown', () => document.body.classList.add('clicking'));
    document.addEventListener('mouseup', () => document.body.classList.remove('clicking'));

    // --- UI Elements ---
    const dashboardView = document.getElementById('dashboard-view');
    const editorView = document.getElementById('editor-view');
    const notebookPage = document.getElementById('notebook-page');
    const dashboardGridActive = document.getElementById('dashboard-grid-active');
    const dashboardGridTrashed = document.getElementById('dashboard-grid-trashed');
    const trashedSectionContainer = document.getElementById('trashed-section-container');
    const activeNotesTitle = document.getElementById('active-notes-title');
    const newNoteBtn = document.getElementById('new-note-btn');
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const historyToggleText = document.getElementById('history-toggle-text');
    const wallTitle = document.getElementById('wall-title');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteDateDisplay = document.getElementById('note-date-display');
    const closeNoteBtn = document.getElementById('close-note-btn');

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

    const formatDateDisplay = (dateString) => {
        const today = new Date().toISOString().split('T')[0];
        if (dateString === today) return 'Created Today';
        const date = new Date(dateString + 'T00:00:00');
        return 'Created ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // --- Rendering the Wall ---
    let showHistory = false;
    
    if (historyToggleBtn) {
        historyToggleBtn.addEventListener('click', () => {
            showHistory = !showHistory;
            historyToggleText.textContent = showHistory ? 'My Desk' : 'History';
            wallTitle.textContent = showHistory ? 'History Desk' : 'My Desk';
            renderWall();
        });
    }

    const renderWall = () => {
        dashboardGridActive.innerHTML = '';
        dashboardGridTrashed.innerHTML = '';
        
        const activeNotes = notes.filter(n => !n.trashed).sort((a,b) => b.date.localeCompare(a.date));
        const trashedNotes = notes.filter(n => n.trashed).sort((a,b) => b.date.localeCompare(a.date));
        
        const createCard = (note, isTrashed) => {
            const displayDate = formatDateDisplay(note.date);
            const card = document.createElement('div');
            card.className = `mini-note interactive flex flex-col group ${isTrashed ? 'mini-note-trashed' : ''} cursor-pointer`;
            
            const randomRotation = (Math.random() - 0.5) * 6; // -3 to +3 deg
            card.style.setProperty('--rot', `${randomRotation}deg`);
            
            const activeTasks = note.tasks.filter(t => !t.trashed);
            const previewTasks = activeTasks.slice(0, 3).map(t => 
                `<div class="mini-note-task ${t.completed ? 'line-through opacity-50' : ''}">- ${escapeHTML(t.text)}</div>`
            ).join('');
            
            const moreIndicator = activeTasks.length > 3 ? `<div class="text-slate-400 font-['Caveat'] text-lg mt-1">...and ${activeTasks.length - 3} more</div>` : '';

            card.innerHTML = `
                <div class="mini-note-count">${activeTasks.length}</div>
                <div class="mini-note-title">${escapeHTML(note.title)} ${isTrashed ? '<span class="text-xs text-emerald-500 font-sans ml-2 uppercase tracking-wide font-bold">Trashed</span>' : ''}</div>
                <div class="flex-1">
                    ${previewTasks}
                    ${moreIndicator}
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (isTrashed) {
                    if (confirm(`Do you want to restore "${note.title}"?`)) {
                        note.trashed = false;
                        saveNotes();
                        renderWall();
                    }
                } else {
                    openNote(note.id);
                }
            });
            
            return card;
        };

        if (showHistory) {
            dashboardGridActive.classList.add('hidden');
            activeNotesTitle.classList.add('hidden');
            trashedSectionContainer.classList.remove('hidden');
            
            if (trashedNotes.length === 0) {
                dashboardGridTrashed.innerHTML = `<div class="col-span-full text-center text-slate-500 font-['Caveat'] text-3xl mt-10">Trash is empty.</div>`;
            } else {
                trashedNotes.forEach(note => dashboardGridTrashed.appendChild(createCard(note, true)));
            }
        } else {
            trashedSectionContainer.classList.add('hidden');
            dashboardGridActive.classList.remove('hidden');
            
            if (activeNotes.length === 0) {
                dashboardGridActive.innerHTML = `<div class="col-span-full text-center text-slate-500 font-['Caveat'] text-3xl mt-10">No notes yet. Create one to get started!</div>`;
                activeNotesTitle.classList.add('hidden');
            } else {
                activeNotesTitle.classList.remove('hidden');
                activeNotes.forEach(note => dashboardGridActive.appendChild(createCard(note, false)));
            }
        }
        
        updateInteractiveElements();
    };

    // --- Rendering a Note ---
    const renderTasks = () => {
        taskList.innerHTML = '';
        const currentNote = getNote(currentNoteId);
        if (!currentNote) return;

        const activeTasks = currentNote.tasks.filter(t => !t.trashed);
        
        if (activeTasks.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'text-slate-400 font-["Caveat"] text-2xl text-center mt-8';
            emptyState.textContent = "Your note is empty. Time to fly!";
            taskList.appendChild(emptyState);
            return;
        }

        activeTasks.forEach((task, index) => {
            const originalIndex = currentNote.tasks.indexOf(task);
            
            const li = document.createElement('li');
            li.className = `task-item flex items-center justify-between group interactive ${task.completed ? 'task-completed' : ''}`;
            li.setAttribute('data-index', originalIndex);
            
            const randomRotation = (Math.random() - 0.5) * 2; 
            
            li.innerHTML = `
                <div class="flex items-center gap-3 flex-1 select-none">
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
                <button onclick="deleteTask(${originalIndex})" class="delete-btn text-slate-400 hover:text-red-500 p-2 interactive focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            taskList.appendChild(li);
        });

        updateInteractiveElements();
    };

    // --- Note Interactions ---
    const openNote = (id) => {
        currentNoteId = id;
        const note = getNote(id);
        if (!note) return;

        noteTitleInput.value = note.title;
        noteDateDisplay.textContent = formatDateDisplay(note.date);
        
        renderTasks();
        
        // Show modal
        editorView.classList.remove('opacity-0', 'pointer-events-none');
        notebookPage.classList.remove('scale-95');
        notebookPage.classList.add('scale-100');
        
        document.body.classList.remove('read-only-mode');
        notebookPage.setAttribute('draggable', 'true');
    };

    const closeNote = () => {
        if (currentNoteId) {
            const note = getNote(currentNoteId);
            if (note) {
                note.title = noteTitleInput.value.trim() || 'Untitled Note';
                saveNotes();
            }
        }
        
        currentNoteId = null;
        editorView.classList.add('opacity-0', 'pointer-events-none');
        notebookPage.classList.remove('scale-100');
        notebookPage.classList.add('scale-95');
        
        renderWall();
    };

    newNoteBtn.addEventListener('click', () => {
        const newNote = {
            id: generateId(),
            title: 'New Note',
            date: new Date().toISOString().split('T')[0],
            trashed: false,
            tasks: []
        };
        notes.push(newNote);
        saveNotes();
        openNote(newNote.id);
        
        // Auto focus title input so user can name it
        setTimeout(() => {
            noteTitleInput.focus();
            noteTitleInput.select();
        }, 300);
    });

    closeNoteBtn.addEventListener('click', closeNote);
    
    // Save title when changed
    noteTitleInput.addEventListener('change', () => {
        const note = getNote(currentNoteId);
        if (note) {
            note.title = noteTitleInput.value.trim() || 'Untitled Note';
            saveNotes();
            renderWall(); // update dashboard text
        }
    });

    // --- Task Actions ---
    window.completeTask = (originalIndex) => {
        const note = getNote(currentNoteId);
        if (note && !note.tasks[originalIndex].completed) {
            note.tasks[originalIndex].completed = true;
            saveNotes();
            renderTasks();
        }
    };

    window.saveCustomPath = (originalIndex, pathData, height) => {
        const note = getNote(currentNoteId);
        if (note && note.tasks[originalIndex]) {
            note.tasks[originalIndex].customPath = pathData;
            note.tasks[originalIndex].height = height;
            saveNotes();
        }
    };

    window.deleteTask = (originalIndex) => {
        const note = getNote(currentNoteId);
        if (note) {
            note.tasks.splice(originalIndex, 1);
            saveNotes();
            renderTasks();
        }
    };

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text && currentNoteId) {
            const note = getNote(currentNoteId);
            note.tasks.unshift({ text, completed: false, trashed: false });
            renderTasks(); 
            
            if (notebookPage.scrollHeight > notebookPage.clientHeight + 2) {
                note.tasks.shift();
                renderTasks();
                alert("This page is full! Please drag the notebook to the trash to start a new page.");
                return;
            }
            
            taskInput.value = '';
            saveNotes();
        }
    });

    // --- Background Particles ---
    const createParticles = () => {
        const container = document.getElementById('particles');
        const numParticles = 15;

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 8 + 2; 
            const left = Math.random() * 100; 
            const duration = Math.random() * 15 + 10; 
            const delay = Math.random() * 5; 

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;

            container.appendChild(particle);
        }
    };

    // --- Page Drag and Drop to Dustbin Logic (Pointer-based for Mobile Support) ---
    const dustbin = document.getElementById('dustbin');
    let isDraggingPage = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPageX = 0;
    let initialPageY = 0;

    notebookPage.addEventListener('pointerdown', (e) => {
        // Only allow dragging if we are not clicking an interactive element
        if (e.target.closest('.interactive, button, input')) return;
        
        isDraggingPage = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = notebookPage.getBoundingClientRect();
        initialPageX = rect.left;
        initialPageY = rect.top;

        notebookPage.setPointerCapture(e.pointerId);
        
        setTimeout(() => {
            if (isDraggingPage) {
                notebookPage.classList.add('crumpling-page');
                document.body.classList.add('is-dragging');
            }
        }, 100);
    });

    notebookPage.addEventListener('pointermove', (e) => {
        if (!isDraggingPage) return;
        
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        
        // Move the page
        notebookPage.style.transform = `translate(${dx}px, ${dy}px) scale(0.9) rotate(${dx/20}deg)`;
        
        // Check if over dustbin
        const dustbinRect = dustbin.getBoundingClientRect();
        if (e.clientX > dustbinRect.left && e.clientX < dustbinRect.right &&
            e.clientY > dustbinRect.top && e.clientY < dustbinRect.bottom) {
            dustbin.classList.add('dustbin-active');
        } else {
            dustbin.classList.remove('dustbin-active');
        }
    });

    notebookPage.addEventListener('pointerup', (e) => {
        if (!isDraggingPage) return;
        isDraggingPage = false;
        notebookPage.releasePointerCapture(e.pointerId);
        
        notebookPage.classList.remove('crumpling-page');
        document.body.classList.remove('is-dragging');
        
        const dustbinRect = dustbin.getBoundingClientRect();
        const isOverDustbin = (e.clientX > dustbinRect.left && e.clientX < dustbinRect.right &&
                               e.clientY > dustbinRect.top && e.clientY < dustbinRect.bottom);
        
        if (isOverDustbin && currentNoteId) {
            dustbin.classList.remove('dustbin-active');
            
            notebookPage.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            notebookPage.style.transform = 'scale(0) translate(100%, 100%)';
            notebookPage.style.opacity = '0';
            
            setTimeout(() => {
                const note = getNote(currentNoteId);
                if (note) {
                    if (note.tasks.filter(t => !t.trashed).length === 0) {
                        notes = notes.filter(n => n.id !== currentNoteId);
                    } else {
                        note.trashed = true;
                    }
                    saveNotes();
                }
                
                notebookPage.style.transition = 'none';
                notebookPage.style.transform = 'none';
                notebookPage.style.opacity = '1';
                closeNote();
            }, 400);
        } else {
            // Reset position
            notebookPage.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            notebookPage.style.transform = 'none';
            dustbin.classList.remove('dustbin-active');
            setTimeout(() => {
                notebookPage.style.transition = 'none';
            }, 300);
        }
    });

    // --- Initialization ---
    renderWall();
    createParticles();
    updateInteractiveElements();
});

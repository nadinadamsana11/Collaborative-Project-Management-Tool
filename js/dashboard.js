import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loadingOverlay = document.getElementById('loading-overlay');

    // Modals
    const createBoardModal = document.getElementById('create-board-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const taskModal = document.getElementById('task-modal');
    const editTaskModal = document.getElementById('edit-task-modal');
    const editCommentModal = document.getElementById('edit-comment-modal');
    const editBoardModal = document.getElementById('edit-board-modal');
    const alertModal = document.getElementById('alert-modal');
    const confirmModal = document.getElementById('confirm-modal');

    // Modal Buttons & Inputs
    const createBoardBtn = document.getElementById('create-board-btn');
    const cancelBoardBtn = document.getElementById('cancel-board-btn');
    const confirmCreateBoardBtn = document.getElementById('confirm-create-board-btn');
    const newBoardNameInput = document.getElementById('new-board-name');

    const addTaskBtns = document.querySelectorAll('.add-card-btn');
    const cancelAddTaskBtn = document.getElementById('cancel-add-task-btn');
    const confirmAddTaskBtn = document.getElementById('confirm-add-task-btn');
    const newTaskTitleInput = document.getElementById('new-task-title');
    const newTaskDescInput = document.getElementById('new-task-desc');
    const newTaskDateInput = document.getElementById('new-task-date');
    const newTaskLabelInput = document.getElementById('new-task-label');

    const closeModalBtn = document.getElementById('close-modal-btn');
    const viewDeleteBtn = document.getElementById('view-delete-btn');
    const viewEditBtn = document.getElementById('view-edit-btn');
    
    // Edit Task Modal Inputs
    const editTaskTitleInput = document.getElementById('edit-task-title');
    const editTaskDescInput = document.getElementById('edit-task-desc');
    const editTaskDateInput = document.getElementById('edit-task-date');
    const editTaskLabelInput = document.getElementById('edit-task-label');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
    const saveEditTaskBtn = document.getElementById('save-edit-task-btn');

    const cancelEditBoardBtn = document.getElementById('cancel-edit-board-btn');
    const closeAlertBtn = document.getElementById('close-alert-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    
    // Comment Elements
    const modalTaskComments = document.getElementById('modal-task-comments');
    const modalCommentInput = document.getElementById('modal-comment-input');
    const postCommentBtn = document.getElementById('post-comment-btn');
    const seeMoreCommentsBtn = document.getElementById('see-more-comments-btn');

    // Lists & Counts
    const boardList = document.getElementById('board-list');
    const todoList = document.getElementById('todo-list');
    const inprogressList = document.getElementById('inprogress-list');
    const doneList = document.getElementById('done-list');
    const todoCount = document.getElementById('todo-count');
    const inprogressCount = document.getElementById('inprogress-count');
    const doneCount = document.getElementById('done-count');
    const boardTitleEl = document.getElementById('board-title');
    
    // Mobile Board Selector
    const mobileBoardSelectBtn = document.getElementById('mobile-board-select-btn');
    const mobileBoardDropdown = document.getElementById('mobile-board-dropdown');
    const mobileBoardDropdownList = document.getElementById('mobile-board-dropdown-list');
    const mobileBoardTitleText = document.getElementById('mobile-board-title-text');
    const mobileDropdownCreateBtn = document.getElementById('mobile-dropdown-create-btn');
    const mobilePageTitle = document.getElementById('mobile-page-title');
    const mobileBoardSelectorContainer = document.getElementById('mobile-board-selector-container');
    
    // Search & Filter Inputs
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileFilterSelect = document.getElementById('mobile-filter-select');

    // Notifications
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    
    // Activity
    const activityLogBtn = document.getElementById('activity-log-btn');
    const activityList = document.getElementById('activity-list');

    // Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    const pageSections = document.querySelectorAll('.page-section');

    // State
    let currentTaskStatus = '';
    let currentBoardId = null;
    let currentTaskId = null; // For editing/deleting
    let tasksUnsubscribe = null;
    let pendingDeleteAction = null;
    let boards = []; // Store boards locally for mobile selector
    let allTasks = []; // Store all tasks for client-side filtering
    let commentsUnsubscribe = null;
    let currentCommentId = null; // For editing comments
    let commentLimit = 3;

    // Auth Check & Data Loading
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect if not logged in
            window.location.href = 'index.html';
        } else {
            // User is authenticated
            await loadUserProfile(user);
            listenForBoards(user.uid);
            listenForActivities(user.uid);
            
            // Check URL for direct board access
            const urlParams = new URLSearchParams(window.location.search);
            const boardId = urlParams.get('boardId');
            if (boardId) selectBoard(boardId);

            if(loadingOverlay) loadingOverlay.classList.add('hidden');
            
            initSortable();
        }
    });

    // Modal Management
    function openModal(modal) { if (modal) modal.classList.remove('hidden'); }
    function closeModal(modal) { 
        if (modal) modal.classList.add('hidden'); 
        if (modal === taskModal && commentsUnsubscribe) {
            commentsUnsubscribe();
            commentsUnsubscribe = null;
            commentLimit = 3; // Reset limit
        }
    }

    // Profile Loading
    async function loadUserProfile(user) {
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userAvatarEl = document.getElementById('user-avatar');
        const mobileUserNameEl = document.getElementById('mobile-user-name');
        const mobileUserEmailEl = document.getElementById('mobile-user-email');
        const mobileUserAvatarEl = document.getElementById('mobile-user-avatar');

        if(userNameEl) userNameEl.textContent = user.displayName || 'User';
        if(userEmailEl) userEmailEl.textContent = user.email;
        
        // Generate Initials
        if(userAvatarEl) {
            const name = user.displayName || user.email || "U";
            const initials = name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
            userAvatarEl.textContent = initials.substring(0, 2);
            
            if(mobileUserAvatarEl) mobileUserAvatarEl.textContent = initials.substring(0, 2);
            if(mobileUserNameEl) mobileUserNameEl.textContent = user.displayName || 'User';
            if(mobileUserEmailEl) mobileUserEmailEl.textContent = user.email;
        }
    }

    // Activity Logging
    async function logActivity(action, details) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await addDoc(collection(db, 'activities'), {
                userId: user.uid,
                action: action,
                details: details,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    }

    // Board Creation & Loading
    async function handleCreateBoard(e) {
        e.preventDefault();
        const boardName = newBoardNameInput.value.trim();
        const user = auth.currentUser;

        if (!boardName || !user) return;

        confirmCreateBoardBtn.disabled = true;
        try {
            await addDoc(collection(db, 'boards'), {
                name: boardName,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                isPinned: false
            });
            newBoardNameInput.value = '';
            logActivity('Created Board', `Created board "${boardName}"`);
            closeModal(createBoardModal);
        } catch (error) {
            console.error("Error adding board: ", error);
            alert("Failed to create board.");
        } finally {
            confirmCreateBoardBtn.disabled = false;
        }
    }

    function renderBoard(board) {
        // Sidebar Item
        const firstLetter = board.name.charAt(0).toUpperCase();
        const boardItem = document.createElement('a');
        boardItem.href = `?boardId=${board.id}`;
        boardItem.dataset.boardId = board.id;
        boardItem.className = 'flex items-center gap-3 px-2 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors';
        
        // Handle active state styling if this is the current board
        if (board.id === currentBoardId) {
            boardItem.classList.add('bg-indigo-50', 'text-indigo-600');
            boardItem.classList.remove('text-gray-700', 'hover:bg-gray-100');
        }
        
        boardItem.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-6 h-6 flex-shrink-0 rounded bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    ${firstLetter}
                </div>
                <span class="truncate board-name transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}"></span>
            </div>
            <div class="relative ml-auto group/menu ${isSidebarCollapsed ? 'hidden' : ''}">
                <button class="board-menu-btn p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>
        `;
        boardItem.querySelector('.truncate').textContent = board.name;
        if (board.isPinned) {
            boardItem.querySelector('.truncate').classList.add('font-bold');
            boardItem.querySelector('.truncate').innerHTML += ' <span class="text-xs text-indigo-500 ml-1">📌</span>';
        }

        // Dot Menu Logic
        const menuBtn = boardItem.querySelector('.board-menu-btn');
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Create dropdown dynamically to avoid nesting issues
            const existingDropdown = document.querySelector('.board-context-menu');
            if (existingDropdown) existingDropdown.remove();

            const dropdown = document.createElement('div');
            dropdown.className = 'board-context-menu absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1';
            dropdown.innerHTML = `
                <button class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2" id="pin-board-${board.id}">
                    ${board.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2" id="delete-board-${board.id}">
                    Delete
                </button>
            `;
            
            menuBtn.parentElement.appendChild(dropdown);

            document.getElementById(`pin-board-${board.id}`).addEventListener('click', async (ev) => {
                ev.stopPropagation();
                await updateDoc(doc(db, "boards", board.id), { isPinned: !board.isPinned });
                dropdown.remove();
            });

            document.getElementById(`delete-board-${board.id}`).addEventListener('click', (ev) => {
                ev.stopPropagation();
                dropdown.remove();
                // Reuse confirm modal logic
                pendingDeleteAction = async () => {
                    await deleteDoc(doc(db, "boards", board.id));
                    logActivity('Deleted Board', `Deleted board "${board.name}"`);
                    closeModal(confirmModal);
                    if (currentBoardId === board.id) {
                        currentBoardId = null;
                        boardList.innerHTML = '';
                        // Reset view
                    }
                };
                openModal(confirmModal);
            });

            // Close on click outside
            const closeMenu = (ev) => {
                if (!dropdown.contains(ev.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
        });
        
        boardItem.addEventListener('click', (e) => {
            e.preventDefault();
            selectBoard(board.id);
        });

        boardList.appendChild(boardItem);

        // Mobile Dropdown Item
        if(mobileBoardDropdownList) {
            const mobileItem = document.createElement('button');
            mobileItem.className = `w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${board.id === currentBoardId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`;
            mobileItem.innerHTML = `
                <div class="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">${firstLetter}</div>
                <span class="truncate">${board.name}</span>
            `;
            mobileItem.addEventListener('click', () => {
                selectBoard(board.id);
                mobileBoardDropdown.classList.add('hidden');
            });
            mobileBoardDropdownList.appendChild(mobileItem);
        }
    }

    function listenForBoards(userId) {
        // Note: orderBy with where requires an index. If index is missing, this might fail.
        // We will try to sort client-side to be safe if index creation is an issue for the user.
        // But requirement says "Use Firestore ... orderBy for pinned boards".
        // We will use orderBy. If it fails, check console for index link.
        const q = query(collection(db, "boards"), where("ownerId", "==", userId), orderBy("isPinned", "desc"), orderBy("createdAt", "desc"));
        onSnapshot(q, (querySnapshot) => {
            boards = [];
            boardList.innerHTML = ''; // Clear list before re-rendering
            if(mobileBoardDropdownList) mobileBoardDropdownList.innerHTML = '';
            
            if (querySnapshot.empty) {
                boardList.innerHTML = `<p class="px-2 text-xs text-gray-500">No boards yet. Create one!</p>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const boardData = { id: doc.id, ...doc.data() };
                    boards.push(boardData);
                    renderBoard(boardData);
                });

                // Auto-select first board if none selected
                if (!currentBoardId && boards.length > 0) {
                    selectBoard(boards[0].id);
                }
                
                // Re-render to update active states if needed
                if (currentBoardId) {
                    // This is handled by selectBoard updating UI, but we need to ensure dropdown is current
                }
            }
        });
    }

    async function selectBoard(boardId) {
        currentBoardId = boardId;

        // Show loading state
        if(loadingOverlay) loadingOverlay.classList.remove('hidden');
        document.getElementById('home-section').classList.add('blur-sm', 'pointer-events-none');
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('boardId', boardId);
        window.history.pushState({}, '', url);

        // Update UI Active State
        document.querySelectorAll('#board-list a').forEach(el => {
            if (el.dataset.boardId === boardId) {
                el.classList.add('bg-indigo-50', 'text-indigo-600');
                el.classList.remove('text-gray-700', 'hover:bg-gray-100');
            } else {
                el.classList.remove('bg-indigo-50', 'text-indigo-600');
                el.classList.add('text-gray-700', 'hover:bg-gray-100');
            }
        });

        // Fetch Board Name
        try {
            const boardRef = doc(db, "boards", boardId);
            const boardSnap = await getDoc(boardRef);
            if (boardSnap.exists() && boardTitleEl) {
                boardTitleEl.textContent = boardSnap.data().name;
                if(mobileBoardTitleText) mobileBoardTitleText.textContent = boardSnap.data().name;
            }
        } catch (error) {
            console.error("Error fetching board details:", error);
        }

        // Load Tasks for this board
        listenForTasks(boardId);
        
        // Switch to home view on mobile if needed
        showPage('home-section');
        
        // Re-render boards to update mobile dropdown active state
        if(boards.length > 0) {
            if(mobileBoardDropdownList) mobileBoardDropdownList.innerHTML = '';
            boards.forEach(b => {
                // Re-use render logic or just manual append for mobile to keep it simple
                const firstLetter = b.name.charAt(0).toUpperCase();
                const mobileItem = document.createElement('button');
                mobileItem.className = `w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${b.id === currentBoardId ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`;
                mobileItem.innerHTML = `
                    <div class="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">${firstLetter}</div>
                    <span class="truncate">${b.name}</span>
                `;
                mobileItem.addEventListener('click', () => {
                    selectBoard(b.id);
                    mobileBoardDropdown.classList.add('hidden');
                });
                mobileBoardDropdownList.appendChild(mobileItem);
            });
        }
    }

    // Task Creation & Management
    function createTaskCard(task) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card group relative p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all';
        // taskCard.draggable = true; // Handled by SortableJS
        taskCard.dataset.taskId = task.id;
        
        const p = document.createElement('p');
        p.className = "text-sm font-medium text-gray-800";
        p.textContent = task.title;
        taskCard.appendChild(p);

        if (task.label) {
            const labelSpan = document.createElement('span');
            labelSpan.className = "inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-medium";
            labelSpan.textContent = task.label;
            taskCard.appendChild(labelSpan);
        }

        // Hover Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = "absolute top-2 right-2 hidden md:group-hover:flex gap-1 bg-white rounded shadow-sm p-1";
        actionsDiv.innerHTML = `
            <button class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        
        // Delete Action
        actionsDiv.children[0].addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteTask(task.id);
        });

        taskCard.appendChild(actionsDiv);
        
        // Add click listener to open detail modal
        taskCard.addEventListener('click', () => {
            openTaskDetail(task);
        });


        return taskCard;
    }

    async function handleAddTask(e) {
        e.preventDefault();
        const taskTitle = newTaskTitleInput.value.trim();
        const taskDesc = newTaskDescInput.value.trim();
        const taskDate = newTaskDateInput.value;
        const taskLabel = newTaskLabelInput.value;
        const user = auth.currentUser;

        if (taskTitle && currentTaskStatus && user && currentBoardId) {
            confirmAddTaskBtn.disabled = true;
            confirmAddTaskBtn.textContent = 'Adding...';
            try {
                await addDoc(collection(db, 'tasks'), {
                    title: taskTitle,
                    description: taskDesc,
                    dueDate: taskDate,
                    label: taskLabel,
                    status: currentTaskStatus,
                    boardId: currentBoardId,
                    ownerId: user.uid,
                    createdAt: serverTimestamp()
                });
                newTaskTitleInput.value = '';
                newTaskDescInput.value = '';
                newTaskDateInput.value = '';
                newTaskLabelInput.value = '';
                logActivity('Added Task', `Added task "${taskTitle}"`);
                closeModal(addTaskModal);
            } catch (error) {
                console.error("Error adding task:", error);
                alert("Failed to add task");
            } finally {
                confirmAddTaskBtn.disabled = false;
                confirmAddTaskBtn.textContent = 'Add Task';
            }
        } else if (!currentBoardId) {
            alert("Please select a board first.");
        }
    }

    function openTaskDetail(task) {
        currentTaskId = task.id;
        
        // Populate View Modal
        document.getElementById('view-task-title').textContent = task.title;
        document.getElementById('view-task-desc').textContent = task.description || 'No description provided.';
        
        const labelEl = document.getElementById('view-task-label');
        if (task.label) {
            labelEl.textContent = task.label;
            labelEl.classList.remove('hidden');
            labelEl.className = "px-2 py-0.5 rounded-full font-medium text-xs bg-indigo-100 text-indigo-700";
        } else {
            labelEl.classList.add('hidden');
        }

        const dateEl = document.getElementById('view-task-duedate');
        if (task.dueDate) {
            dateEl.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${task.dueDate}`;
        } else {
            dateEl.textContent = '';
        }
        
        listenForComments(task.id);
        openModal(taskModal);
    }

    function openEditTaskModal() {
        // Get current task data from local array
        const task = allTasks.find(t => t.id === currentTaskId);
        if (!task) return;

        editTaskTitleInput.value = task.title;
        editTaskDescInput.value = task.description || '';
        editTaskDateInput.value = task.dueDate || '';
        editTaskLabelInput.value = task.label || '';

        closeModal(taskModal);
        openModal(editTaskModal);
    }

    async function handleSaveEditedTask() {
        if (!currentTaskId) return;
        
        const title = editTaskTitleInput.value.trim();
        if (!title) return;

        const desc = editTaskDescInput.value.trim();
        const date = editTaskDateInput.value;
        const label = editTaskLabelInput.value;
        
        try {
            const taskRef = doc(db, "tasks", currentTaskId);
            await updateDoc(taskRef, {
                title: title,
                description: desc,
                dueDate: date,
                label: label
            });
            closeModal(editTaskModal);
        } catch (e) {
            console.error("Error updating task", e);
            alert("Failed to save task.");
        }
    }

    function confirmDeleteTask(taskId) {
        pendingDeleteAction = async () => {
            try {
                await deleteDoc(doc(db, "tasks", taskId));
                logActivity('Deleted Task', 'Deleted a task');
                closeModal(taskModal);
                closeModal(confirmModal);
            } catch (error) {
                console.error("Error deleting task:", error);
                alert("Failed to delete task.");
            }
        };
        openModal(confirmModal);
    }

    // Comments System
    function listenForComments(taskId) {
        if (commentsUnsubscribe) commentsUnsubscribe();
        
        const q = query(
            collection(db, "comments"), 
            where("taskId", "==", taskId),
            orderBy("createdAt", "asc"),
            limit(commentLimit + 1) // Fetch one extra to check if "See More" is needed
        );

        commentsUnsubscribe = onSnapshot(q, (snapshot) => {
            modalTaskComments.innerHTML = '';
            const docs = snapshot.docs;
            const hasMore = docs.length > commentLimit;
            const displayDocs = hasMore ? docs.slice(0, commentLimit) : docs;

            if (snapshot.empty) {
                modalTaskComments.innerHTML = '<p class="text-gray-400 text-xs italic text-center py-2">No comments yet.</p>';
            } else {
                displayDocs.forEach(doc => {
                    renderComment({ id: doc.id, ...doc.data() });
                });
            }
            
            if (hasMore) {
                seeMoreCommentsBtn.classList.remove('hidden');
            } else {
                seeMoreCommentsBtn.classList.add('hidden');
            }

            // Scroll to bottom
            modalTaskComments.scrollTop = modalTaskComments.scrollHeight;
        });
    }

    if (seeMoreCommentsBtn) {
        seeMoreCommentsBtn.addEventListener('click', () => {
            commentLimit += 3;
            if (currentTaskId) listenForComments(currentTaskId);
        });
    }

    function renderComment(comment) {
        const div = document.createElement('div');
        div.className = "group relative bg-gray-50 rounded-lg p-2 text-sm border border-gray-100 hover:bg-gray-100 transition-colors";
        
        const header = document.createElement('div');
        header.className = "flex justify-between items-center mb-1";
        
        const userSpan = document.createElement('span');
        userSpan.className = "font-semibold text-indigo-600 text-xs";
        userSpan.textContent = comment.userName || "Unknown";
        
        const timeSpan = document.createElement('span');
        timeSpan.className = "text-gray-400 text-[10px]";
        if (comment.createdAt) {
            const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
            timeSpan.textContent = date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        
        header.appendChild(userSpan);
        header.appendChild(timeSpan);
        
        const textP = document.createElement('p');
        textP.className = "text-gray-700 text-xs break-words";
        textP.textContent = comment.text;
        
        // Comment Actions (Edit/Delete)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = "absolute top-1 right-1 hidden group-hover:flex gap-1 bg-white rounded shadow-sm p-0.5";
        actionsDiv.innerHTML = `
            <button class="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100" title="Edit">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100" title="Delete">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;

        // Edit Comment
        actionsDiv.children[0].addEventListener('click', () => {
            currentCommentId = comment.id;
            document.getElementById('edit-comment-text').value = comment.text;
            openModal(editCommentModal);
        });

        // Delete Comment
        actionsDiv.children[1].addEventListener('click', () => {
            pendingDeleteAction = async () => {
                try {
                    await deleteDoc(doc(db, "comments", comment.id));
                    logActivity('Deleted Comment', 'Deleted a comment');
                    closeModal(confirmModal);
                } catch (error) {
                    console.error("Error deleting comment:", error);
                }
            };
            openModal(confirmModal);
        });

        div.appendChild(actionsDiv);
        div.appendChild(header);
        div.appendChild(textP);
        
        modalTaskComments.appendChild(div);
    }

    // Handle Edit Comment Save
    const saveEditCommentBtn = document.getElementById('save-edit-comment-btn');
    const cancelEditCommentBtn = document.getElementById('cancel-edit-comment-btn');
    
    if(saveEditCommentBtn) {
        saveEditCommentBtn.addEventListener('click', async () => {
            const newText = document.getElementById('edit-comment-text').value.trim();
            if (!newText || !currentCommentId) return;
            
            try {
                await updateDoc(doc(db, "comments", currentCommentId), { text: newText });
                closeModal(editCommentModal);
            } catch (error) {
                console.error("Error updating comment:", error);
            }
        });
    }
    
    if(cancelEditCommentBtn) cancelEditCommentBtn.addEventListener('click', () => closeModal(editCommentModal));

    async function handlePostComment() {
        const text = modalCommentInput.value.trim();
        if (!text || !currentTaskId) return;
        
        const user = auth.currentUser;
        if (!user) return;

        try {
            await addDoc(collection(db, "comments"), {
                taskId: currentTaskId,
                userId: user.uid,
                userName: user.displayName || user.email,
                text: text,
                createdAt: serverTimestamp()
            });
            modalCommentInput.value = '';
            logActivity('Posted Comment', `Commented on task`);
        } catch (error) {
            console.error("Error posting comment:", error);
        }
    }

    // Initialize SortableJS
    function initSortable() {
        const columns = [todoList, inprogressList, doneList];
        columns.forEach(col => {
            new Sortable(col, {
                group: 'shared', // set both lists to same group
                animation: 150,
                ghostClass: 'bg-indigo-50',
                delay: 100, // slight delay to prevent accidental drags on touch
                delayOnTouchOnly: true,
                onEnd: async function (evt) {
                    const itemEl = evt.item;
                    const newStatus = evt.to.dataset.status;
                    const taskId = itemEl.dataset.taskId;

                    if (taskId && newStatus) {
                        try {
                            const taskRef = doc(db, "tasks", taskId);
                            await updateDoc(taskRef, { status: newStatus });
                        } catch (error) {
                            console.error("Error moving task:", error);
                        }
                    }
                }
            });
        });
    }

    // Search & Filter Logic
    function applyFilters() {
        const searchTerm = (searchInput.value || mobileSearchInput.value).toLowerCase();
        const filterLabel = filterSelect.value || mobileFilterSelect.value;

        // Filter tasks
        const filteredTasks = allTasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) || 
                                  (task.description && task.description.toLowerCase().includes(searchTerm));
            const matchesFilter = filterLabel ? task.label === filterLabel : true;
            return matchesSearch && matchesFilter;
        });

        renderTasks(filteredTasks);
    }

    function renderTasks(tasks) {
        // Clear columns
        todoList.innerHTML = '';
        inprogressList.innerHTML = '';
        doneList.innerHTML = '';

        tasks.forEach(task => {
            const card = createTaskCard(task);
            if (task.status === 'todo') todoList.appendChild(card);
            else if (task.status === 'inprogress') inprogressList.appendChild(card);
            else if (task.status === 'done') doneList.appendChild(card);
        });

        // Update counts
        todoCount.textContent = todoList.children.length;
        inprogressCount.textContent = inprogressList.children.length;
        doneCount.textContent = doneList.children.length;
    }

    // Sync Desktop and Mobile Inputs
    function syncInputs(source, target, eventType = 'input') {
        source.addEventListener(eventType, () => {
            target.value = source.value;
            applyFilters();
        });
    }

    function listenForTasks(boardId) {
        if (tasksUnsubscribe) tasksUnsubscribe(); // Unsubscribe from previous listener

        const q = query(collection(db, "tasks"), where("boardId", "==", boardId));
        
        tasksUnsubscribe = onSnapshot(q, (querySnapshot) => {
            // Clear columns
            allTasks = [];
            
            querySnapshot.forEach((doc) => {
                allTasks.push({ id: doc.id, ...doc.data() });
            });

            applyFilters();
            
            // Hide loading state
            if(loadingOverlay) loadingOverlay.classList.add('hidden');
            document.getElementById('home-section').classList.remove('blur-sm', 'pointer-events-none');
        });
    }

    // Activity Log Rendering
    function listenForActivities(userId) {
        const q = query(collection(db, "activities"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20));
        onSnapshot(q, (snapshot) => {
            if(activityList) {
                activityList.innerHTML = '';
                if (snapshot.empty) {
                    activityList.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity.</p>';
                    return;
                }
                snapshot.forEach(doc => {
                    renderActivity(doc.data());
                });
            }
        });
    }

    function renderActivity(activity) {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-start gap-3";
        
        const date = activity.createdAt ? (activity.createdAt.toDate ? activity.createdAt.toDate() : new Date(activity.createdAt)) : new Date();
        const dateStr = date.toLocaleString();

        div.innerHTML = `
            <div class="h-2 w-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
            <div>
                <p class="text-sm font-medium text-gray-900">${activity.action}</p>
                <p class="text-xs text-gray-500">${activity.details}</p>
                <p class="text-[10px] text-gray-400 mt-1">${dateStr}</p>
            </div>
        `;
        activityList.appendChild(div);
    }

    // Event Listeners
    if (createBoardBtn) createBoardBtn.addEventListener('click', () => openModal(createBoardModal));
    if (cancelBoardBtn) cancelBoardBtn.addEventListener('click', () => closeModal(createBoardModal));
    if (confirmCreateBoardBtn) confirmCreateBoardBtn.addEventListener('click', handleCreateBoard);
    if (cancelEditBoardBtn) cancelEditBoardBtn.addEventListener('click', () => closeModal(editBoardModal));
    if (closeAlertBtn) closeAlertBtn.addEventListener('click', () => closeModal(alertModal));
    
    // Confirmation Modal
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => {
        pendingDeleteAction = null;
        closeModal(confirmModal);
    });
    if (confirmOkBtn) confirmOkBtn.addEventListener('click', () => {
        if (pendingDeleteAction) pendingDeleteAction();
    });

    // Search & Filter Listeners
    if(searchInput && mobileSearchInput) {
        syncInputs(searchInput, mobileSearchInput, 'input');
        syncInputs(mobileSearchInput, searchInput, 'input');
    }
    if(filterSelect && mobileFilterSelect) {
        syncInputs(filterSelect, mobileFilterSelect, 'change');
        syncInputs(mobileFilterSelect, filterSelect, 'change');
    }

    // Task Modal Actions
    if (viewDeleteBtn) viewDeleteBtn.addEventListener('click', () => {
        if (currentTaskId) confirmDeleteTask(currentTaskId);
    });
    if (viewEditBtn) viewEditBtn.addEventListener('click', openEditTaskModal);
    
    if (cancelEditTaskBtn) cancelEditTaskBtn.addEventListener('click', () => closeModal(editTaskModal));
    if (saveEditTaskBtn) saveEditTaskBtn.addEventListener('click', handleSaveEditedTask);
    
    if (postCommentBtn) postCommentBtn.addEventListener('click', handlePostComment);
    addEnterListener(modalCommentInput, handlePostComment);

    // Helper for Enter Key
    function addEnterListener(input, action) {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    action(e);
                }
            });
        }
    }

    addEnterListener(newBoardNameInput, handleCreateBoard);
    addEnterListener(newTaskTitleInput, handleAddTask);
    // For textarea, usually Shift+Enter is new line, Enter is submit. 
    // But for description, maybe let Enter be new line. 
    // Let's stick to Title for Enter submission to avoid bad UX in textarea.

    // Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarLogoText = document.getElementById('sidebar-logo-text');
    const sidebarBoardsLabel = document.getElementById('sidebar-boards-label');
    const userInfo = document.getElementById('user-info');

    let isSidebarCollapsed = false;

    if(sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            isSidebarCollapsed = !isSidebarCollapsed;
            
            if (isSidebarCollapsed) {
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-20');
                
                sidebarLogoText.classList.add('opacity-0', 'w-0');
                sidebarBoardsLabel.classList.add('opacity-0');
                userInfo.classList.add('opacity-0', 'w-0');
                document.querySelectorAll('.board-name').forEach(el => el.classList.add('opacity-0', 'w-0', 'overflow-hidden'));
            } else {
                sidebar.classList.add('w-64');
                sidebar.classList.remove('w-20');
                
                sidebarLogoText.classList.remove('opacity-0', 'w-0');
                sidebarBoardsLabel.classList.remove('opacity-0');
                userInfo.classList.remove('opacity-0', 'w-0');
                document.querySelectorAll('.board-name').forEach(el => el.classList.remove('opacity-0', 'w-0', 'overflow-hidden'));
            }
        });
    }

    // Logout Logic
    const userProfileBtn = document.getElementById('user-profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if(userProfileBtn) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
    }

    if(activityLogBtn) {
        activityLogBtn.addEventListener('click', () => {
            showPage('activity-section');
            profileDropdown.classList.add('hidden');
        });
    }

    addTaskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTaskStatus = btn.dataset.status;
            openModal(addTaskModal);
            setTimeout(() => newTaskTitleInput.focus(), 50);
        });
    });

    // Mobile Board Selector Logic
    if (mobileBoardSelectBtn) {
        mobileBoardSelectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileBoardDropdown.classList.toggle('hidden');
        });
    }
    if (mobileDropdownCreateBtn) {
        mobileDropdownCreateBtn.addEventListener('click', () => {
            mobileBoardDropdown.classList.add('hidden');
            openModal(createBoardModal);
        });
    }

    if (cancelAddTaskBtn) cancelAddTaskBtn.addEventListener('click', () => closeModal(addTaskModal));
    if (confirmAddTaskBtn) confirmAddTaskBtn.addEventListener('click', handleAddTask);
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(taskModal));

    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });
    }

    // Global click listeners to close dropdowns/modals
    document.addEventListener('click', (e) => {
        if (userProfileBtn && !userProfileBtn.contains(e.target) && profileDropdown && !profileDropdown.classList.contains('hidden')) {
            profileDropdown.classList.add('hidden');
        }
        if (notificationBtn && !notificationBtn.contains(e.target) && notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.add('hidden');
        }
        if (mobileBoardSelectBtn && !mobileBoardSelectBtn.contains(e.target) && mobileBoardDropdown && !mobileBoardDropdown.classList.contains('hidden')) {
            mobileBoardDropdown.classList.add('hidden');
        }
        if (e.target === createBoardModal) closeModal(createBoardModal);
        if (e.target === addTaskModal) closeModal(addTaskModal);
        if (e.target === taskModal) closeModal(taskModal);
        if (e.target === editTaskModal) closeModal(editTaskModal);
        if (e.target === editCommentModal) closeModal(editCommentModal);
        if (e.target === confirmModal) closeModal(confirmModal);
    });

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Logout failed', error);
            }
        });
    }

    if(mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async () => {
            try { await signOut(auth); } catch (error) { console.error('Logout failed', error); }
        });
    }

    // Tab Switching Logic
    function showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));
        // Show target page
        const target = document.getElementById(pageId);
        if(target) target.classList.remove('hidden');

        // Update Mobile Header
        if (pageId === 'home-section') {
            if(mobileBoardSelectorContainer) mobileBoardSelectorContainer.classList.remove('hidden');
            if(mobilePageTitle) mobilePageTitle.classList.add('hidden');
        } else {
            if(mobileBoardSelectorContainer) mobileBoardSelectorContainer.classList.add('hidden');
            if(mobilePageTitle) {
                mobilePageTitle.classList.remove('hidden');
                if(pageId === 'activity-section') mobilePageTitle.textContent = 'Activity Log';
                if(pageId === 'profile-section') mobilePageTitle.textContent = 'Profile';
                if(pageId === 'notifications-section') mobilePageTitle.textContent = 'Notifications';
            }
        }

        // Update Nav Buttons
        navBtns.forEach(btn => {
            if(btn.dataset.target === pageId) {
                btn.classList.remove('text-gray-400');
                btn.classList.add('text-indigo-600');
            } else {
                btn.classList.add('text-gray-400');
                btn.classList.remove('text-indigo-600');
            }
        });
    }

    // Expose to window for module compatibility
    window.showPage = showPage;

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(btn.dataset.target);
        });
    });
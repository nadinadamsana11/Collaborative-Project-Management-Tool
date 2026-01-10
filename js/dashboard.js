import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loadingOverlay = document.getElementById('loading-overlay');

    // Modals
    const createBoardModal = document.getElementById('create-board-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const taskModal = document.getElementById('task-modal');
    const editBoardModal = document.getElementById('edit-board-modal');
    const alertModal = document.getElementById('alert-modal');
    const confirmModal = document.getElementById('confirm-modal');

    // Modal Buttons & Inputs
    const createBoardBtn = document.getElementById('create-board-btn');
    const mobileCreateBoardBtn = document.getElementById('mobile-create-board-btn');
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
    const modalTaskTitleInput = document.getElementById('modal-task-title');
    const deleteTaskBtn = document.getElementById('delete-task-btn');
    const cancelEditBoardBtn = document.getElementById('cancel-edit-board-btn');
    const closeAlertBtn = document.getElementById('close-alert-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');

    // Lists & Counts
    const boardList = document.getElementById('board-list');
    const mobileBoardList = document.getElementById('mobile-board-list');
    const todoList = document.getElementById('todo-list');
    const inprogressList = document.getElementById('inprogress-list');
    const doneList = document.getElementById('done-list');
    const todoCount = document.getElementById('todo-count');
    const inprogressCount = document.getElementById('inprogress-count');
    const doneCount = document.getElementById('done-count');
    const boardTitleEl = document.getElementById('board-title');

    // Notifications
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');

    // Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    const pageSections = document.querySelectorAll('.page-section');

    // State
    let currentTaskStatus = '';
    let currentBoardId = null;
    let currentTaskId = null; // For editing/deleting
    let tasksUnsubscribe = null;
    let pendingDeleteAction = null;

    // Auth Check & Data Loading
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect if not logged in
            window.location.href = 'index.html';
        } else {
            // User is authenticated
            await loadUserProfile(user);
            listenForBoards(user.uid);
            
            // Check URL for direct board access
            const urlParams = new URLSearchParams(window.location.search);
            const boardId = urlParams.get('boardId');
            if (boardId) selectBoard(boardId);

            if(loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    });

    // Modal Management
    function openModal(modal) { if (modal) modal.classList.remove('hidden'); }
    function closeModal(modal) { if (modal) modal.classList.add('hidden'); }

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
                createdAt: serverTimestamp()
            });
            newBoardNameInput.value = '';
            closeModal(createBoardModal);
        } catch (error) {
            console.error("Error adding board: ", error);
            alert("Failed to create board.");
        } finally {
            confirmCreateBoardBtn.disabled = false;
        }
    }

    function renderBoard(board) {
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
            <div class="w-6 h-6 flex-shrink-0 rounded bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                ${firstLetter}
            </div>
            <span class="truncate board-name transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}"></span>
        `;
        boardItem.querySelector('.truncate').textContent = board.name;
        
        boardItem.addEventListener('click', (e) => {
            e.preventDefault();
            selectBoard(board.id);
        });

        boardList.appendChild(boardItem);

        // Mobile Board List
        if(mobileBoardList) {
            const mobileItem = boardItem.cloneNode(true);
            mobileItem.className = 'flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100';
            mobileItem.innerHTML = `<div class="p-2 bg-indigo-50 rounded-lg text-indigo-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg></div><span class="font-semibold text-gray-800 text-lg"></span>`;
            mobileItem.querySelector('span').textContent = board.name;
            mobileBoardList.appendChild(mobileItem);
        }
    }

    function listenForBoards(userId) {
        const q = query(collection(db, "boards"), where("ownerId", "==", userId));
        onSnapshot(q, (querySnapshot) => {
            boardList.innerHTML = ''; // Clear list before re-rendering
            if(mobileBoardList) mobileBoardList.innerHTML = '';
            if (querySnapshot.empty) {
                boardList.innerHTML = `<p class="px-2 text-xs text-gray-500">No boards yet. Create one!</p>`;
            } else {
                querySnapshot.forEach((doc) => {
                    renderBoard({ id: doc.id, ...doc.data() });
                });
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
            }
        } catch (error) {
            console.error("Error fetching board details:", error);
        }

        // Load Tasks for this board
        listenForTasks(boardId);
        
        // Switch to home view on mobile if needed
        showPage('home-section');
    }

    // Task Creation & Management
    function createTaskCard(task) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card group relative p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all';
        taskCard.draggable = true; // For future drag-and-drop
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
        actionsDiv.className = "absolute top-2 right-2 hidden group-hover:flex gap-1 bg-white rounded shadow-sm p-1";
        actionsDiv.innerHTML = `
            <button class="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        
        // Edit Action
        actionsDiv.children[0].addEventListener('click', (e) => {
            e.stopPropagation();
            openTaskDetail(task);
        });

        // Delete Action
        actionsDiv.children[1].addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteTask(task.id);
        });

        taskCard.appendChild(actionsDiv);
        
        // Add click listener to open detail modal
        taskCard.addEventListener('click', () => {
            openTaskDetail(task);
        });

        // Drag Events
        taskCard.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
            taskCard.classList.add('opacity-50');
        });

        taskCard.addEventListener('dragend', () => {
            taskCard.classList.remove('opacity-50');
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
        modalTaskTitleInput.value = task.title;
        // Populate other fields if they exist in modal
        if(document.getElementById('modal-task-desc')) document.getElementById('modal-task-desc').value = task.description || '';
        if(document.getElementById('modal-task-duedate')) document.getElementById('modal-task-duedate').value = task.dueDate || '';
        if(document.getElementById('modal-task-label')) document.getElementById('modal-task-label').value = task.label || '';
        
        openModal(taskModal);
    }

    function confirmDeleteTask(taskId) {
        pendingDeleteAction = async () => {
            try {
                await deleteDoc(doc(db, "tasks", taskId));
                closeModal(taskModal);
                closeModal(confirmModal);
            } catch (error) {
                console.error("Error deleting task:", error);
                alert("Failed to delete task.");
            }
        };
        openModal(confirmModal);
    }

    // Drag and Drop Logic for Columns
    const columns = [todoList, inprogressList, doneList];
    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            col.classList.add('bg-indigo-50', 'ring-2', 'ring-indigo-300', 'ring-inset');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-300', 'ring-inset');
        });

        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-300', 'ring-inset');
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = col.dataset.status;

            if (taskId && newStatus) {
                try {
                    const taskRef = doc(db, "tasks", taskId);
                    await updateDoc(taskRef, { status: newStatus });
                } catch (error) {
                    console.error("Error moving task:", error);
                }
            }
        });
    });

    function listenForTasks(boardId) {
        if (tasksUnsubscribe) tasksUnsubscribe(); // Unsubscribe from previous listener

        const q = query(collection(db, "tasks"), where("boardId", "==", boardId));
        
        tasksUnsubscribe = onSnapshot(q, (querySnapshot) => {
            // Clear columns
            todoList.innerHTML = '';
            inprogressList.innerHTML = '';
            doneList.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const task = doc.data();
                const card = createTaskCard({ id: doc.id, ...task });
                
                if (task.status === 'todo') todoList.appendChild(card);
                else if (task.status === 'inprogress') inprogressList.appendChild(card);
                else if (task.status === 'done') doneList.appendChild(card);
            });

            // Update counts
            todoCount.textContent = todoList.children.length;
            inprogressCount.textContent = inprogressList.children.length;
            doneCount.textContent = doneList.children.length;

            // Hide loading state
            if(loadingOverlay) loadingOverlay.classList.add('hidden');
            document.getElementById('home-section').classList.remove('blur-sm', 'pointer-events-none');
        });
    }

    // Event Listeners
    if (createBoardBtn) createBoardBtn.addEventListener('click', () => openModal(createBoardModal));
    if (mobileCreateBoardBtn) mobileCreateBoardBtn.addEventListener('click', () => openModal(createBoardModal));
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

    // Task Modal Actions
    if (deleteTaskBtn) deleteTaskBtn.addEventListener('click', () => {
        if (currentTaskId) confirmDeleteTask(currentTaskId);
    });
    
    // Keyboard Accessibility for Create Board
    if (newBoardNameInput) {
        newBoardNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCreateBoard(e);
        });
    }
    // Keyboard Accessibility for Add Task
    if (newTaskTitleInput) {
        newTaskTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddTask(e);
        });
    }

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

    addTaskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTaskStatus = btn.dataset.status;
            openModal(addTaskModal);
            setTimeout(() => newTaskTitleInput.focus(), 50);
        });
    });

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
        if (e.target === createBoardModal) closeModal(createBoardModal);
        if (e.target === addTaskModal) closeModal(addTaskModal);
        if (e.target === taskModal) closeModal(taskModal);
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
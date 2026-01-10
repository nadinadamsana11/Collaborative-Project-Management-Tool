import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loadingOverlay = document.getElementById('loading-overlay');

    // Modals
    const createBoardModal = document.getElementById('create-board-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const taskModal = document.getElementById('task-modal');
    const editBoardModal = document.getElementById('edit-board-modal');
    const alertModal = document.getElementById('alert-modal');

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

    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTaskTitleInput = document.getElementById('modal-task-title');
    const cancelEditBoardBtn = document.getElementById('cancel-edit-board-btn');
    const closeAlertBtn = document.getElementById('close-alert-btn');

    // Lists & Counts
    const boardList = document.getElementById('board-list');
    const mobileBoardList = document.getElementById('mobile-board-list');
    const todoList = document.getElementById('todo-list');
    const inprogressList = document.getElementById('inprogress-list');
    const doneList = document.getElementById('done-list');
    const todoCount = document.getElementById('todo-count');
    const inprogressCount = document.getElementById('inprogress-count');
    const doneCount = document.getElementById('done-count');

    // Notifications
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');

    // Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    const pageSections = document.querySelectorAll('.page-section');

    // State
    let currentTaskStatus = '';

    // Auth Check & Data Loading
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect if not logged in
            window.location.href = 'index.html';
        } else {
            // User is authenticated
            await loadUserProfile(user);
            listenForBoards(user.uid);
            listenForTasks(user.uid);
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
        const boardItem = document.createElement('a');
        boardItem.href = `#`;
        boardItem.dataset.boardId = board.id;
        boardItem.className = 'flex items-center gap-3 px-2 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100';
        
        boardItem.innerHTML = `
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
            <span class="truncate"></span>
        `;
        boardItem.querySelector('.truncate').textContent = board.name;
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

    // Task Creation & Management
    function createTaskCard(title) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50';
        taskCard.draggable = true; // For future drag-and-drop
        const p = document.createElement('p');
        p.className = "text-sm font-medium text-gray-800";
        p.textContent = title;
        taskCard.appendChild(p);
        
        // Add click listener to open detail modal
        taskCard.addEventListener('click', () => {
            modalTaskTitleInput.value = title;
            openModal(taskModal);
        });

        return taskCard;
    }

    async function handleAddTask(e) {
        e.preventDefault();
        const taskTitle = newTaskTitleInput.value.trim();
        const user = auth.currentUser;

        if (taskTitle && currentTaskStatus && user) {
            confirmAddTaskBtn.disabled = true;
            confirmAddTaskBtn.textContent = 'Adding...';
            try {
                await addDoc(collection(db, 'tasks'), {
                    title: taskTitle,
                    status: currentTaskStatus,
                    ownerId: user.uid,
                    createdAt: serverTimestamp()
                });
                newTaskTitleInput.value = '';
                closeModal(addTaskModal);
            } catch (error) {
                console.error("Error adding task:", error);
                alert("Failed to add task");
            } finally {
                confirmAddTaskBtn.disabled = false;
                confirmAddTaskBtn.textContent = 'Add Task';
            }
        }
    }

    function listenForTasks(userId) {
        const q = query(collection(db, "tasks"), where("ownerId", "==", userId));
        onSnapshot(q, (querySnapshot) => {
            // Clear columns
            todoList.innerHTML = '';
            inprogressList.innerHTML = '';
            doneList.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const task = doc.data();
                const card = createTaskCard(task.title);
                
                if (task.status === 'todo') todoList.appendChild(card);
                else if (task.status === 'inprogress') inprogressList.appendChild(card);
                else if (task.status === 'done') doneList.appendChild(card);
            });

            // Update counts
            todoCount.textContent = todoList.children.length;
            inprogressCount.textContent = inprogressList.children.length;
            doneCount.textContent = doneList.children.length;
        });
    }

    // Event Listeners
    if (createBoardBtn) createBoardBtn.addEventListener('click', () => openModal(createBoardModal));
    if (mobileCreateBoardBtn) mobileCreateBoardBtn.addEventListener('click', () => openModal(createBoardModal));
    if (cancelBoardBtn) cancelBoardBtn.addEventListener('click', () => closeModal(createBoardModal));
    if (confirmCreateBoardBtn) confirmCreateBoardBtn.addEventListener('click', handleCreateBoard);
    if (cancelEditBoardBtn) cancelEditBoardBtn.addEventListener('click', () => closeModal(editBoardModal));
    if (closeAlertBtn) closeAlertBtn.addEventListener('click', () => closeModal(alertModal));

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
            } else {
                sidebar.classList.add('w-64');
                sidebar.classList.remove('w-20');
                
                sidebarLogoText.classList.remove('opacity-0', 'w-0');
                sidebarBoardsLabel.classList.remove('opacity-0');
                userInfo.classList.remove('opacity-0', 'w-0');
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
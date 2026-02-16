const Modal = {
    open(content) {
        const modal = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');
        
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        
        if (window.innerWidth < 768) {
            setTimeout(() => {
                modalContent.style.transform = 'translateY(0)';
            }, 10);
        }
        
        document.body.style.overflow = 'hidden';
        
        modal.onclick = (e) => {
            if (e.target === modal) this.close();
        };
        
        window.history.pushState({modal: true}, '');
        window.onpopstate = () => {
            if (window.history.state?.modal) {
                this.close();
                window.history.back();
            }
        };
    },
    
    close() {
        const modal = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');
        
        if (window.innerWidth < 768) {
            modalContent.style.transform = 'translateY(100%)';
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }, 300);
        } else {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
};

const Toast = {
    show(message, type = 'info') {
        const colors = {
            info: 'bg-blue-600',
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600'
        };
        
        const div = document.createElement('div');
        const isMobile = window.innerWidth < 768;
        div.className = `fixed ${isMobile ? 'top-4 left-4 right-4 mt-[env(safe-area-inset-top)]' : 'bottom-4 right-4 left-auto md:top-auto md:bottom-4 md:right-4 md:left-auto'} ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-[60] flex items-center gap-2 text-sm md:text-base fade-in max-w-[calc(100vw-2rem)]`;
        div.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateY(-20px)';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }
};

const Sidebar = {
    isOpen: window.innerWidth >= 768, // На ПК відкрито за замовчуванням

    toggle() {
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const mainContainer = document.getElementById('mainContainer');
        const isMobile = window.innerWidth < 768;

        // Перемикаємо клас видимості сайдбару
        // -translate-x-full ховає його вліво
        sidebar.classList.toggle('-translate-x-full');
        
        // Перевіряємо, чи ми зараз відкрили чи закрили
        const isNowClosed = sidebar.classList.contains('-translate-x-full');
        this.isOpen = !isNowClosed;

        if (isMobile) {
            // Мобільна логіка: використовуємо оверлей
            if (!isNowClosed) {
                overlay.classList.remove('hidden');
                setTimeout(() => overlay.classList.remove('opacity-0'), 10);
                document.body.style.overflow = 'hidden';
            } else {
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 300);
                document.body.style.overflow = '';
            }
        } else {
            // ПК логіка: зсуваємо контент
            // Якщо сайдбар закритий, прибираємо відступ (margin-left)
            // Якщо відкритий, додаємо відступ
            if (isNowClosed) {
                mainContainer.classList.remove('md:ml-64');
            } else {
                mainContainer.classList.add('md:ml-64');
            }
        }
    },

    close() {
        // Примусове закриття (використовується при кліку на оверлей або посилання)
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (!sidebar.classList.contains('-translate-x-full')) {
            // Якщо відкрито - емулюємо toggle
            this.toggle();
        }
    }
};

// Pull to refresh
let pullStartY = 0;
let pullMoveY = 0;

if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].clientY;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (pullStartY && window.scrollY === 0) {
            pullMoveY = e.touches[0].clientY;
            const diff = pullMoveY - pullStartY;
            if (diff > 0 && diff < 100) {
                const indicator = document.getElementById('ptrIndicator');
                if(indicator) indicator.style.transform = `translateY(${diff - 64}px)`;
            }
        }
    });
    
    document.addEventListener('touchend', () => {
        const diff = pullMoveY - pullStartY;
        if (diff > 80 && window.scrollY === 0) {
            location.reload();
        }
        const indicator = document.getElementById('ptrIndicator');
        if(indicator) indicator.style.transform = '';
        pullStartY = 0;
        pullMoveY = 0;
    });
}

window.Modal = Modal;
window.Toast = Toast;
window.Sidebar = Sidebar;

export { Modal, Toast, Sidebar };

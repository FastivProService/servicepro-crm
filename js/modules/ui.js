const Modal = {
    open(content) {
        const modal = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');
        
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        
        // Mobile slide-up animation
        if (window.innerWidth < 768) {
            setTimeout(() => {
                modalContent.style.transform = 'translateY(0)';
            }, 10);
        }
        
        document.body.style.overflow = 'hidden';
        
        modal.onclick = (e) => {
            if (e.target === modal) this.close();
        };
        
        // Handle back button on mobile
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
        div.className = `fixed top-4 left-4 right-4 md:top-auto md:bottom-4 md:right-4 md:left-auto ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm md:text-base fade-in`;
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
    isOpen: false,

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('-translate-x-full');
        
        overlay.classList.remove('hidden');
        // Невелика затримка для CSS transition opacity
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
        }, 10);
        
        document.body.style.overflow = 'hidden'; // Блокуємо скрол фону
        this.isOpen = true;
    },

    close() {
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.add('-translate-x-full');
        
        overlay.classList.add('opacity-0');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
        
        document.body.style.overflow = '';
        this.isOpen = false;
    }
};

// Pull to refresh for mobile
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

// Експортуємо в глобальну область
window.Modal = Modal;
window.Toast = Toast;
window.Sidebar = Sidebar;

// Закриваємо сайдбар при навігації (якщо ми на мобільному)
const originalNavigate = window.routerNavigate; // Зберігаємо стару функцію, якщо вона вже є, або патчимо router
// Краще зробимо це через event listener або в Router, 
// але найпростіше - додати перехоплення кліків на посилання в Sidebar

export { Modal, Toast, Sidebar };

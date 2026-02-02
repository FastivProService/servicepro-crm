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
        
        // Lock body scroll
        document.body.style.overflow = 'hidden';
        
        // Add close on backdrop click for mobile
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
        div.className = `fixed top-4 left-4 right-4 md:top-auto md:bottom-4 md:right-4 md:left-auto ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm md:text-base`;
        div.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(div);
        
        // Auto dismiss
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateY(-20px)';
            setTimeout(() => div.remove(), 300);
        }, 3000);
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
                document.getElementById('ptrIndicator').style.transform = `translateY(${diff - 64}px)`;
            }
        }
    });
    
    document.addEventListener('touchend', () => {
        const diff = pullMoveY - pullStartY;
        if (diff > 80) {
            // Trigger refresh
            location.reload();
        }
        document.getElementById('ptrIndicator').style.transform = '';
        pullStartY = 0;
        pullMoveY = 0;
    });
}

window.Modal = Modal;
window.Toast = Toast;
export { Modal, Toast };


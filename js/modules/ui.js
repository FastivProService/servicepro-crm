const Modal = {
    open(content) {
        const modal = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        
        // Закриття по Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                Modal.close();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    },
    
    close() {
        document.getElementById('modalOverlay').classList.add('hidden');
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
        div.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in flex items-center gap-2`;
        div.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateY(20px)';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }
};

// РОБИМО ГЛОБАЛЬНИМИ для доступу з onclick
window.Modal = Modal;
window.Toast = Toast;

export { Modal, Toast };

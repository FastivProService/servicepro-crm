// Модуль UI компонентів (модальні вікна, сповіщення)
export const Modal = {
    open(content) {
        const modal = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        
        // Закриття по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    },
    
    close() {
        document.getElementById('modalOverlay').classList.add('hidden');
    }
};

export const Toast = {
    show(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            info: 'bg-blue-600',
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600'
        };
        
        toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in flex items-center gap-2`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

};
// Робимо Modal глобальним
window.Modal = { open: Modal.open, close: Modal.close };
export { Modal, Toast };

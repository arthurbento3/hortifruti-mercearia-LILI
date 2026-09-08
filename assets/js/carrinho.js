document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-items-container');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');
    const cartBadge = document.getElementById('cart-badge');

    function getCart() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderCart() {
        const cart = getCart();
        cartContainer.innerHTML = '';

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) cartBadge.textContent = totalItems;

        if (cart.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-msg">Seu carrinho está vazio.</p>';
            summarySubtotal.textContent = 'R$ 0,00';
            summaryTotal.textContent = 'R$ 0,00';
            return;
        }

        let totalCartValue = 0;

        cart.forEach((item, index) => {
            const itemSubtotal = item.price * item.quantity;
            totalCartValue += itemSubtotal;

            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h3 class="product-title">${item.name}</h3>
                    <p class="product-price">${formatCurrency(item.price)}</p>
                </div>
                <div class="cart-item-qty">
                    <label>Qtd:</label>
                    <input type="number" class="qty-input" min="1" value="${item.quantity}" data-index="${index}">
                </div>
                <div class="cart-item-subtotal">
                    <span>Subtotal:</span>
                    <strong>${formatCurrency(itemSubtotal)}</strong>
                </div>
                <button class="btn-remove" data-index="${index}" title="Remover item">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            cartContainer.appendChild(itemElement);
        });

        summarySubtotal.textContent = formatCurrency(totalCartValue);
        summaryTotal.textContent = formatCurrency(totalCartValue);

        if (window.lucide) {
            lucide.createIcons();
        }

        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = e.target.getAttribute('data-index');
                const newQty = parseInt(e.target.value);
                if (newQty > 0) {
                    cart[index].quantity = newQty;
                    saveCart(cart);
                }
            });
        });

        document.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = button.getAttribute('data-index');
                cart.splice(index, 1);
                saveCart(cart);
            });
        });
    }

    renderCart();
});
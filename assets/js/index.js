document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn-add-cart');
    const cartBadge = document.getElementById('cart-badge');

    function getCart() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        updateBadge();
    }

    function updateBadge() {
        const cart = getCart();
        const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = totalCount;
        }
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const price = parseFloat(button.getAttribute('data-price'));
            const image = button.getAttribute('data-image');

            let cart = getCart();
            const existingIndex = cart.findIndex(item => item.id === id);

            if (existingIndex > -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push({ id, name, price, image, quantity: 1 });
            }

            saveCart(cart);
            alert(`${name} foi adicionado ao carrinho!`);
        });
    });

    updateBadge();
});
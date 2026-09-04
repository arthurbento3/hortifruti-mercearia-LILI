document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('lili_cart')) || [];
    function updateCartCount() {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountElement.textContent = totalItems;
        }
    }
    function saveCart() {
        localStorage.setItem('lili_cart', JSON.stringify(cart));
        updateCartCount();
    }
    const addButtons = document.querySelectorAll('.btn-add-cart');
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target;
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const price = parseFloat(btn.getAttribute('data-price'));
            const image = btn.getAttribute('data-image');
            const existingItem = cart.find(item => item.id === id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: id,
                    name: name,
                    price: price,
                    image: image,
                    quantity: 1
                });
            }
            saveCart();
            const originalText = btn.textContent;
            btn.textContent = "Adicionado! ✓";
            btn.style.backgroundColor = "#74a055";

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = "";
            }, 1200);
        });
    });

    updateCartCount();
});
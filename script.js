
// Discord webhook URL
        let WEBHOOK_URL = "https://discord.com/api/webhooks/1375109239520890890/9Pc8rSRVA6Xxt3qDJIzH_M9oQGYcAIZVyiTFOxdKRbFMDuJ1xSCWwpo7nO7WJ70u1QoU";
        
        // DOM Elements
        const addItemBtn = document.getElementById('addItemBtn');
        const withdrawBtn = document.getElementById('withdrawBtn');
        const testDiscordBtn = document.getElementById('testDiscordBtn');
        const sendSummaryBtn = document.getElementById('sendSummaryBtn'); // New button
        const alertContainer = document.getElementById('alertContainer');
        const inventoryBody = document.getElementById('inventoryBody');
        const activityLog = document.getElementById('activityLog');
        const totalItems = document.getElementById('totalItems');
        const totalQuantity = document.getElementById('totalQuantity');
        const lowStock = document.getElementById('lowStock');
        const emptyInventory = document.getElementById('emptyInventory');
        const stockUpdate = document.getElementById('stockUpdate');
        const stockUpdateContent = document.getElementById('stockUpdateContent');
        const webhookUrlInput = document.getElementById('webhookUrl');
        
        // Inventory data
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        let activities = JSON.parse(localStorage.getItem('activities')) || [
            { type: 'info', message: 'Welcome to Grow A Garden Inventory Tracker', timestamp: Date.now() }
        ];
        
        // Initialize
        function init() {
            renderInventoryTable();
            updateStats();
            renderActivityLog();
            initItemDropdown();
            updateEmptyState();
            loadWebhook();
        }
        
        // Load webhook from localStorage
        function loadWebhook() {
            const savedWebhook = localStorage.getItem('discordWebhook');
            if (savedWebhook) {
                WEBHOOK_URL = savedWebhook;
                webhookUrlInput.value = savedWebhook;
            }
        }
        
        // Save webhook to localStorage
        function saveWebhook() {
            WEBHOOK_URL = webhookUrlInput.value;
            localStorage.setItem('discordWebhook', WEBHOOK_URL);
        }
        
        // Event Listeners
        addItemBtn.addEventListener('click', addItem);
        withdrawBtn.addEventListener('click', withdrawItem);
        testDiscordBtn.addEventListener('click', testDiscord);
        sendSummaryBtn.addEventListener('click', sendStockSummary); // New event listener
        webhookUrlInput.addEventListener('change', saveWebhook);
        
        // Functions
        function addItem() {
            const itemName = document.getElementById('itemName').value;
            const itemCategory = document.getElementById('itemCategory').value;
            const initialQuantity = parseInt(document.getElementById('initialQuantity').value);
            
            if (!itemName || !initialQuantity) {
                showAlert('Please fill all required fields', 'error');
                return;
            }
            
            // Add to inventory
            const newItem = {
                id: Date.now(),
                name: itemName,
                category: itemCategory,
                quantity: initialQuantity
            };
            
            inventory.push(newItem);
            saveInventory();
            
            // Add activity
            addActivity('add', `Added ${initialQuantity} of "${itemName}" to inventory`);
            
            // Send Discord notification
            if (WEBHOOK_URL) {
                sendDiscordNotification(`📦 Added ${initialQuantity} of "${itemName}" to inventory`, "Inventory Update");
            }
            
            // Show success message
            showAlert(`Successfully added ${initialQuantity} ${itemName} to inventory`, 'success');
            
            // Reset form
            document.getElementById('itemName').value = '';
            document.getElementById('initialQuantity').value = '10';
            
            // Update UI
            init();
        }
        
        function withdrawItem() {
            const itemId = parseInt(document.getElementById('withdrawItem').value);
            const withdrawQuantity = parseInt(document.getElementById('withdrawQuantity').value);
            const reason = document.getElementById('withdrawReason').value || 'No reason specified';
            
            if (!itemId || !withdrawQuantity) {
                showAlert('Please select an item and specify quantity', 'error');
                return;
            }
            
            // Find item in inventory
            const item = inventory.find(i => i.id === itemId);
            
            if (!item) {
                showAlert('Selected item not found in inventory', 'error');
                return;
            }
            
            if (withdrawQuantity > item.quantity) {
                showAlert(`Cannot withdraw more than available quantity (${item.quantity})`, 'error');
                return;
            }
            
            // Store original quantity for update notification
            const originalQuantity = item.quantity;
            
            // Update quantity
            item.quantity -= withdrawQuantity;
            saveInventory();
            
            // Add activity
            addActivity('withdraw', `Withdrew ${withdrawQuantity} of "${item.name}" for: ${reason}`);
            
            // Send Discord notification
            if (WEBHOOK_URL) {
                const discordTitle = "Inventory Update";
                const discordDescription = `➖ Withdrew ${withdrawQuantity} of "${item.name}" for: ${reason}\n**New Stock: ${item.quantity}**`;
                sendDiscordNotification(discordTitle, discordDescription);
            }
            
            // Show success message
            showAlert(`Withdrew ${withdrawQuantity} ${item.name} for ${reason}`, 'success');
            
            // Show stock update notification
            showStockUpdate(item, withdrawQuantity, originalQuantity, reason);
            
            // Reset form
            document.getElementById('withdrawQuantity').value = '1';
            document.getElementById('withdrawReason').value = '';
            
            // Update UI
            init();
        }
        
        function showStockUpdate(item, withdrawQuantity, originalQuantity, reason) {
            // Create notification content
            stockUpdateContent.innerHTML = `
                <div class="stock-update-item">
                    <span>Item:</span>
                    <span>${item.name}</span>
                </div>
                <div class="stock-update-item">
                    <span>Withdrawn:</span>
                    <span class="stock-update-quantity">${withdrawQuantity}</span>
                </div>
                <div class="stock-update-item">
                    <span>Previous stock:</span>
                    <span>${originalQuantity}</span>
                </div>
                <div class="stock-update-item">
                    <span>New stock:</span>
                    <span class="stock-update-remaining">${item.quantity}</span>
                </div>
                <div class="stock-update-item">
                    <span>Reason:</span>
                    <span>${reason}</span>
                </div>
            `;
            
            // Show notification
            stockUpdate.classList.add('show');
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                stockUpdate.classList.remove('show');
            }, 5000);
        }
        
        function deleteItem(itemId) {
            const item = inventory.find(i => i.id === itemId);
            if (!item) return;
            
            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                // Remove item
                inventory = inventory.filter(i => i.id !== itemId);
                saveInventory();
                
                // Add activity
                addActivity('delete', `Deleted "${item.name}" from inventory`);
                
                // Calculate new totals
                const newTotalItems = inventory.length;
                const newTotalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
                
                // Send Discord notification with new totals
                if (WEBHOOK_URL) {
                    sendDiscordNotification(
                        `🗑️ Deleted "${item.name}" from inventory`,
                        `**New Inventory Totals**\n• Total Items: ${newTotalItems}\n• Total Quantity: ${newTotalQuantity}`
                    );
                }
                
                // Show success message
                showAlert(`Deleted "${item.name}" from inventory`, 'success');
                
                // Update UI
                init();
            }
        }
        
        function testDiscord() {
            if (!WEBHOOK_URL) {
                showAlert('Please enter a Discord webhook URL first', 'error');
                return;
            }
            
            const message = document.getElementById('discordMessage').value || 'Test message from Grow A Garden Inventory Tracker';
            sendDiscordNotification('Test Notification', message);
            showAlert('Test message sent to Discord', 'success');
        }
        
        // NEW FUNCTION: Send Stock Summary to Discord
        function sendStockSummary() {
            if (!WEBHOOK_URL) {
                showAlert('Please enter a Discord webhook URL first', 'error');
                return;
            }
            
            // Get stats
            const totalItemsCount = inventory.length;
            const totalQuantityCount = inventory.reduce((sum, item) => sum + item.quantity, 0);
            const lowStockCount = inventory.filter(item => item.quantity <= 5 && item.quantity > 0).length;
            
            // Build summary message
            let summary = `**Stock Summary**\n`;
            summary += `Total Items: ${totalItemsCount}\n`;
            summary += `Total Quantity: ${totalQuantityCount}\n`;
            summary += `Low Stock Items: ${lowStockCount}\n\n`;
            
            summary += `**Inventory Items**\n`;
            
            // Add inventory items
            inventory.forEach(item => {
                const status = getStatusText(item.quantity);
                const category = item.category === 'pet' ? '🐾 Pet' : item.category === 'sheckles' ? '💰 Sheckles' : item.category;
                summary += `• ${item.name} (${category}): ${item.quantity} - ${status}\n`;
            });
            
            // Add timestamp
            summary += `\n_Updated: ${new Date().toLocaleString()}_`;
            
            // Send to Discord
            sendDiscordNotification('📊 Stock Summary Report', summary);
            showAlert('Stock summary sent to Discord', 'success');
        }
        
        // Helper function to get status text
        function getStatusText(quantity) {
            if (quantity === 0) return 'Out of Stock';
            if (quantity <= 5) return 'Low Stock';
            return 'In Stock';
        }
        
        function sendDiscordNotification(title, description) {
            // Discord webhook payload
            const payload = {
                embeds: [{
                    title: title,
                    description: description,
                    color: 0x4CAF50,
                    footer: {
                        text: "Grow A Garden • " + new Date().toLocaleString()
                    }
                }]
            };
            
            // Send to Discord webhook
            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Discord webhook error:', response.status);
                }
            })
            .catch(error => {
                console.error('Error sending to Discord:', error);
            });
        }
        
        function renderInventoryTable() {
            inventoryBody.innerHTML = '';
            
            if (inventory.length === 0) {
                document.getElementById('inventoryTable').style.display = 'none';
                emptyInventory.style.display = 'block';
                return;
            }
            
            document.getElementById('inventoryTable').style.display = 'table';
            emptyInventory.style.display = 'none';
            
            inventory.forEach(item => {
                const row = document.createElement('tr');
                
                // Add class based on category
                if (item.category === 'pet') {
                    row.classList.add('pet-item');
                } else if (item.category === 'sheckles') {
                    row.classList.add('sheckles-item');
                }
                
                // Determine status and indicator
                let status = 'In Stock';
                let statusClass = '';
                let indicatorClass = 'stock-high';
                
                if (item.quantity <= 5 && item.quantity > 0) {
                    status = 'Low Stock';
                    statusClass = 'low-stock';
                    indicatorClass = 'stock-medium';
                } else if (item.quantity === 0) {
                    status = 'Out of Stock';
                    statusClass = 'low-stock';
                    indicatorClass = 'stock-low';
                }
                
                // Create category badge
                let categoryBadge = item.category;
                if (item.category === 'pet') {
                    categoryBadge = '<span class="pet-badge">Pet</span>';
                } else if (item.category === 'sheckles') {
                    categoryBadge = '<span class="sheckles-badge">Sheckles</span>';
                }
                
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${categoryBadge}</td>
                    <td class="quantity-cell">${item.quantity}</td>
                    <td class="${statusClass}"><span class="stock-indicator ${indicatorClass}"></span>${status}</td>
                    <td class="action-cell">
                        <button class="btn-warning action-btn" onclick="withdrawItemFromTable(${item.id})">
                            <i class="fas fa-minus"></i> Withdraw
                        </button>
                        <button class="btn-danger action-btn" onclick="deleteItem(${item.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                
                inventoryBody.appendChild(row);
            });
        }
        
        function withdrawItemFromTable(itemId) {
            // Set the item in the dropdown
            document.getElementById('withdrawItem').value = itemId;
            
            // Scroll to the withdrawal form
            document.querySelector('.dashboard').scrollIntoView({ behavior: 'smooth' });
            
            // Focus on quantity field
            document.getElementById('withdrawQuantity').focus();
        }
        
        function addActivity(type, message) {
            const activity = {
                type: type,
                message: message,
                timestamp: Date.now()
            };
            
            activities.unshift(activity);
            if (activities.length > 50) activities.pop();
            
            localStorage.setItem('activities', JSON.stringify(activities));
            renderActivityLog();
        }
        
        function renderActivityLog() {
            activityLog.innerHTML = '';
            
            activities.forEach(activity => {
                const li = document.createElement('li');
                
                let iconClass = 'fas fa-info-circle';
                let textClass = '';
                
                if (activity.type === 'add') {
                    iconClass = 'fas fa-plus-circle add';
                    textClass = 'add';
                } else if (activity.type === 'withdraw') {
                    iconClass = 'fas fa-minus-circle withdrawal';
                    textClass = 'withdrawal';
                } else if (activity.type === 'delete') {
                    iconClass = 'fas fa-trash delete';
                    textClass = 'delete';
                }
                
                // Format timestamp
                const now = new Date();
                const activityTime = new Date(activity.timestamp);
                const diffMinutes = Math.floor((now - activityTime) / 60000);
                
                let timeText;
                if (diffMinutes < 1) {
                    timeText = 'Just now';
                } else if (diffMinutes < 60) {
                    timeText = `${diffMinutes} min ago`;
                } else if (diffMinutes < 1440) {
                    const hours = Math.floor(diffMinutes / 60);
                    timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
                } else {
                    timeText = activityTime.toLocaleDateString();
                }
                
                li.innerHTML = `
                    <span class="${textClass}"><i class="${iconClass}"></i> ${activity.message}</span>
                    <span>${timeText}</span>
                `;
                
                activityLog.appendChild(li);
            });
        }
        
        function updateStats() {
            totalItems.textContent = inventory.length;
            
            const totalQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
            totalQuantity.textContent = totalQty;
            
            const lowStockCount = inventory.filter(item => item.quantity <= 5).length;
            lowStock.textContent = lowStockCount;
        }
        
        function updateEmptyState() {
            emptyInventory.style.display = inventory.length === 0 ? 'block' : 'none';
        }
        
        function initItemDropdown() {
            const select = document.getElementById('withdrawItem');
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add inventory items
            inventory.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (${item.category}) - ${item.quantity} available`;
                select.appendChild(option);
            });
        }
        
        function saveInventory() {
            localStorage.setItem('inventory', JSON.stringify(inventory));
        }
        
        function showAlert(message, type) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
            alert.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i> ${message}
            `;
            
            alertContainer.innerHTML = '';
            alertContainer.appendChild(alert);
            
            // Trigger animation
            setTimeout(() => {
                alert.classList.add('show');
            }, 10);
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alertContainer.contains(alert)) {
                        alertContainer.removeChild(alert);
                    }
                }, 300);
            }, 3000);
        }
        
        // Initialize on load
        window.onload = init;
        
        // Add sample data for demo purposes
        setTimeout(() => {
            if (inventory.length === 0) {
                inventory = [
                    { id: 1, name: "RACCOONS", category: "pet", quantity: 10 },
                    { id: 2, name: "Dragon Fly", category: "pet", quantity: 3 },
                    { id: 3, name: "SHECKLES 1T", category: "sheckles", quantity: 32 },
                    { id: 4, name: "RED FOX", category: "pet", quantity: 4 }
                ];
                saveInventory();
                init();
            }
        }, 1000);
            
    async function fetchInventoryFromBin() {
        try {
            const response = await fetch(BIN_URL + "/latest", {
                headers: { "X-Master-Key": API_KEY }
            });
            const data = await response.json();
            inventory = data.record.inventory || [];
            activities = data.record.activities || [];
            init();
        } catch (err) {
            console.error("Failed to fetch from JSONBin:", err);
        }
    }

    async function saveInventoryToBin() {
        try {
            await fetch(BIN_URL, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Master-Key": API_KEY,
                    "X-Bin-Versioning": "false"
                },
                body: JSON.stringify({ inventory, activities })
            });
        } catch (err) {
            console.error("Failed to save to JSONBin:", err);
        }
    }

    
    function saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('activities', JSON.stringify(activities));
        saveInventoryToBin();
    }

    window.onload = fetchInventoryFromBin;

// JSONBin.io real-time sync config
const JSONBIN_ID = "684213928a456b7966a9fbae";
const API_KEY = "$2a$10$4Utf7jjcihxmX6dJ3Lu10/Gtn8OJUvmqByUWWC1zCV2qRog6xMwi";
const BIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

async function fetchInventoryFromBin() {
    try {
        const response = await fetch(BIN_URL + "/latest", {
            headers: { "X-Master-Key": API_KEY }
        });
        const data = await response.json();
        inventory = data.record.inventory || [];
        activities = data.record.activities || [];
        init();
    } catch (err) {
        console.error("Failed to fetch from JSONBin:", err);
    }
}

async function saveInventoryToBin() {
    try {
        await fetch(BIN_URL, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": API_KEY,
                "X-Bin-Versioning": "false"
            },
            body: JSON.stringify({ inventory, activities })
        });
    } catch (err) {
        console.error("Failed to save to JSONBin:", err);
    }
}

// Override saveInventory to sync to JSONBin
function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('activities', JSON.stringify(activities));
    saveInventoryToBin();
}

// Load inventory on page load
window.onload = fetchInventoryFromBin;
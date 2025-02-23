function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('error-message')) {
                const errorSpan = document.createElement('span');
                errorSpan.className = 'error-message text-red-600 text-sm mt-1';
                errorSpan.textContent = 'Trường này là bắt buộc.';
                field.parentNode.insertBefore(errorSpan, field.nextSibling);
            }
            isValid = false;
        } else {
            field.classList.remove('border-red-500');
            if (field.nextElementSibling && field.nextElementSibling.classList.contains('error-message')) {
                field.nextElementSibling.remove();
            }
        }
    });

    return isValid;
}

function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
    } else {
        const lazyImages = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

class ResourceLoader {
    static async preloadResources() {
    }
    static loadDeferredImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

function initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.loadTime > 3000) {
                    console.warn('Slow resource load:', entry.name);
                }
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }
}

function showLoading() {
    document.getElementById("loading").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loading").classList.add("hidden");
}

let analysisRequest = null;

async function fetchAndUpdateAnalysis() {
    if (!document.getElementById('dailyAverage')) {
        console.warn("Analysis elements not found.  Skipping fetchAndUpdateAnalysis.");
        return;
    }

    try {
        showLoading();
        const response = await fetch('/ai/get_analysis_data', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        document.getElementById('dailyAverage').textContent = data.daily_average ? formatCurrency(data.daily_average) : "Không có dữ liệu";

        let mostExpensiveCategoryHTML = "Không có dữ liệu";
        if (data.common_categories && data.common_categories.length > 0) {
            mostExpensiveCategoryHTML = `${data.common_categories[0][0]} <span class="text-base">(${formatCurrency(data.common_categories[0][1])})</span>`;
        }
        document.getElementById('mostExpensiveCategory').innerHTML = mostExpensiveCategoryHTML;

        let highestExpenseHTML = "Không có dữ liệu";
        if (data.highest_expense && data.highest_expense.amount > 0) {
            highestExpenseHTML = `${formatCurrency(data.highest_expense.amount)}`;
        }
        document.getElementById('highestExpense').innerHTML = highestExpenseHTML;

    } catch (error) {
        console.error('Error fetching analysis data:', error);
        document.getElementById('dailyAverage').textContent = "Lỗi";
        document.getElementById('mostExpensiveCategory').textContent = "Lỗi";
        document.getElementById('highestExpense').textContent = "Lỗi";
    }

    setTimeout(() => {
        fetch('/ai/get_recommendations', { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const recommendationsList = document.getElementById('recommendationsList');
                recommendationsList.innerHTML = '';

                if (data.recommendations && data.recommendations.length > 0) {
                    data.recommendations.forEach(rec => {
                        const listItem = document.createElement('li');
                        listItem.className = "flex items-start text-sm";
                        listItem.innerHTML = `<span class="text-blue-500 mr-2 flex-shrink-0">•</span>
                                          <span class="text-gray-600">${rec}</span>`;
                        recommendationsList.appendChild(listItem);
                    });
                } else {
                    const listItem = document.createElement('li');
                    listItem.className = "flex items-start text-sm";
                    listItem.innerHTML = `<span class="text-blue-500 mr-2 flex-shrink-0">•</span>
                                        <span class="text-gray-600">Hiện tại chưa có khuyến nghị nào.</span>`;
                    recommendationsList.appendChild(listItem);
                }
            })
            .catch(error => {
                console.error('Error fetching recommendations:', error);
                document.getElementById('recommendationsList').innerHTML = '<li class="text-red-500">Đã xảy ra lỗi khi tải khuyến nghị.</li>';
            }).finally(() => {
                hideLoading();
            });
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    initLazyLoading();
    initPerformanceMonitoring();
    ResourceLoader.preloadResources();
    ResourceLoader.loadDeferredImages();
    document.documentElement.classList.remove('js-loading');

    window.moneykeeper = {
        showToast,
        initLazyLoading,
        fetchAndUpdateAnalysis
    };

    if (window.location.pathname === '/index' || window.location.pathname === '/') {
        fetchAndUpdateAnalysis();
    }

    function setAmount(amount) {
        document.getElementById("amount").value = formatMoney(amount.toString());
        document.querySelectorAll(".amount-btn").forEach((btn) => {
            btn.classList.remove("bg-green-100", "text-green-800");
        });
        event.target.closest('.amount-btn').classList.add("bg-green-100", "text-green-800");
    }

    function updateCategoryIcon(category) {
        const icons = {
            food: "🍜",
            transport: "🚗",
            shopping: "🛍️",
            entertainment: "🎮",
            utilities: "📱",
            health: "🏥",
            education: "📚",
            investment: "💰",
            other: "📝",
        };
        document.getElementById("categoryIcon").textContent =
            icons[category] || "📝";
    }

    function setCategory(category) {
        document.getElementById("category").value = category;
        document.querySelectorAll(".category-btn").forEach(btn => {
            btn.classList.remove("bg-blue-100", "border-blue-500", "text-blue-800");
        });

        document.querySelectorAll(`.category-btn[data-category='${category}']`).forEach(btn => {
            btn.classList.add("bg-blue-100", "border-blue-500", "text-blue-800");
        });

        updateCategoryIcon(category);
    }

    const categoryButtons = document.querySelectorAll('.category-btn');
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            const categoryValue = button.querySelector('span:last-child').textContent.trim();
            const categoryKey = Object.entries(CATEGORY_ICONS).find(([key, value]) => value === categoryValue || key === categoryValue)[0];

            button.setAttribute('data-category', categoryKey);

            button.addEventListener('click', function () {
                setCategory(this.dataset.category);
            });
        });
    }

    function startVoiceInput() {
        if ("webkitSpeechRecognition" in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = "vi-VN";
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = function (event) {
                const transcript = event.results[0][0].transcript;
                const amountMatch = transcript.match(
                    /(\d+(\s*nghìn|\s*triệu|\s*tỷ)?)/i
                );
                if (amountMatch) {
                    const amount = convertVietnameseCurrency(amountMatch[0]);
                    document.getElementById("amount").value = formatMoney(amount.toString());
                }
            };

            recognition.start();
        } else {
            alert("Trình duyệt không hỗ trợ nhập giọng nói");
        }
    }
    function toggleTransactionType(type) {
        const isExpense = type === "expense";
        document.getElementById("is_expense").value = isExpense;

        const expenseBtn = document.querySelector(".expense-toggle");
        const incomeBtn = document.querySelector(".income-toggle");

        if (isExpense) {
            expenseBtn.classList.add("bg-green-100", "text-green-800");
            incomeBtn.classList.remove("bg-green-100", "text-green-800");
        } else {
            incomeBtn.classList.add("bg-green-100", "text-green-800");
            expenseBtn.classList.remove("bg-green-100", "text-green-800");
        }
    }
    function parseMoney(str) {
        return parseInt(str.replace(/\./g, '')) || 0;
    }
    let lastTap = 0;
    let tapTimeout;
    const tapDelay = 300;
    function handleTouchStart(event) {
        event.preventDefault();
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        clearTimeout(tapTimeout);

        if (tapLength < tapDelay && tapLength > 0) {
            const expenseId = event.currentTarget.dataset.expenseId;
            window.location.href = `/edit_expense/${expenseId}`;
            event.preventDefault();
        } else {
            tapTimeout = setTimeout(() => {
                console.log("Single tap detected");
            }, tapDelay);
        }

        lastTap = currentTime;
    }

    function handleTouchEnd(event) {
        if (new Date().getTime() - lastTap < tapDelay) {
            event.preventDefault();
        }
    }

    document.querySelectorAll("[data-expense-id]").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (window.innerWidth >= 768) {
                const expenseId = event.currentTarget.dataset.expenseId;
                const isActionButton = event.target.closest("button, a");
                if (!isActionButton) {
                    window.location.href = `/edit_expense/${expenseId}`;
                }
            }
        });
    });
    function deleteExpense(id) {
        event.stopPropagation();
        if (confirm("Bạn có chắc muốn xóa khoản chi tiêu này?")) {
            fetch(`/delete_expense/${id}`, {
                method: "POST",
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        location.reload();
                    } else {
                        showToast(data.message || "Lỗi khi xóa chi tiêu", "error");
                    }
                })
                .catch(error => {
                    showToast("Lỗi kết nối.", "error");
                    console.error("Network error:", error);
                });
        }
    }
    function showAddWalletModal() {
        document.getElementById("addWalletModal").classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function hideAddWalletModal() {
        document.getElementById("addWalletModal").classList.add("hidden");
        document.body.style.overflow = "";
    }

    document.getElementById("addWalletModal")
        .addEventListener("click", function (e) {
            if (e.target === this) {
                hideAddWalletModal();
            }
        });
    function cancelAnalysis() {
        if (analysisRequest && typeof analysisRequest.abort === 'function') {
            analysisRequest.abort();
            analysisRequest = null;
            console.log("Analysis request cancelled.");
        }
    }
    window.addEventListener('beforeunload', cancelAnalysis);
    document.addEventListener('click', function (event) {
        if (event.target.tagName === 'A' && !event.target.hasAttribute('download')) {
            cancelAnalysis();
        }
    });

    const amountButtons = document.querySelectorAll('.amount-btn');
    if (amountButtons.length > 0) {
        amountButtons.forEach(button => {
            button.addEventListener('click', function (event) {
                setAmount(parseInt(this.textContent.replace(/[^0-9]/g, "")));
            });
        });
    }

    const categoryButtons1 = document.querySelectorAll('.category-btn');
    if (categoryButtons1.length > 0) {
        categoryButtons1.forEach(button => {
            button.addEventListener('click', function () {
                setCategory(this.dataset.category);
            });
        });
    }

    const expenseForm = document.querySelector('#expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!validateForm(this)) {
                return;
            }

            fetch(this.action, {
                method: 'POST',
                body: new FormData(this)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        showToast('Chi tiêu đã được thêm thành công!', 'success');
                        this.reset();
                    }
                })
                .catch(error => {
                    console.error('There has been a problem with your fetch operation:', error);
                    showToast('Lỗi khi thêm chi tiêu. Vui lòng thử lại.', 'error');
                });
        });
    }
});

// Wrap in an IIFE to avoid leaking globals and conflicting with script.js
(function() {
    'use strict';

    // ===== Global Variables (scoped to this file) =====
    // Use API base from the main script if available to avoid re-declaration errors
    const API = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : window.location.origin;
    let currentMangaId = null;
    let currentChapterId = null;
    let currentSource = 'mangadex';
    let mangaPages = [];
    let allChapters = [];
    let currentReadMode = 'vertical';
let currentImageWidth = 80;
let currentQuality = 'medium';
let autoScrollEnabled = false;
let autoScrollInterval = null;
const token = localStorage.getItem('token');
const AUTO_ADVANCE_THRESHOLD = 160;
const AUTO_ADVANCE_DELAY = 1200;
let autoAdvancePending = false;
let autoAdvanceTimer = null;
let scrollListenerRegistered = false;
let userHasScrolled = false;

// ===== Get URL Parameters =====
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ===== Save History =====
async function saveHistory(mangaData, chapterData) {
    if (!token) return;

    const historyData = {
        mangaId: currentMangaId,
        source: currentSource,
        title: mangaData.title,
        cover: mangaData.cover || mangaData.coverFull,
        chapterId: chapterData.id,
        chapterTitle: chapterData.title
    };

    try {
        await fetch('/api/user/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ chapter: historyData })
        });
        console.log('Reading history saved to server.');
    } catch (error) {
        console.error('Failed to save reading history:', error);
    }
}

// ===== Get URL Parameters =====
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ===== Initialize Reader =====
async function initializeReader() {
    currentMangaId = getUrlParameter('manga');
    currentChapterId = getUrlParameter('chapter');
    currentSource = getUrlParameter('source') || 'mangadex';

    if (!currentMangaId || !currentChapterId) {
        window.location.href = 'index.html';
        return;
    }

    loadReaderData();
}

// ===== Load Reader Data from API =====
async function loadReaderData() {
    const loading = document.querySelector('.loading');
    if (loading) loading.classList.add('active');

    try {
        // Load manga detail, chapters, and pages in parallel
        const [detailResponse, chaptersResponse, pagesResponse] = await Promise.all([
            fetch(`${API}/api/manga/${currentMangaId}?source=${currentSource}`),
            fetch(`${API}/api/manga/${currentMangaId}/chapters?source=${currentSource}`),
            fetch(`${API}/api/manga/${currentMangaId}/chapter/${currentChapterId}?source=${currentSource}`)
        ]);

        const detailResult = await detailResponse.json();
        const chaptersResult = await chaptersResponse.json();
        const pagesResult = await pagesResponse.json();

        // Update titles
        if (detailResult.success && detailResult.data) {
            const mangaTitle = detailResult.data.title;
            document.getElementById('mangaTitle').textContent = mangaTitle;

            // Find current chapter title
            if (chaptersResult.success && chaptersResult.data) {
                allChapters = chaptersResult.data;
                const currentChapter = allChapters.find(ch => ch.id == currentChapterId);
                const chapterTitle = currentChapter ? currentChapter.title : `Chapter ${currentChapterId}`;
                document.getElementById('chapterTitle').textContent = chapterTitle;
                document.title = `${chapterTitle} - ${mangaTitle} - MangaKu`;

                // Load chapter selector
                loadChapterSelector();
            }
        } else {
            document.getElementById('mangaTitle').textContent = 'Manga tidak ditemukan';
        }

        // Load pages
        if (pagesResult.success && pagesResult.data) {
            mangaPages = normalizePagesOrder(pagesResult.data);
            displayPages();
        } else {
            showError('Gagal memuat halaman chapter');
        }

        // Save reading history to server
        if (detailResult.success && detailResult.data && chaptersResult.success) {
            const mangaData = detailResult.data;
            const currentChapter = allChapters.find(ch => ch.id == currentChapterId);
            if (currentChapter) {
                saveHistory(mangaData, currentChapter);
            }
        }

    } catch (error) {
        console.error('Load reader data error:', error);
        showError('Terjadi kesalahan saat memuat chapter');
    } finally {
        if (loading) loading.classList.remove('active');
    }
}

// ===== Load Chapter Selector =====
function loadChapterSelector() {
    const select = document.getElementById('chapterSelect');
    if (!select) return;

    select.innerHTML = '';

    allChapters.forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter.id;
        option.textContent = chapter.title;
        if (chapter.id == currentChapterId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// ===== Display Pages =====
function displayPages() {
    const container = document.getElementById('imageContainer');
    if (!container) return;

    // Remove loading
    const loading = container.querySelector('.loading');
    if (loading) loading.remove();

    // Clear existing pages
    const existingPages = container.querySelectorAll('.manga-page, .page-number');
    existingPages.forEach(el => el.remove());

    resetAutoAdvanceState();

    // Add pages
    mangaPages.forEach((page, index) => {
        const img = document.createElement('img');
        img.className = 'manga-page';
        img.src = page.url;
        img.alt = `Page ${page.number || index + 1}`;
        img.loading = 'lazy';
        img.style.width = `${currentImageWidth}%`;

        // Add click to next page in single mode
        if (currentReadMode === 'single') {
            img.onclick = () => scrollToPage(index + 1);
        }

        container.appendChild(img);
    });

    // Update page info
    updatePageInfo();

    // Add scroll listener for page tracking
    addScrollListener();
    updateCurrentPage();
}

// ===== Update Page Info =====
function updatePageInfo() {
    const totalPagesEl = document.getElementById('totalPages');
    if (totalPagesEl) {
        totalPagesEl.textContent = mangaPages.length;
    }
}

// ===== Scroll Listener =====
function addScrollListener() {
    if (scrollListenerRegistered) return;
    scrollListenerRegistered = true;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!userHasScrolled && (window.pageYOffset || document.documentElement.scrollTop) > 8) {
            userHasScrolled = true;
        }
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateCurrentPage();
                ticking = false;
            });
            ticking = true;
        }
    });
}

function updateCurrentPage() {
    const pages = document.querySelectorAll('.manga-page');
    const windowHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        const pageTop = rect.top + scrollTop;

        if (scrollTop >= pageTop - windowHeight / 2 && scrollTop < pageTop + rect.height) {
            const currentPageEl = document.getElementById('currentPage');
            if (currentPageEl) {
                currentPageEl.textContent = index + 1;
            }
        }

        if (
            !autoAdvancePending &&
            pages.length &&
            index === pages.length - 1 &&
            userHasScrolled &&
            rect.top < windowHeight * 0.35 &&
            rect.bottom <= windowHeight + AUTO_ADVANCE_THRESHOLD &&
            hasReachedDocumentBottom(windowHeight)
        ) {
            triggerAutoAdvance();
        }
    });
}

function resetAutoAdvanceState() {
    autoAdvancePending = false;
    if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
    hideAutoAdvanceNotice();
    userHasScrolled = false;
}

function hasReachedDocumentBottom(windowHeight) {
    const doc = document.documentElement;
    const body = document.body;
    const scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
    const docHeight = Math.max(
        doc.scrollHeight,
        body.scrollHeight,
        doc.offsetHeight,
        body.offsetHeight,
        doc.clientHeight
    );
    return scrollTop + windowHeight >= docHeight - AUTO_ADVANCE_THRESHOLD;
}

function normalizePagesOrder(pages) {
    if (!Array.isArray(pages)) return [];
    const augmented = pages.map((page, idx) => {
        const number =
            page.index ??
            page.page ??
            page.number ??
            page.order ??
            (page.attributes && page.attributes.page) ??
            idx + 1;
        return {
            ...page,
            number,
            url: page.imageUrl || page.url || page.source || ''
        };
    });
    augmented.sort((a, b) => {
        const diff = (a.number || 0) - (b.number || 0);
        if (diff !== 0) return diff;
        return (a.id || a.imageIndex || 0) - (b.id || b.imageIndex || 0);
    });
    return augmented.filter(page => page.url);
}

function getNextChapterId() {
    if (!Array.isArray(allChapters) || allChapters.length === 0) return null;
    const currentIndex = allChapters.findIndex(ch => ch.id == currentChapterId);
    if (currentIndex > 0) {
        return allChapters[currentIndex - 1].id;
    }
    return null;
}

function triggerAutoAdvance() {
    if (autoAdvancePending) return;
    const nextChapterId = getNextChapterId();
    if (!nextChapterId) return;

    autoAdvancePending = true;
    showAutoAdvanceNotice();
    autoAdvanceTimer = setTimeout(() => {
        changeChapter(nextChapterId);
    }, AUTO_ADVANCE_DELAY);
}

function showAutoAdvanceNotice() {
    const toast = document.getElementById('autoAdvanceToast');
    if (!toast) return;
    toast.classList.add('show');
}

function hideAutoAdvanceNotice() {
    const toast = document.getElementById('autoAdvanceToast');
    if (!toast) return;
    toast.classList.remove('show');
}

// ===== Reader Settings =====
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function changeReadMode(mode) {
    currentReadMode = mode;

    // Update button states
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // Update container class
    const container = document.getElementById('imageContainer');
    if (container) {
        container.className = `image-container ${mode}`;
    }

    // Re-display pages if needed
    displayPages();
}

function changeImageWidth(value) {
    currentImageWidth = value;
    document.getElementById('widthValue').textContent = `${value}%`;

    // Update all images
    document.querySelectorAll('.manga-page').forEach(img => {
        img.style.width = `${value}%`;
    });
}

function changeQuality(quality) {
    currentQuality = quality;

    // Update button states
    document.querySelectorAll('[data-quality]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-quality="${quality}"]`).classList.add('active');

    // Reload pages with new quality
    // In real implementation, this would fetch different quality images
    console.log(`Quality changed to: ${quality}`);
}

function toggleAutoScroll() {
    const checkbox = document.getElementById('autoScroll');
    autoScrollEnabled = checkbox.checked;

    if (autoScrollEnabled) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

function startAutoScroll() {
    autoScrollInterval = setInterval(() => {
        window.scrollBy({
            top: 2,
            behavior: 'smooth'
        });

        // Stop at bottom
        if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight) {
            stopAutoScroll();
            document.getElementById('autoScroll').checked = false;
        }
    }, 50);
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// ===== Navigation =====
function goBack() {
    if (currentMangaId) {
        window.location.href = `detail.html?id=${currentMangaId}&source=${currentSource}`;
    } else {
        window.history.back();
    }
}

function changeChapter(chapterId) {
    window.location.href = `reader.html?manga=${encodeURIComponent(currentMangaId)}&chapter=${encodeURIComponent(chapterId)}&source=${currentSource}`;
}

function previousChapter() {
    if (allChapters.length === 0) return;

    const currentIndex = allChapters.findIndex(ch => ch.id == currentChapterId);
    // Chapter list is descending (newest first), so previous = index + 1
    if (currentIndex >= 0 && currentIndex < allChapters.length - 1) {
        changeChapter(allChapters[currentIndex + 1].id);
    }
}

function nextChapter() {
    if (allChapters.length === 0) return;

    const currentIndex = allChapters.findIndex(ch => ch.id == currentChapterId);
    // Chapter list is descending (newest first), so next = index - 1
    if (currentIndex > 0) {
        changeChapter(allChapters[currentIndex - 1].id);
    }
}

function scrollToPage(pageNumber) {
    const pages = document.querySelectorAll('.manga-page');
    if (pages[pageNumber] && pageNumber < pages.length) {
        pages[pageNumber].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== Comments =====
function submitComment() {
    const textarea = document.getElementById('commentText');
    if (!textarea || !textarea.value.trim()) {
        alert('Mohon tulis komentar terlebih dahulu!');
        return;
    }

    const comment = {
        author: 'User' + Math.floor(Math.random() * 1000),
        text: textarea.value.trim(),
        date: 'Baru saja'
    };

    addCommentToList(comment);
    textarea.value = '';
}

function addCommentToList(comment) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    // Remove empty state
    const emptyState = commentsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    commentItem.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.author}</span>
            <span class="comment-date">${comment.date}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
    `;

    commentsList.insertBefore(commentItem, commentsList.firstChild);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Utility Functions =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    const container = document.getElementById('imageContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--danger-color);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>${message}</p>
                <button onclick="window.location.href='detail.html?id=${currentMangaId}&source=${currentSource}'"
                        style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Kembali ke Detail
                </button>
            </div>
        `;
    }
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', function(e) {
    // Arrow keys for navigation
    if (e.key === 'ArrowLeft') {
        previousChapter();
    } else if (e.key === 'ArrowRight') {
        nextChapter();
    } else if (e.key === 'ArrowUp') {
        window.scrollBy({ top: -100, behavior: 'smooth' });
    } else if (e.key === 'ArrowDown') {
        window.scrollBy({ top: 100, behavior: 'smooth' });
    }
    // 's' for settings
    else if (e.key === 's' || e.key === 'S') {
        toggleSettings();
    }
    // ESC to close settings
    else if (e.key === 'Escape') {
        const panel = document.getElementById('settingsPanel');
        if (panel && panel.classList.contains('active')) {
            toggleSettings();
        }
    }
});

// ===== Close settings when clicking outside =====
document.addEventListener('click', function(event) {
    const panel = document.getElementById('settingsPanel');
    const settingsBtn = document.querySelector('.settings-btn');

    if (panel &&
        panel.classList.contains('active') &&
        !panel.contains(event.target) &&
        !settingsBtn.contains(event.target)) {
        toggleSettings();
    }
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    initializeReader();

    // Prevent context menu on images
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('manga-page')) {
            e.preventDefault();
        }
    });
});

// ===== Cleanup on page unload =====
window.addEventListener('beforeunload', function() {
    stopAutoScroll();
});

// ===== Auto-hide Header on Scroll =====
let lastScrollTop = 0;
let headerHideTimeout;

function handleHeaderScroll() {
    const header = document.querySelector('.reader-header');
    if (!header) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Clear previous timeout
    clearTimeout(headerHideTimeout);

    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down & past 100px
        header.classList.add('hidden');
    } else {
        // Scrolling up or at top
        header.classList.remove('hidden');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

// Add scroll listener for auto-hide header
window.addEventListener('scroll', function() {
    clearTimeout(headerHideTimeout);
    headerHideTimeout = setTimeout(handleHeaderScroll, 100);
});

// Add reader-page class to body
document.body.classList.add('reader-page');

// Expose only the functions used by inline handlers to the global scope
Object.assign(window, {
    goBack,
    previousChapter,
    nextChapter,
    changeReadMode,
    changeImageWidth,
    changeQuality,
    toggleAutoScroll,
    changeChapter,
    submitComment,
    scrollToTop,
    toggleSettings
});

})();

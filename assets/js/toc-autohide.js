// TOC 自动隐藏和方向变化处理
(function() {
    const tocDialog = document.getElementById('toc-dialog');
    const tocButton = document.getElementById('toc-drawer-button');
    if (!tocDialog || !tocButton) return;

    let hideTimeout;
    const AUTO_HIDE_DELAY = 3000;

    function startAutoHide() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (tocDialog.open) {
                tocDialog.close();
            }
        }, AUTO_HIDE_DELAY);
    }

    function cancelAutoHide() {
        clearTimeout(hideTimeout);
    }

    // 打开目录时启动自动隐藏
    tocButton.addEventListener('click', () => {
        if (tocDialog.open) {
            cancelAutoHide();
        } else {
            startAutoHide();
        }
    });

    // 鼠标进入目录区域时取消自动隐藏
    tocDialog.addEventListener('mouseenter', cancelAutoHide);

    // 鼠标离开目录区域时重新启动自动隐藏
    tocDialog.addEventListener('mouseleave', startAutoHide);

    // 点击目录链接后关闭目录
    tocDialog.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            cancelAutoHide();
            tocDialog.close();
        });
    });

    // 分辨率变化时（竖屏变横屏）自动隐藏
    const mediaQuery = window.matchMedia('(orientation: landscape) and (min-width: 681px)');
    function handleOrientationChange(e) {
        if (e.matches && tocDialog.open) {
            tocDialog.close();
            cancelAutoHide();
        }
    }
    mediaQuery.addEventListener('change', handleOrientationChange);
})();

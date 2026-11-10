/*
 * Insight Edition photocard download fix
 *
 * Apply these two changes inside index.html:
 * 1. Replace the existing setAdBanner(index) function with the version below.
 * 2. Replace the existing downloadBtn click handler with the version below.
 *
 * Important: the ad image host must send an Access-Control-Allow-Origin header
 * permitting this page's origin. Browser JavaScript cannot bypass a server's
 * missing CORS permission; if CORS is blocked, host the banner on the same
 * origin or configure CORS on the WordPress/media server.
 */

// Replace the existing setAdBanner(index) function.
function setAdBanner(index) {
    currentAdIndex = ((index % adBanners.length) + adBanners.length) % adBanners.length;
    // Set crossOrigin before src. This allows canvas export only when the image
    // server permits CORS for this website.
    adBannerImg.crossOrigin = 'anonymous';
    adBannerImg.src = adBanners[currentAdIndex].url;
    adSelect.value = currentAdIndex;
}

// Replace the existing downloadBtn click handler.
downloadBtn.addEventListener('click', async () => {
    const originalText = downloadBtn.textContent;
    const originalTransform = photocard.style.transform;
    const originalHeight = photocard.style.height;
    const isAdActive = toggleAd.checked;
    const exportHeight = isAdActive ? 1920 : 1642;

    downloadBtn.textContent = 'ডাউনলোড তৈরি হচ্ছে...';
    downloadBtn.disabled = true;

    try {
        // Wait for the selected banner to finish loading before taking the
        // screenshot. This avoids exporting while the banner is still blank.
        if (isAdActive) {
            if (!adBannerImg.src) {
                throw new Error('বিজ্ঞাপন ব্যানার নির্বাচন করা হয়নি।');
            }
            if (!adBannerImg.complete || adBannerImg.naturalWidth === 0) {
                await new Promise((resolve, reject) => {
                    const timeout = window.setTimeout(
                        () => reject(new Error('বিজ্ঞাপন ব্যানার লোড হতে সময় লাগছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।')),
                        20000
                    );
                    adBannerImg.addEventListener('load', () => {
                        window.clearTimeout(timeout);
                        resolve();
                    }, { once: true });
                    adBannerImg.addEventListener('error', () => {
                        window.clearTimeout(timeout);
                        reject(new Error('বিজ্ঞাপন ব্যানার লোড করা যায়নি।'));
                    }, { once: true });
                });
            }
            if (typeof adBannerImg.decode === 'function') {
                await adBannerImg.decode();
            }
        }

        // Ensure the export has the requested dimensions, independent of the
        // responsive preview transform.
        photocard.style.height = `${exportHeight}px`;
        photocard.style.transform = 'none';

        const canvas = await html2canvas(photocard, {
            width: 1920,
            height: exportHeight,
            scale: 1,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#0B1224',
            imageTimeout: 20000,
            logging: false
        });

        const link = document.createElement('a');
        link.download = `Insight_Edition_${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.98);
        link.click();
    } catch (error) {
        console.error('Photocard export failed:', error);
        alert(
            error.message ||
            'ছবি ডাউনলোড করা যায়নি। বিজ্ঞাপন ছবির সার্ভারে CORS অনুমতি চালু আছে কি না পরীক্ষা করুন।'
        );
    } finally {
        photocard.style.height = originalHeight;
        photocard.style.transform = originalTransform;
        updateScale();
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    }
});

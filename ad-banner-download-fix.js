/*
 * Ad-banner download fix for the existing ie.html/index.html.
 * Include this file AFTER the page's existing inline application script.
 * It waits for the selected remote banner to load with CORS enabled before
 * allowing the original html2canvas download handler to run.
 */
(() => {
    const downloadButton = document.getElementById('download-btn');
    const adImage = document.getElementById('ad-banner-img');
    const adToggle = document.getElementById('toggle-ad');

    if (!downloadButton || !adImage || !adToggle) return;

    let preparingDownload = false;
    let replayingClick = false;

    function waitForImage(image) {
        if (image.complete) {
            if (image.naturalWidth === 0) {
                return Promise.reject(new Error('বিজ্ঞাপন ছবিটি লোড হয়নি।'));
            }
            return typeof image.decode === 'function'
                ? image.decode()
                : Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
            };

            const onLoad = async () => {
                cleanup();
                try {
                    if (typeof image.decode === 'function') await image.decode();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            const onError = () => {
                cleanup();
                reject(new Error('বিজ্ঞাপন ছবিটি লোড হয়নি।'));
            };

            image.addEventListener('load', onLoad, { once: true });
            image.addEventListener('error', onError, { once: true });

            // Cover the case where loading finished while listeners were added.
            if (image.complete) {
                cleanup();
                if (image.naturalWidth > 0) {
                    Promise.resolve(
                        typeof image.decode === 'function' ? image.decode() : undefined
                    ).then(resolve, reject);
                } else {
                    reject(new Error('বিজ্ঞাপন ছবিটি লোড হয়নি।'));
                }
            }
        });
    }

    downloadButton.addEventListener('click', async event => {
        if (replayingClick || !adToggle.checked || preparingDownload) return;

        // Stop the original click until the image is ready. Replay it afterward
        // so the existing download handler remains responsible for html2canvas.
        event.preventDefault();
        event.stopImmediatePropagation();
        preparingDownload = true;

        const originalText = downloadButton.textContent;
        downloadButton.disabled = true;
        downloadButton.textContent = 'বিজ্ঞাপন লোড হচ্ছে...';

        try {
            const currentSrc = adImage.getAttribute('src');
            if (!currentSrc) throw new Error('বিজ্ঞাপন ছবির URL পাওয়া যায়নি।');

            // crossorigin must be set before requesting the image. Reassigning
            // src makes the browser fetch it again in CORS mode.
            if (adImage.crossOrigin !== 'anonymous' || adImage.dataset.corsSrc !== currentSrc) {
                adImage.crossOrigin = 'anonymous';
                adImage.dataset.corsSrc = currentSrc;
                adImage.src = currentSrc;
            }

            await waitForImage(adImage);

            downloadButton.disabled = false;
            replayingClick = true;
            downloadButton.click();
        } catch (error) {
            console.error('Ad banner download preparation failed:', error);
            alert(
                'বিজ্ঞাপন ব্যানার লোড বা ডাউনলোড করা যায়নি। সার্ভারে CORS অনুমতি আছে কি না এবং ছবির URL ঠিক আছে কি না পরীক্ষা করুন।'
            );
            downloadButton.textContent = originalText;
            downloadButton.disabled = false;
        } finally {
            replayingClick = false;
            preparingDownload = false;
        }
    }, true);
})();

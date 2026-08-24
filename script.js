document.addEventListener('DOMContentLoaded', () => {
    // === DOM refs ===
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectBtn = document.getElementById('selectBtn');
    const controls = document.getElementById('controls');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const currentFormat = document.getElementById('currentFormat');
    const targetFormatSelect = document.getElementById('targetFormat');
    const outputFileName = document.getElementById('outputFileName');
    const outputFileExt = document.getElementById('outputFileExt');
    const convertBtn = document.getElementById('convertBtn');
    const resultDiv = document.getElementById('result');
    const resultPreview = document.getElementById('resultPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const formatsGrid = document.getElementById('formatsGrid');

    let currentFile = null;
    let currentFileType = ''; // 'image', 'video', 'audio'
    let currentExt = '';
    let convertedBlob = null;
    let convertedFileName = '';

    // === Format mapping ===
    const formatMap = {
        image: {
            label: 'Фото',
            icon: '🖼',
            extensions: ['png', 'jpg', 'jpeg', 'webp'],
            mimes: {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                webp: 'image/webp',
            },
        },
        video: {
            label: 'Видео',
            icon: '🎬',
            extensions: ['mp4', 'webm', 'gif'],
            mimes: {
                mp4: 'video/mp4',
                webm: 'video/webm',
                gif: 'video/gif',
            },
        },
        audio: {
            label: 'Аудио',
            icon: '🎵',
            extensions: ['mp3', 'wav', 'ogg'],
            mimes: {
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                ogg: 'audio/ogg',
            },
        },
    };

    // === Helpers ===
    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function getFileNameWithoutExt(filename) {
        return filename.replace(/\.[^.]+$/, '');
    }

    function getFileCategory(ext) {
        for (const [cat, data] of Object.entries(formatMap)) {
            if (data.extensions.includes(ext)) return cat;
        }
        return null;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function getTargetOptions(category, currentExt) {
        const exts = formatMap[category].extensions;
        return exts.filter(e => e !== currentExt);
    }

    // === Update formats UI ===
    function updateFormatsUI(category) {
        const categories = formatsGrid.querySelectorAll('.format-category');
        categories.forEach(cat => {
            const catType = cat.dataset.category;
            const chips = cat.querySelectorAll('.chip');
            
            if (catType === category) {
                chips.forEach(chip => {
                    chip.classList.remove('inactive');
                    chip.classList.add('active');
                });
            } else {
                chips.forEach(chip => {
                    chip.classList.remove('active');
                    chip.classList.add('inactive');
                });
            }
        });
    }

    // === Update filename extension when target format changes ===
    function updateFileExtension() {
        const targetExt = targetFormatSelect.value;
        if (targetExt) {
            outputFileExt.textContent = '.' + targetExt;
        }
    }

    // === Set default filename from original ===
    function setDefaultFileName(originalName) {
        const baseName = getFileNameWithoutExt(originalName);
        outputFileName.value = baseName;
    }

    // === UI: show controls ===
    function showControls(file) {
        const ext = getFileExtension(file.name);
        const cat = getFileCategory(ext);
        if (!cat) {
            alert('Неподдерживаемый формат. Пожалуйста, загрузите изображение, видео или аудио.');
            return;
        }

        currentFile = file;
        currentFileType = cat;
        currentExt = ext;
        controls.style.display = 'block';
        resultDiv.style.display = 'none';

        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        currentFormat.textContent = ext.toUpperCase();

        // Fill target select
        const targets = getTargetOptions(cat, ext);
        targetFormatSelect.innerHTML = '';
        targets.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f.toUpperCase();
            targetFormatSelect.appendChild(opt);
        });

        // Set default filename
        setDefaultFileName(file.name);
        updateFileExtension();

        // Update formats UI
        updateFormatsUI(cat);

        // Reset converted
        convertedBlob = null;
        convertedFileName = '';
    }

    // === Conversion ===
    function convertFile(file, targetExt) {
        const ext = getFileExtension(file.name);
        const cat = getFileCategory(ext);
        if (!cat) throw new Error('Unsupported category');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (cat === 'image') {
                        convertImage(e.target.result, targetExt, resolve, reject);
                    } else if (cat === 'video') {
                        convertVideo(file, targetExt, resolve, reject);
                    } else if (cat === 'audio') {
                        convertAudio(file, targetExt, resolve, reject);
                    } else {
                        reject(new Error('Неподдерживаемый тип'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsDataURL(file);
        });
    }

    // --- Image conversion ---
    function convertImage(dataUrl, targetExt, resolve, reject) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const mime = formatMap.image.mimes[targetExt] || 'image/png';
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Ошибка конвертации изображения'));
                },
                mime,
                0.92
            );
        };
        img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        img.src = dataUrl;
    }

    // --- Video conversion ---
    function convertVideo(file, targetExt, resolve, reject) {
        if (targetExt === 'gif') {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = url;
            video.muted = true;
            video.autoplay = false;
            video.preload = 'auto';

            video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');

                const duration = Math.min(2, video.duration);
                const fps = 10;
                const totalFrames = Math.floor(duration * fps);
                const frames = [];

                let currentFrame = 0;

                const captureFrame = () => {
                    if (currentFrame >= totalFrames) {
                        createGifFromFrames(frames, canvas.width, canvas.height, resolve, reject);
                        URL.revokeObjectURL(url);
                        return;
                    }
                    video.currentTime = (currentFrame / totalFrames) * duration;
                };

                video.onseeked = () => {
                    ctx.drawImage(video, 0, 0);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                frames.push(blob);
                                currentFrame++;
                                captureFrame();
                            } else {
                                reject(new Error('Ошибка захвата кадра'));
                            }
                        },
                        'image/png'
                    );
                };

                video.onerror = () => reject(new Error('Ошибка видео'));
                captureFrame();
            };
            video.onerror = () => reject(new Error('Не удалось загрузить видео'));
        } else {
            const mime = formatMap.video.mimes[targetExt] || 'video/mp4';
            const blob = new Blob([file], { type: mime });
            resolve(blob);
        }
    }

    // --- Simple GIF creation ---
    function createGifFromFrames(frameBlobs, width, height, resolve, reject) {
        if (frameBlobs.length > 0) {
            resolve(frameBlobs[0]);
        } else {
            reject(new Error('Не удалось создать GIF'));
        }
    }

    // --- Audio conversion ---
    function convertAudio(file, targetExt, resolve, reject) {
        const mime = formatMap.audio.mimes[targetExt] || 'audio/mpeg';
        const blob = new Blob([file], { type: mime });
        resolve(blob);
    }

    // === Show result ===
    function showResult(blob, targetExt) {
        const url = URL.createObjectURL(blob);
        const cat = currentFileType;

        resultDiv.style.display = 'block';
        controls.style.display = 'none';

        resultPreview.innerHTML = '';
        if (cat === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Preview';
            resultPreview.appendChild(img);
        } else if (cat === 'video') {
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.muted = true;
            video.autoplay = false;
            video.loop = true;
            resultPreview.appendChild(video);
        } else if (cat === 'audio') {
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            resultPreview.appendChild(audio);
        }

        // Build final filename from user input
        let baseName = outputFileName.value.trim();
        if (!baseName) {
            baseName = getFileNameWithoutExt(currentFile.name);
        }
        // Sanitize filename (remove forbidden chars)
        baseName = baseName.replace(/[^a-zA-Z0-9а-яА-Я\-_ ]/g, '');
        if (!baseName) {
            baseName = 'converted';
        }
        
        convertedFileName = `${baseName}.${targetExt}`;
        downloadBtn.href = url;
        downloadBtn.download = convertedFileName;
        convertedBlob = blob;
    }

    // === Event handlers ===

    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            showControls(e.target.files[0]);
        }
        fileInput.value = '';
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            showControls(e.dataTransfer.files[0]);
        }
    });

    // Update extension when target format changes
    targetFormatSelect.addEventListener('change', updateFileExtension);

    convertBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        const targetExt = targetFormatSelect.value;
        if (!targetExt) return;

        convertBtn.textContent = '⏳ Конвертация...';
        convertBtn.disabled = true;

        try {
            const blob = await convertFile(currentFile, targetExt);
            showResult(blob, targetExt);
        } catch (err) {
            alert('Ошибка конвертации: ' + err.message);
        } finally {
            convertBtn.textContent = '🔄 Конвертировать';
            convertBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        resultDiv.style.display = 'none';
        controls.style.display = 'block';
        convertedBlob = null;
        URL.revokeObjectURL(downloadBtn.href);
    });
});
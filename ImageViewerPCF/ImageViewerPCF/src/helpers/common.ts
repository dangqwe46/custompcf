import { imageRawData } from '../types/imageViewer';

export const genPluralName = (entityName: string) : string => {
    let pluralEntityName = ""
    
    const len = entityName.length;
    const lastChar = len > 0 ? entityName.slice(-1) : ''
    const last2Char = len > 1 ? entityName.slice(-2) : ''

    if (['s', 'x', 'z'].includes(lastChar) || ['ch', 'sh'].includes(last2Char)) {
        pluralEntityName = entityName + 'es'
    }
    else if (lastChar == 'y') {
        pluralEntityName = entityName.substring(0, len - 1) + 'ies'
    }
    else {
        pluralEntityName = entityName + 's'
    }

    return pluralEntityName
}

/**
 * Generates a RFC4122 version 4 compliant UUID
 * @returns A GUID string
 */
export const generateGuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Resizes an image to reduce its size
 * @param base64Image Base64 encoded image
 * @param maxWidth Maximum width of the image
 * @param quality JPEG quality (0-1)
 * @returns Promise with resized base64 image
 */
export const resizeImage = async (
    base64Image: string, 
    maxWidth: number = 800, 
    quality: number = 0.7
): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.onload = () => {
                // Only resize if the image is larger than maxWidth
                if (img.width <= maxWidth) {
                    resolve(base64Image);
                    return;
                }
                
                const canvas = document.createElement('canvas');
                const ratio = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * ratio;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(base64Image);
                    return;
                }
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Determine the image type from the data URL
                let outputType = 'image/jpeg';
                if (base64Image.startsWith('data:image/png')) {
                    outputType = 'image/png';
                } else if (base64Image.startsWith('data:image/gif')) {
                    outputType = 'image/gif';
                } else if (base64Image.startsWith('data:image/webp')) {
                    outputType = 'image/webp';
                }
                
                const resizedImage = canvas.toDataURL(outputType, quality);
                console.log(`[ImageViewerPCF] Image resized: ${base64Image.length} -> ${resizedImage.length} chars, ratio: ${(resizedImage.length / base64Image.length * 100).toFixed(2)}%`);
                resolve(resizedImage);
            };
            
            img.onerror = (err) => {
                console.error('[ImageViewerPCF] Error loading image for resize:', err);
                resolve(base64Image); // Return original if there's an error
            };
            
            img.src = base64Image;
        } catch (error) {
            console.error('[ImageViewerPCF] Error in resizeImage:', error);
            resolve(base64Image); // Return original if there's an error
        }
    });
};

/**
 * Calculate size in bytes of a base64 string
 * @param base64String The base64 string
 * @returns Size in bytes
 */
export const calculateBase64Size = (base64String: string): number => {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64WithoutPrefix = base64String.substring(base64String.indexOf(',') + 1);
    
    // Calculate size: 3 bytes for every 4 base64 characters, accounting for padding
    const padding = base64WithoutPrefix.endsWith('==') ? 2 : base64WithoutPrefix.endsWith('=') ? 1 : 0;
    const sizeInBytes = Math.floor((base64WithoutPrefix.length * 3) / 4) - padding;
    
    return sizeInBytes;
};
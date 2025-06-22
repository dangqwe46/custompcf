import { imageRawData } from '../types/imageViewer';
import { calculateBase64Size, resizeImage, generateGuid } from '../helpers/common';

/**
 * Service for image processing operations
 */
export class ImageService {
  /**
   * Process a file into an imageRawData object
   * @param file The file to process
   * @returns Promise with the processed image data
   */
  public async processFile(file: File): Promise<imageRawData> {
    try {
      // Validate file type
      this.validateFileType(file.type);
      
      // Validate file size
      this.validateFileSize(file.size);
      
      // Read the file as data URL
      const originalData = await this.readFileAsDataURL(file);
      
      // Resize the image to reduce size
      const resizedData = await resizeImage(originalData, 800, 0.7);
      
      // Calculate actual size of the resized image
      const resizedSize = calculateBase64Size(resizedData);
      
      // Create image data object
      return {
        name: file.name,
        type: file.type,
        size: resizedSize,
        content: resizedData,
        imageId: generateGuid()
      };
    } catch (error) {
      console.error(`[ImageService] Error processing file ${file.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Process a file from camera capture
   * @param file The file object from PCF camera capture
   * @returns Promise with the processed image data
   */
  public async processFileFromCamera(file: ComponentFramework.FileObject): Promise<imageRawData> {
    try {
      if (!file || !file.fileContent) {
        throw new Error('No file content in captured image');
      }
      
      // Get file extension
      let fileExtension = 'jpeg';
      if (file.fileName) {
        fileExtension = file.fileName.split('.').pop() || 'jpeg';
        // Normalize extension
        if (fileExtension.toLowerCase() === 'jpg') fileExtension = 'jpeg';
      }
      
      // Validate file type
      if (!['jpeg', 'png', 'jpg'].includes(fileExtension.toLowerCase())) {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
      
      // Validate file size
      if (file.fileContent && file.fileContent.length > 5 * 1024 * 1024) { // 5MB
        throw new Error(`File size exceeds 5MB limit: ${(file.fileContent.length / (1024 * 1024)).toFixed(2)}MB`);
      }
      
      // Generate proper data URL
      const dataURL = this.generateImageSrcUrl(fileExtension.toLowerCase(), file.fileContent);
      
      // Resize the image
      const resizedDataURL = await resizeImage(dataURL, 800, 0.7);
      
      // Calculate size
      const imageSize = calculateBase64Size(resizedDataURL);
      
      // Create image data object
      return {
        name: file.fileName || `captured_image_${Date.now()}.${fileExtension}`,
        type: `image/${fileExtension.toLowerCase()}`,
        size: imageSize,
        content: resizedDataURL,
        imageId: generateGuid()
      };
    } catch (error) {
      console.error('[ImageService] Error processing captured image:', error);
      throw error;
    }
  }
  
  /**
   * Validates if a collection of images exceeds size limits
   * @param images Array of image data to validate
   * @returns Object with validation results
   */
  public validateImageCollection(images: imageRawData[]): {
    isValid: boolean;
    errorMessage?: string;
    totalSize: number;
  } {
    // Check if the total number of images exceeds 10
    if (images.length > 10) {
      return {
        isValid: false,
        errorMessage: 'Maximum number of images (10) exceeded. Please remove some images first.',
        totalSize: 0
      };
    }
    /*
    // Check JSON string size directly
    const jsonData = JSON.stringify(images);
    const charCount = jsonData.length;
    const maxChars = 1048576; // Multiple field limit: 1,048,576 characters
    
    if (charCount > maxChars) {
      return {
        isValid: false,
        errorMessage: `Size limit exceeded. The maximum size for storage is ${maxChars.toLocaleString()} characters, current size is ${charCount.toLocaleString()} characters.`,
        totalSize: 0
      };
    }
    
    // Calculate total binary size
    const totalSize = images.reduce((total, img) => total + img.size, 0);
    
    if (totalSize > 12000000) { // 12MB limit
      return {
        isValid: false,
        errorMessage: `Storage limit reached. The maximum total binary size is 12MB (current: ${(totalSize / (1024 * 1024)).toFixed(2)}MB).`,
        totalSize
      };
    }
    */
   // Calculate total binary size
   const totalSize = images.reduce((total, img) => total + img.size, 0);
    return {
      isValid: true,
      totalSize
    };
  }
  
  /**
   * Read a file as data URL
   * @param file The file to read
   * @returns Promise with the data URL
   */
  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        if (typeof fr.result === 'string') {
          resolve(fr.result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }
  
  /**
   * Convert a Blob to base64
   * @param blob The Blob to convert
   * @returns Promise with the base64 string
   */
  public blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Generate a data URL for an image
   * @param fileType The file type
   * @param fileContent The file content
   * @returns The data URL
   */
  private generateImageSrcUrl(fileType: string, fileContent: string): string {
    return "data:image/" + fileType + ";base64," + fileContent;
  }
  
  /**
   * Validate file type
   * @param fileType The file type to validate
   * @throws Error if file type is invalid
   */
  private validateFileType(fileType: string): void {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];
    
    if (!validTypes.includes(fileType)) {
      throw new Error(`Invalid file type (${fileType}). Please upload an image file. Supported formats are JPEG, PNG, GIF, BMP and WebP.`);
    }
  }
  
  /**
   * Validate file size
   * @param fileSize The file size to validate in bytes
   * @throws Error if file size exceeds limit
   */
  private validateFileSize(fileSize: number): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (fileSize > maxSize) {
      throw new Error(`File size exceeds the 5MB limit: ${(fileSize / (1024 * 1024)).toFixed(2)}MB.`);
    }
  }
} 
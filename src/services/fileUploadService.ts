import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../config/supabase';
import { decode } from 'base64-arraybuffer';

export interface FileUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class FileUploadService {
  private static instance: FileUploadService;

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Request permissions for camera and media library
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraStatus === 'granted' && mediaStatus === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Pick image from gallery or camera
   */
  async pickImage(source: 'gallery' | 'camera' = 'gallery'): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Camera and media library permissions are required');
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    };

    if (source === 'camera') {
      return await ImagePicker.launchCameraAsync(options);
    } else {
      return await ImagePicker.launchImageLibraryAsync(options);
    }
  }

  /**
   * Pick document file
   */
  async pickDocument(): Promise<DocumentPicker.DocumentPickerResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      return result;
    } catch (error) {
      console.error('Document picker error:', error);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: {
      uri: string;
      name: string;
      type: string;
      base64?: string;
    },
    bucket: string = 'chat-files',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${timestamp}_${file.name}`;

      // Use just the filename as the path (no nested folders)
      const filePath = fileName;

      let fileData: ArrayBuffer;

      if (file.base64) {
        // For images with base64 data
        fileData = decode(file.base64);
      } else {
        // For documents, read as blob
        const response = await fetch(file.uri);
        fileData = await response.arrayBuffer();
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileData, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: fileData.byteLength,
        mimeType: file.type,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload image with compression
   */
  async uploadImage(
    imageUri: string,
    base64?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    const fileName = `image_${Date.now()}.jpg`;
    
    return this.uploadFile(
      {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
        base64,
      },
      'chat-images',
      onProgress
    );
  }

  /**
   * Upload document
   */
  async uploadDocument(
    documentUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    return this.uploadFile(
      {
        uri: documentUri,
        name: fileName,
        type: mimeType,
      },
      'chat-documents',
      onProgress
    );
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string, bucket: string = 'chat-files'): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Use just the filename as the path (no nested folders)
      const filePath = fileName;

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('File deletion error:', error);
      throw error;
    }
  }

  /**
   * Get file info from URL
   */
  getFileInfo(fileUrl: string): { fileName: string; fileExtension: string; isImage: boolean } {
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const isImage = imageExtensions.includes(fileExtension);

    return {
      fileName,
      fileExtension,
      isImage,
    };
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, allowedTypes: string[] = []): boolean {
    if (allowedTypes.length === 0) {
      // Default allowed types
      const defaultTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];
      return defaultTypes.includes(mimeType);
    }

    return allowedTypes.includes(mimeType);
  }

  /**
   * Create thumbnail for image
   */
  async createThumbnail(imageUri: string): Promise<string> {
    try {
      // For now, return the original image
      // In a real app, you might want to use a library like expo-image-manipulator
      return imageUri;
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      return imageUri;
    }
  }

  /**
   * Compress image
   */
  async compressImage(
    imageUri: string,
    quality: number = 0.8,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<string> {
    try {
      // For now, return the original image
      // In a real app, you might want to use expo-image-manipulator for compression
      return imageUri;
    } catch (error) {
      console.error('Image compression error:', error);
      return imageUri;
    }
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance();

// Helper functions
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

export const isDocumentFile = (mimeType: string): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  return documentTypes.includes(mimeType);
};

export const getFileIcon = (mimeType: string): string => {
  if (isImageFile(mimeType)) return 'image-outline';
  if (isVideoFile(mimeType)) return 'videocam-outline';
  if (isAudioFile(mimeType)) return 'musical-notes-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  if (mimeType.includes('word')) return 'document-outline';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'grid-outline';
  return 'document-outline';
};

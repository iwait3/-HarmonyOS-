import picker from '@ohos.file.picker';
import fs from '@ohos.file.fs';
import { BusinessError } from '@ohos.base';

export interface FileInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  timestamp: string;
}

class FilePickerService {
  async pickImage(): Promise<FileInfo | null> {
    try {
      const photoPicker = new picker.PhotoViewPicker();
      const photoSelectOptions = new picker.PhotoSelectOptions();
      photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
      photoSelectOptions.maxSelectNumber = 1;
      
      const result = await photoPicker.select(photoSelectOptions);

      if (result && result.photoUris && result.photoUris.length > 0) {
        const uri = result.photoUris[0];
        const fileInfo = await this.getFileInfo(uri);
        return fileInfo;
      }
      return null;
    } catch (error) {
      console.error('Failed to pick image: ' + JSON.stringify(error));
      return null;
    }
  }

  async pickDocument(): Promise<FileInfo | null> {
    try {
      const documentPicker = new picker.DocumentViewPicker();
      const documentSelectOptions = new picker.DocumentSelectOptions();
      
      const result = await documentPicker.select(documentSelectOptions);

      if (result && result.length > 0) {
        const uri = result[0];
        const fileInfo = await this.getFileInfo(uri);
        return fileInfo;
      }
      return null;
    } catch (error) {
      console.error('Failed to pick document: ' + JSON.stringify(error));
      return null;
    }
  }

  async pickAudio(): Promise<FileInfo | null> {
    try {
      const audioPicker = new picker.AudioViewPicker();
      const audioSelectOptions = new picker.AudioSelectOptions();
      
      const result = await audioPicker.select(audioSelectOptions);

      if (result && result.length > 0) {
        const uri = result[0];
        const fileInfo = await this.getFileInfo(uri);
        return fileInfo;
      }
      return null;
    } catch (error) {
      console.error('Failed to pick audio: ' + JSON.stringify(error));
      return null;
    }
  }

  private async getFileInfo(uri: string): Promise<FileInfo> {
    try {
      const file = fs.openSync(uri, fs.OpenMode.READ_ONLY);
      const stat = fs.statSync(file.fd);
      fs.closeSync(file);

      return {
        uri: uri,
        name: this.getFileNameFromUri(uri),
        size: stat.size,
        type: this.getFileTypeFromUri(uri),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get file info: ' + JSON.stringify(error));
      return {
        uri: uri,
        name: '未知文件',
        size: 0,
        type: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  private getFileNameFromUri(uri: string): string {
    try {
      const segments = uri.split('/');
      let fileName = segments[segments.length - 1] || '未命名文件';
      
      // 解码URI编码的文件名
      try {
        fileName = decodeURIComponent(fileName);
      } catch (e) {
        console.log('文件名无需解码: ' + fileName);
      }
      
      // 美化显示：移除特殊字符，保留中文和基本字符
      fileName = fileName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\-_.\s]/g, '').trim();
      
      return fileName || '未命名文件';
    } catch (error) {
      console.error('文件名处理失败: ' + JSON.stringify(error));
      return '未命名文件';
    }
  }

  private getFileTypeFromUri(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'];
    const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg'];

    if (imageExtensions.includes(extension)) return 'image';
    if (documentExtensions.includes(extension)) return 'document';
    if (audioExtensions.includes(extension)) return 'audio';
    return 'unknown';
  }
}

export default new FilePickerService();
import router from '@ohos.router';
import fileIo from '@ohos.fileio';
import common from '@ohos.app.ability.common';
import promptAction from '@ohos.promptAction';

@Entry
@Component
struct FileViewer {
  @State fileUri: string = '';
  @State fileName: string = '未命名文件';
  @State filePath: string = '';

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    if (params) {
      this.fileUri = params.fileUri || '';
      const originalName = params.fileName || '未命名文件';
      this.fileName = this.beautifyFileName(originalName);
      this.filePath = this.extractFilePath(this.fileUri);
    }
  }

  // 从URI中提取文件路径
  private extractFilePath(uri: string): string {
    if (!uri) return '';
    
    // 处理不同的URI格式
    if (uri.startsWith('file://')) {
      return uri.substring(7); // 移除 file:// 前缀
    } else if (uri.startsWith('/')) {
      return uri; // 直接路径
    } else {
      return uri; // 保持原样
    }
  }

  // 美化文件名显示，修复乱码问题
  private beautifyFileName(fileName: string): string {
    // 处理文件名乱码问题
    let name = fileName;
    
    // 如果文件名包含乱码字符，尝试解码
    if (name.includes('%') || name.includes('&')) {
      try {
        // 尝试URL解码
        name = decodeURIComponent(name);
      } catch (error) {
        console.warn('文件名解码失败:', error);
      }
    }
    
    // 移除文件扩展名
    name = name.replace(/\.[^/.]+$/, '');
    
    // 如果名称过长，截断显示
    if (name.length > 25) {
      name = name.substring(0, 25) + '...';
    }
    
    // 如果名称为空，使用默认名称
    if (!name || name.trim() === '') {
      name = '未命名文件';
    }
    
    return name;
  }

  // 检查文件是否存在
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      // 使用 fileio API 检查文件是否存在
      await fileIo.stat(filePath);
      return true; // 如果没有抛出异常，说明文件存在
    } catch (error) {
      console.error('检查文件存在性失败:', error);
      return false;
    }
  }

  // 打开文件
  private async openFile() {
    if (!this.filePath) {
      promptAction.showToast({
        message: '文件路径无效',
        duration: 2000
      });
      return;
    }

    try {
      // 检查文件是否存在
      const fileExists = await this.checkFileExists(this.filePath);
      if (!fileExists) {
        promptAction.showToast({
          message: '文件不存在或无法访问',
          duration: 2000
        });
        return;
      }

      const context = getContext(this) as common.UIAbilityContext;
      
      // 使用系统文件管理器打开文件
      await context.startAbility({
        action: 'ohos.want.action.viewData',
        uri: this.fileUri,
        type: this.getMimeType(this.fileName)
      });

      // 如果成功启动，显示提示
      promptAction.showToast({
        message: '正在打开文件...',
        duration: 1000
      });
    } catch (error) {
      console.error('打开文件失败:', error);
      promptAction.showToast({
        message: '打开文件失败，请检查文件权限',
        duration: 2000
      });
    }
  }

  // 根据文件名获取MIME类型
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.ms-excel';
      case 'ppt':
      case 'pptx':
        return 'application/vnd.ms-powerpoint';
      case 'txt':
        return 'text/plain';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      default:
        return '*/*';
    }
  }

  build() {
    Column({
      space: 0
    }) {
      // 顶部导航栏
      Row({
        space: 16
      }) {
        Button() {
          Image($r('app.media.back'))
            .width(24)
            .height(24)
            .fillColor('#333333')
        }
        .width(40)
        .height(40)
        .backgroundColor('transparent')
        .onClick(() => router.back())

        Text(this.fileName)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor('#333333')
          .flexGrow(1)
          .textAlign(TextAlign.Center)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .fontFamily('HarmonyOS Sans')  // 使用系统字体避免乱码
      }
      .height(56)
      .width('100%')
      .padding({ left: 12, right: 16 })
      .backgroundColor('#ffffff')
      .border({
        width: { bottom: 1 },
        color: '#e0e0e0'
      })

      // 文件预览区域
      Column({
        space: 24
      }) {
        // 文件图标
        Column({
          space: 16
        }) {
          Image(this.getFileIcon())
            .width(80)
            .height(80)
            .fillColor('#666666')
          
          Text(this.fileName)
            .fontSize(16)
            .fontColor('#333333')
            .textAlign(TextAlign.Center)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .fontFamily('HarmonyOS Sans')  // 使用系统字体避免乱码
          
          // 文件路径信息
          Text(this.filePath ? `路径: ${this.filePath}` : '文件路径不可用')
            .fontSize(12)
            .fontColor('#999999')
            .textAlign(TextAlign.Center)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 8 })
        }
        .width('100%')
        .padding({ top: 80 })
        .justifyContent(FlexAlign.Center)

        // 打开按钮 - 增强版本
        Column({
          space: 12
        }) {
          Button('查看文件')
            .width(200)
            .height(44)
            .fontSize(16)
            .fontColor('#ffffff')
            .backgroundColor('#007AFF')
            .borderRadius(22)
            .onClick(() => {
              this.openFile();
            })
          
          // 辅助按钮
          Button('返回')
            .width(120)
            .height(36)
            .fontSize(14)
            .fontColor('#666666')
            .backgroundColor('transparent')
            .border({
              width: 1,
              color: '#e0e0e0'
            })
            .borderRadius(18)
            .onClick(() => router.back())
        }
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .flexGrow(1)
      .backgroundColor('#f8f8f8')
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }

  private getFileIcon(): Resource {
    const extension = this.fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return $r('app.media.document');
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
      return $r('app.media.document');
    } else if (['mp3', 'wav'].includes(extension)) {
      return $r('app.media.audio');
    } else {
      return $r('app.media.document');
    }
  }
}
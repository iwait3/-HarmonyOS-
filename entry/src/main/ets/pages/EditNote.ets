/**
 * 笔记编辑页面 - 创建和编辑笔记的核心界面
 * 支持文本输入、文件附件添加、内容管理等功能
 */

import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import ConfirmationService from '../Service/ConfirmationService';
import { NoteData, NoteContentType, NoteContentItem } from '../model/NoteData';
import NoteService from '../Service/NoteService';
import FilePickerService, { FileInfo } from '../Service/FilePickerService';

@Entry
@Component
struct EditNote {
  // 状态管理
  @State title: string = '';                          // 笔记标题
  @State contentItems: NoteContentItem[] = [];        // 内容项数组
  @State isDirty: boolean = false;                    // 是否有未保存的修改
  @State currentTextContent: string = '';             // 当前编辑的文本内容
  @State isEditing: boolean = false;                  // 是否正在编辑（显示操作面板）
  private noteId: string = '';                        // 当前编辑的笔记ID（为空表示新建）

  /**
   * 页面即将显示时调用
   * 初始化数据和加载现有笔记（如果是编辑模式）
   */
  async aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    if (params && params.noteId) {
      this.noteId = params.noteId;
      await this.loadNote();
    }
  }

  // 原始数据备份，用于比较是否发生修改
  private originalTitle: string = '';
  private originalContentItems: NoteContentItem[] = [];

  /**
   * 检查笔记是否被修改
   * @returns 是否有真实修改
   */
  private checkIfModified(): boolean {
    // 检查标题是否修改
    if (this.title !== this.originalTitle) {
      return true;
    }
    
    // 检查内容项数量是否变化
    if (this.contentItems.length !== this.originalContentItems.length) {
      return true;
    }
    
    // 检查每个内容项是否变化
    for (let i = 0; i < this.contentItems.length; i++) {
      const currentItem = this.contentItems[i];
      const originalItem = this.originalContentItems[i];
      
      if (!originalItem || 
          currentItem.type !== originalItem.type ||
          currentItem.content !== originalItem.content) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 加载现有笔记数据
   */
  async loadNote() {
    const note = await NoteService.getNoteById(this.noteId);
    if (note) {
      this.title = note.title;
      this.contentItems = note.contentItems || [];
      // 保存原始数据用于比较
      this.originalTitle = note.title;
      this.originalContentItems = [...(note.contentItems || [])];
    }
  }

  /**
   * 返回按钮处理
   * 检查是否有未保存的修改并提示用户
   * @returns 是否阻止默认返回行为
   */
  onBackPress(): boolean {
    const hasRealChanges = this.checkIfModified();
    
    // 如果是查看现有笔记且没有真实修改，直接返回
    if (this.noteId && !hasRealChanges) {
      router.back();
      return false;
    }
    
    // 如果是新建笔记且有内容，或者现有笔记有真实修改，才显示确认弹窗
    if (hasRealChanges) {
      ConfirmationService.showCancelEditConfirmation(hasRealChanges).then((confirmed: boolean) => {
        if (confirmed) {
          router.back();
        }
      });
      return true; // 阻止默认返回行为
    } else {
      router.back();
    }
    return false;
  }

  /**
   * 保存笔记
   * 将当前编辑的笔记数据保存到持久化存储
   */
  async saveNote() {
    // 如果有未保存的文本内容，先保存
    if (this.currentTextContent.trim()) {
      this.addTextContent(this.currentTextContent);
      this.currentTextContent = '';
    }

    const note: NoteData = {
      id: this.noteId || Date.now().toString(),
      title: this.title,
      contentItems: this.contentItems,
      createTime: new Date().toISOString()
    };
    
    const success = await NoteService.saveNote(note);
    if (success) {
      ConfirmationService.showSuccessToast('笔记已保存');
      this.isDirty = false;
      // 更新原始数据
      this.originalTitle = this.title;
      this.originalContentItems = [...this.contentItems];
    } else {
      ConfirmationService.showErrorToast('保存失败，请重试');
    }
  }

  /**
   * 添加文本内容
   * @param text - 文本内容
   */
  addTextContent(text: string) {
    if (text.trim()) {
      this.contentItems.push({
        type: NoteContentType.TEXT,
        content: text.trim(),
        timestamp: new Date().toISOString()
      });
      this.isDirty = true;
    }
  }

  /**
   * 添加图片
   * 调用文件选择器选择图片文件
   */
  async addImage() {
    const fileInfo = await FilePickerService.pickImage();
    if (fileInfo) {
      this.contentItems.push({
        type: NoteContentType.IMAGE,
        content: fileInfo.uri,
        metadata: {
          name: fileInfo.name,
          size: fileInfo.size
        },
        timestamp: new Date().toISOString()
      });
      this.isDirty = true;
      ConfirmationService.showSuccessToast(`图片已添加: ${fileInfo.name}`);
    }
  }

  /**
   * 添加文档
   * 调用文件选择器选择文档文件
   */
  async addDocument() {
    const fileInfo = await FilePickerService.pickDocument();
    if (fileInfo) {
      this.contentItems.push({
        type: NoteContentType.DOCUMENT,
        content: fileInfo.uri,
        metadata: {
          name: fileInfo.name,
          size: fileInfo.size,
          type: fileInfo.type
        },
        timestamp: new Date().toISOString()
      });
      this.isDirty = true;
      ConfirmationService.showSuccessToast(`文档已添加: ${fileInfo.name}`);
    }
  }

  /**
   * 添加音频
   * 调用文件选择器选择音频文件
   */
  async addAudio() {
    const fileInfo = await FilePickerService.pickAudio();
    if (fileInfo) {
      this.contentItems.push({
        type: NoteContentType.AUDIO,
        content: fileInfo.uri,
        metadata: {
          name: fileInfo.name,
          size: fileInfo.size
        },
        timestamp: new Date().toISOString()
      });
      this.isDirty = true;
      ConfirmationService.showSuccessToast(`音频已添加: ${fileInfo.name}`);
    }
  }

  /**
   * 删除内容项
   * @param index - 内容项索引
   */
  async deleteContentItem(index: number) {
    if (index >= 0 && index < this.contentItems.length) {
      const item = this.contentItems[index];
      let contentType = '内容项';
      
      // 根据内容类型显示不同的确认信息
      switch (item.type) {
        case NoteContentType.TEXT:
          contentType = '文本内容';
          break;
        case NoteContentType.IMAGE:
          contentType = '图片';
          break;
        case NoteContentType.DOCUMENT:
          contentType = '文档';
          break;
        case NoteContentType.AUDIO:
          contentType = '音频';
          break;
      }
      
      const confirmed = await ConfirmationService.showContentDeleteConfirmation(contentType);
      
      if (confirmed) {
        this.contentItems.splice(index, 1);
        this.isDirty = true;
        
        ConfirmationService.showSuccessToast(`${contentType}已删除`);
      }
    }
  }

  /**
   * 内容项构建器
   * @param item - 内容项数据
   * @param index - 内容项索引
   * @returns 内容项UI组件
   */
  @Builder
  ContentItemBuilder(item: NoteContentItem, index: number) {
    Column() {
      if (item.type === NoteContentType.TEXT) {
        // 文本内容卡片
        Column() {
          Text(item.content)
            .fontSize(16)
            .fontColor('#333333')
            .lineHeight(24)
            .width('100%')
            .padding(16)
        }
        .width('100%')
        .backgroundColor('#ffffff')
        .borderRadius(12)
        .shadow({
          radius: 8,
          color: '#1a000000',
          offsetX: 0,
          offsetY: 2
        })
        .margin({ bottom: 12 })
      } else {
        // 文件内容卡片
        Row({
          space: 12
        }) {
          // 文件图标区域
          Column({
            space: 4
          }) {
            if (item.type === NoteContentType.IMAGE) {
              Image(item.content)
                .width(60)
                .height(60)
                .objectFit(ImageFit.Cover)
                .borderRadius(8)
            } else {
              Column() {
                Image(this.getFileTypeIcon(item.type))
                  .width(24)
                  .height(24)
                  .fillColor('#666666')
              }
              .width(60)
              .height(60)
              .backgroundColor('#f8f9fa')
              .borderRadius(8)
              .justifyContent(FlexAlign.Center)
            }
          }

          // 文件信息区域
          Column({
            space: 6
          }) {
            Text(this.getDisplayName(item))
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
              .fontColor('#333333')
              .width('100%')
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
            
            Row({
              space: 8
            }) {
              Text(this.getFileTypeDescription(item.type))
                .fontSize(12)
                .fontColor('#666666')
                .backgroundColor('#f0f2f5')
                .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                .borderRadius(4)
              
              Text(`大小: ${this.formatFileSize(Number(item.metadata?.size) || 0)}`)
                .fontSize(12)
                .fontColor('#999999')
            }
          }
          .flexGrow(1)
          .justifyContent(FlexAlign.Center)
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#ffffff')
        .borderRadius(12)
        .shadow({
          radius: 8,
          color: '#1a000000',
          offsetX: 0,
          offsetY: 2
        })
        .margin({ bottom: 12 })
        .onClick(() => this.viewFile(item))
      }
    }
  }

  /**
   * 获取文件类型图标
   * @param type - 文件类型
   * @returns 图标资源
   */
  private getFileTypeIcon(type: NoteContentType): Resource {
    switch (type) {
      case NoteContentType.IMAGE:
        return $r('app.media.document');
      case NoteContentType.DOCUMENT:
        return $r('app.media.document');
      case NoteContentType.AUDIO:
        return $r('app.media.audio');
      default:
        return $r('app.media.document');
    }
  }

  /**
   * 获取显示名称
   * @param item - 内容项
   * @returns 显示名称
   */
  private getDisplayName(item: NoteContentItem): string {
    const nameValue = item.metadata?.name;
    let name = '未命名文件';
    
    if (typeof nameValue === 'string') {
      name = nameValue;
    } else if (typeof nameValue === 'number') {
      name = nameValue.toString();
    }
    
    // 移除文件扩展名
    name = name.replace(/\.[^/.]+$/, '');
    
    // 如果名称过长，截断显示
    if (name.length > 20) {
      name = name.substring(0, 20) + '...';
    }
    
    return name;
  }

  /**
   * 获取文件类型描述
   * @param type - 文件类型
   * @returns 类型描述
   */
  private getFileTypeDescription(type: NoteContentType): string {
    switch (type) {
      case NoteContentType.IMAGE:
        return '图片';
      case NoteContentType.DOCUMENT:
        return '文档';
      case NoteContentType.AUDIO:
        return '音频';
      default:
        return '文件';
    }
  }

  /**
   * 查看文件
   * @param item - 内容项
   */
  private viewFile(item: NoteContentItem) {
    if (item.type === NoteContentType.IMAGE || item.type === NoteContentType.DOCUMENT) {
      router.push({
        url: 'components/FileViewer',
        params: {
          fileUri: item.content,
          fileName: item.metadata?.name || '未命名文件'
        }
      });
    }
  }

  /**
   * 构建侧滑删除按钮
   * @param index - 内容项索引
   * @returns 侧滑按钮组件
   */
  @Builder
  getSwipeActionButtons(index: number) {
    Column() {
      Button() {
        Image($r('app.media.delete'))
          .width(18)
          .height(18)
          .fillColor('#ffffff')
      }
      .width(45)
      .height(45)
      .backgroundColor('#FF3B30')
      .borderRadius(8)
      .onClick(() => this.deleteContentItem(index))
    }
    .width(60)
    .height(60)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#FF3B30')
    .borderRadius(8)
  }

  /**
   * 格式化文件大小
   * @param bytes - 字节数
   * @returns 格式化后的文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 浮动操作按钮构建器
   * @returns 浮动按钮组件
   */
  @Builder
  FloatingActionButton() {
    Column() {
      Button() {
        Column() {
          Image($r('app.media.add'))
            .width(24)
            .height(24)
            .fillColor('#ffffff')
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      }
      .width(56)
      .height(56)
      .backgroundColor('#007AFF')
      .borderRadius(28)
      .shadow({
        radius: 8,
        color: '#40007AFF',
        offsetX: 0,
        offsetY: 4
      })
      .onClick(() => {
        this.isEditing = !this.isEditing;
      })
    }
    .position({
      x: '85%',
      y: '85%'
    })
  }

  /**
   * 操作面板构建器
   * @returns 底部操作面板组件
   */
  @Builder
  ActionSheet() {
    Column() {
      // 标题
      Text('添加内容')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .width('100%')
        .textAlign(TextAlign.Center)
        .padding({ top: 20, bottom: 16 })
      
      // 操作按钮网格
      Row({
        space: 20
      }) {
        // 添加图片
        Column({
          space: 8
        }) {
          Button() {
            Image($r('app.media.document'))
              .width(32)
              .height(32)
              .fillColor('#007AFF')
          }
          .width(56)
          .height(56)
          .backgroundColor('#F0F7FF')
          .borderRadius(12)
          .onClick(() => {
            this.addImage();
            this.isEditing = false;
          })
          
          Text('图片')
            .fontSize(14)
            .fontColor('#333333')
        }
        .alignItems(HorizontalAlign.Center)
        .layoutWeight(1)

        // 添加文档
        Column({
          space: 8
        }) {
          Button() {
            Image($r('app.media.document'))
              .width(32)
              .height(32)
              .fillColor('#007AFF')
          }
          .width(56)
          .height(56)
          .backgroundColor('#F0F7FF')
          .borderRadius(12)
          .onClick(() => {
            this.addDocument();
            this.isEditing = false;
          })
          
          Text('文档')
            .fontSize(14)
            .fontColor('#333333')
        }
        .alignItems(HorizontalAlign.Center)
        .layoutWeight(1)

        // 添加音频
        Column({
          space: 8
        }) {
          Button() {
            Image($r('app.media.audio'))
              .width(32)
              .height(32)
              .fillColor('#007AFF')
          }
          .width(56)
          .height(56)
          .backgroundColor('#F0F7FF')
          .borderRadius(12)
          .onClick(() => {
            this.addAudio();
            this.isEditing = false;
          })
          
          Text('音频')
            .fontSize(14)
            .fontColor('#333333')
        }
        .alignItems(HorizontalAlign.Center)
        .layoutWeight(1)
      }
      .width('100%')
      .padding({ left: 24, right: 24, bottom: 20 })
      
      // 取消按钮
      Button('取消')
        .width('100%')
        .height(44)
        .fontSize(16)
        .fontColor('#007AFF')
        .fontWeight(FontWeight.Medium)
        .backgroundColor('transparent')
        .borderRadius(0)
        .margin({ top: 8 })
        .onClick(() => {
          this.isEditing = false;
        })
    }
    .width('100%')
    .backgroundColor('#ffffff')
    .borderRadius({ topLeft: 16, topRight: 16 })
    .shadow({
      radius: 16,
      color: '#40000000',
      offsetX: 0,
      offsetY: -2
    })
  }

  /**
   * 页面UI构建
   */
  build() {
    Stack() {
      // 主内容区域
      Column({
        space: 0
      }) {
        // 顶部导航栏 - 现代化设计
        Row({
          space: 16
        }) {
          // 返回按钮
          Button() {
          Image($r('app.media.back'))
              .width(24)
              .height(24)
              .fillColor('#333333')
          }
          .width(40)
          .height(40)
          .backgroundColor('transparent')
          .borderRadius(20)
          .onClick(() => this.onBackPress())

          // 页面标题
          Text(this.noteId ? '编辑笔记' : '新建笔记')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor('#333333')
            .flexGrow(1)
            .textAlign(TextAlign.Center)

          // 保存按钮
          Button('保存')
            .width(60)
            .height(36)
            .fontSize(14)
            .fontColor('#ffffff')
            .backgroundColor('#007AFF')
            .borderRadius(18)
            .onClick(async () => {
              await this.saveNote();
              router.back();
            })
        }
        .height(56)
        .width('100%')
        .padding({ left: 16, right: 16 })
        .backgroundColor('#ffffff')
        .shadow({
          radius: 4,
          color: '#0a000000',
          offsetX: 0,
          offsetY: 1
        })

        // 编辑区域
        Scroll() {
          Column({
            space: 0
          }) {
            // 标题输入区域
            Column() {
              Text('标题')
                .fontSize(14)
                .fontColor('#666666')
                .width('100%')
                .padding({left: 16, top: 16, bottom: 8 })
              
              TextInput({
                placeholder: '输入笔记标题...',
                text: this.title
              })
                .onChange((value: string) => {
                  this.title = value;
                  this.isDirty = true;
                })
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor('#333333')
                .placeholderColor('#999999')
                .width('100%')
                .padding({ left: 16, right: 16, bottom: 16 })
                .backgroundColor('#ffffff')
                .borderRadius(0)
            }

            // 文本内容区域
            Column() {
              Text('内容')
                .fontSize(14)
                .fontColor('#666666')
                .width('100%')
                .padding({ left: 16, top: 16, bottom: 8 })
              
              TextArea({
                placeholder: '输入笔记内容...',
                text: this.currentTextContent
              })
                .onChange((value: string) => {
                  this.currentTextContent = value;
                  this.isDirty = true;
                })
                .fontSize(16)
                .fontColor('#333333')
                .placeholderColor('#999999')
                .width('100%')
                .height(120)
                .padding({ left: 16, right: 16, bottom: 8 })
                .backgroundColor('#ffffff')
                .borderRadius(0)

              // 自动保存提示
              Text('内容会自动保存')
                .fontSize(12)
                .fontColor('#999999')
                .width('100%')
                .textAlign(TextAlign.End)
                .padding({ right: 16, bottom: 16 })
            }

            // 已添加内容区域
            if (this.contentItems.length > 0) {
              Column() {
                Text('已添加内容')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#333333')
                  .width('100%')
                  .padding({ left: 16, top: 24, bottom: 16 })

                List() {
                  ForEach(this.contentItems, (item: NoteContentItem, index: number) => {
                    ListItem() {
                      this.ContentItemBuilder(item, index)
                    }
                    .margin({ left: 16, right: 16, bottom: 8 })
                    .swipeAction({
                      end: this.getSwipeActionButtons(index)
                    })
                  }, (item: NoteContentItem, index: number) => index.toString())
                }
                .width('100%')
                .height(this.contentItems.length * 120)
                .layoutWeight(1)
              }
              .width('100%')
            }
          }
          .width('100%')
        }
        .flexGrow(1)
        .backgroundColor('#f8f9fa')
        .padding({ bottom:350 }) // 为浮动按钮留出空间
      }
      .width('100%')
      .height('100%')

      // 浮动操作按钮
      this.FloatingActionButton()

      // 底部操作面板
      if (this.isEditing) {
        Column() {
          Blank()
            .flexGrow(1)
            .onClick(() => {
              this.isEditing = false;
            })
          
          this.ActionSheet()
        }
        .width('100%')
        .height('100%')
        .backgroundColor('#80000000')
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f8f9fa')
  }
}
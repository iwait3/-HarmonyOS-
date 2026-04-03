/**
 * 笔记列表页面 - 应用的主界面
 * 显示所有笔记列表，支持搜索、批量操作、撤销删除等功能
 */

import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { NoteData } from '../model/NoteData';
import NoteService from '../Service/NoteService';
import UndoManager from '../Service/UndoManager';
import ConfirmationService from '../Service/ConfirmationService';

@Entry
@Component
struct Index {
  // 状态管理：使用@State装饰器实现响应式数据绑定
  @State notes: NoteData[] = [];                    // 所有笔记数据
  @State searchText: string = '';                   // 搜索关键词
  @State filteredNotes: NoteData[] = [];            // 过滤后的笔记列表
  @State selectedNotes: string[] = [];              // 批量选择中的笔记ID
  @State isBatchMode: boolean = false;              // 是否处于批量模式
  @State showUndoToast: boolean = false;            // 是否显示撤销提示

  /**
   * 页面即将显示时调用
   * 初始化数据和加载笔记
   */
  async aboutToAppear() {
    await this.loadNotes();
  }

  /**
   * 页面显示时调用
   * 确保数据最新状态
   */
  onPageShow() {
    this.loadNotes();
  }

  /**
   * 加载笔记数据
   * 从服务层获取所有笔记并更新UI
   */
  async loadNotes() {
    this.notes = await NoteService.getAllNotes();
    this.filteredNotes = this.notes;
  }

  /**
   * 搜索功能实现
   * 根据关键词过滤笔记列表
   */
  onSearch() {
    if (this.searchText) {
      // 多维度搜索：标题、标签、文本内容
      this.filteredNotes = this.notes.filter(note => {
        // 搜索标题
        if (note.title && note.title.includes(this.searchText)) {
          return true;
        }
        
        // 搜索标签
        if (note.tags && note.tags.some(tag => tag.includes(this.searchText))) {
          return true;
        }
        
        // 搜索文本内容
        if (note.contentItems) {
          return note.contentItems.some(item => {
            if (item.type === 'text') {
              return item.content.includes(this.searchText);
            }
            return false;
          });
        }
        
        return false;
      });
    } else {
      this.filteredNotes = this.notes;
    }
  }

  /**
   * 添加新笔记
   * 跳转到编辑页面创建新笔记
   */
  onAddNote() {
    router.push({
      url: 'pages/EditNote'
    });
  }

  /**
   * 笔记点击事件处理
   * 根据当前模式执行不同操作
   * @param note - 被点击的笔记对象
   */
  onNoteClick(note: NoteData) {
    if (this.isBatchMode) {
      // 批量模式：切换选择状态
      this.toggleNoteSelection(note.id);
    } else {
      // 正常模式：跳转到编辑页面
      router.push({
        url: 'pages/EditNote',
        params: {
          noteId: note.id
        }
      });
    }
  }

  /**
   * 切换笔记选择状态
   * @param noteId - 笔记ID
   */
  toggleNoteSelection(noteId: string) {
    const index = this.selectedNotes.indexOf(noteId);
    if (index > -1) {
      this.selectedNotes.splice(index, 1);
    } else {
      this.selectedNotes.push(noteId);
    }
  }

  /**
   * 删除单个笔记
   * @param noteId - 笔记ID
   */
  async deleteNote(noteId: string) {
    const noteToDelete = this.notes.find(note => note.id === noteId);
    if (!noteToDelete) {
      return;
    }

    // 显示确认对话框
    const confirmed = await ConfirmationService.showNoteDeleteConfirmation(
      noteToDelete.title || '未命名笔记',
      noteToDelete.isPinned
    );
    
    if (confirmed) {
      // 添加到撤销管理器
      UndoManager.addDeletedNotes([noteToDelete]);
      const success = await NoteService.deleteNote(noteId);
      
      if (success) {
        await this.loadNotes();
        this.showUndoToast = true;
        ConfirmationService.showSuccessToast('笔记删除成功');
        
        // 5秒后自动隐藏撤销提示
        setTimeout(() => {
          this.showUndoToast = false;
          UndoManager.clear();
        }, 5000);
      } else {
        ConfirmationService.showErrorToast('删除失败，请重试');
      }
    }
  }

  /**
   * 撤销删除操作
   * 从撤销管理器恢复已删除的笔记
   */
  async undoDelete() {
    if (UndoManager.hasUndo()) {
      const notesToRestore = await UndoManager.undo();
      const success = await NoteService.batchSaveNotes(notesToRestore);
      await this.loadNotes();
      this.showUndoToast = false;
      
      if (success) {
        ConfirmationService.showUndoToast('删除操作已撤销');
      } else {
        ConfirmationService.showErrorToast('撤销操作失败');
      }
    }
  }

  /**
   * 批量删除选中的笔记
   */
  async deleteSelectedNotes() {
    if (this.selectedNotes.length === 0) {
      ConfirmationService.showErrorToast('请先选择要删除的笔记');
      return;
    }

    const confirmed = await ConfirmationService.showBatchDeleteConfirmation(this.selectedNotes.length, '笔记');
    
    if (confirmed) {
      const notesToDelete = this.notes.filter(note => this.selectedNotes.includes(note.id));
      UndoManager.addDeletedNotes(notesToDelete);
      
      const deleteResult = await NoteService.deleteNotes(this.selectedNotes);
      
      if (deleteResult.failed.length > 0) {
        ConfirmationService.showBatchResultToast(
          deleteResult.success.length, 
          this.selectedNotes.length, 
          '删除'
        );
      } else {
        ConfirmationService.showSuccessToast(`成功删除 ${deleteResult.success.length} 个笔记`);
      }
      
      await this.loadNotes();
      this.selectedNotes = [];
      this.isBatchMode = false;
      this.showUndoToast = true;
      
      setTimeout(() => {
        this.showUndoToast = false;
        UndoManager.clear();
      }, 5000);
    }
  }

  /**
   * 切换批量操作模式
   */
  toggleBatchMode() {
    this.isBatchMode = !this.isBatchMode;
    if (!this.isBatchMode) {
      this.selectedNotes = [];
    }
  }

  /**
   * 获取笔记预览内容
   * @param note - 笔记对象
   * @returns 预览文本
   */
  private getNotePreview(note: NoteData): string {
    if (!note.contentItems || note.contentItems.length === 0) {
      return '暂无内容';
    }

    const firstItem = note.contentItems[0];
    if (firstItem.type === 'text') {
      return firstItem.content.length > 50 
        ? firstItem.content.substring(0, 50) + '...' 
        : firstItem.content;
    } else {
      // 文件类型预览
      const typeMap: Record<string, string> = {
        'image': '[图片]',
        'document': '[文档]',
        'audio': '[音频]'
      };
      return typeMap[firstItem.type] || '[文件]';
    }
  }

  /**
   * 格式化日期显示
   * @param dateString - 日期字符串
   * @returns 格式化后的日期文本
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // 相对时间显示
      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return dateString;
    }
  }

  /**
   * 构建侧滑删除按钮
   * @param note - 笔记对象
   * @returns 侧滑按钮组件
   */
  @Builder
  getSwipeActionButtons(note: NoteData) {
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
      .onClick(() => this.deleteNote(note.id))
    }
    .width(60)
    .height(60)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#FF3B30')
    .borderRadius(8)
  }

  /**
   * 页面UI构建
   */
  build() {
    Stack({ alignContent: Alignment.TopStart }) {
      // 主内容区域
      Column({
        space: 0
      }) {
        // 顶部操作栏 - 现代简约设计
        Column({
          space: 8
        }) {
          // 搜索区域
          Row({
            space: 12
          }) {
            // 搜索框 - 简洁设计
            Row({
              space: 8
            }) {
              Image($r('app.media.search'))
                .width(20)
                .height(20)
                .fillColor('#666666')
                .margin({ left: 12 })
              
              TextInput({
                placeholder: '搜索笔记...',
                text: this.searchText
              })
                .onChange((value: string) => {
                  this.searchText = value;
                  this.onSearch();
                })
                .width('100%')
                .height(40)
                .fontSize(16)
                .fontColor('#333333')
                .placeholderColor('#999999')
                .backgroundColor('transparent')
            }
            .backgroundColor('#f8f9fa')
            .borderRadius(20)
            .flexGrow(1)
            .height(40)
            .margin({ left: 16, right: 16 })

            // 批量操作按钮
            Button() {
              Image(this.isBatchMode ? $r('app.media.add') : $r('app.media.more1'))
                .width(20)
                .height(20)
                .fillColor(this.isBatchMode ? '#007AFF' : '#666666')
            }
            .width(40)
            .height(40)
            .backgroundColor(this.isBatchMode ? '#e6f3ff' : 'transparent')
            .borderRadius(20)
            .margin({ right: 16 })
            .onClick(() => this.toggleBatchMode())
          }
          .width('100%')

          // 批量操作工具栏
          if (this.isBatchMode) {
            Row({
              space: 16
            }) {
              Text(`已选择 ${this.selectedNotes.length} 个笔记`)
                .fontSize(14)
                .fontColor('#666666')
                .flexGrow(1)
                .margin({ left: 16 })

              Button('删除选中')
                .width(80)
                .height(32)
                .fontSize(12)
                .backgroundColor('#FF3B30')
                .fontColor('#ffffff')
                .borderRadius(16)
                .margin({ right: 16 })
                .onClick(() => this.deleteSelectedNotes())
            }
            .width('100%')
            .padding({ top: 8, bottom: 8 })
            .backgroundColor('#f8f9fa')
            .borderRadius(8)
            .margin({ left: 16, right: 16 })
          }
        }
        .width('100%')
        .padding({ top: 12, bottom: 12 })
        .backgroundColor('#ffffff')

        // 笔记列表
        List() {
          ForEach(this.filteredNotes, (note: NoteData) => {
            ListItem() {
              Row({
                space: 12
              }) {
                if (this.isBatchMode) {
                  Image(this.selectedNotes.includes(note.id) ? $r('app.media.add') : $r('app.media.search'))
                    .width(20)
                    .height(20)
                    .fillColor(this.selectedNotes.includes(note.id) ? '#007AFF' : '#CCCCCC')
                }

                Column({
                  space: 6
                }) {
                  Row() {
                    Text(note.title || '未命名笔记')
                      .fontSize(16)
                      .fontWeight(FontWeight.Medium)
                      .fontColor('#333333')
                      .flexGrow(1)
                    
                    if (note.isPinned) {
                      Image($r('app.media.more1'))
                        .width(16)
                        .height(16)
                        .margin({ left: 8 })
                        .fillColor('#FF9500')
                    }
                  }
                  .width('100%')

                  Text(this.getNotePreview(note))
                    .fontSize(14)
                    .fontColor('#666666')
                    .width('100%')
                    .maxLines(2)

                  Row() {
                    if (note.tags && note.tags.length > 0) {
                      Text(note.tags.slice(0, 2).join(', '))
                        .fontSize(11)
                        .fontColor('#666666')
                        .backgroundColor('#f0f0f0')
                        .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                        .borderRadius(4)
                    }
                    
                    Text(this.formatDate(note.updateTime || note.createTime))
                      .fontSize(11)
                      .fontColor('#999999')
                      .margin({ left: 8 })
                  }
                  .width('100%')
                  .margin({ top: 4 })
                }
                .flexGrow(1)
              }
              .padding(16)
              .backgroundColor(this.selectedNotes.includes(note.id) ? '#f0f8ff' : '#ffffff')
              .borderRadius(12)
              .margin({ left: 16, right: 16, bottom: 8 })
              .border({
                width: 1,
                color: '#f0f0f0'
              })
              .onClick(() => this.onNoteClick(note))
            }
            .swipeAction({
              end: this.getSwipeActionButtons(note)
            })
          }, (note: NoteData) => note.id)
        }
        .width('100%')
        .flexGrow(1)
        .backgroundColor('#ffffff')

        // 撤销操作提示
        if (this.showUndoToast) {
          Row({
            space: 16
          }) {
            Text(`已删除 ${UndoManager.getUndoNotes().length} 个笔记`)
              .fontSize(14)
              .fontColor('#ffffff')
              .flexGrow(1)
              .margin({ left: 16 })

            Button('撤销')
              .width(50)
              .height(30)
              .fontSize(12)
              .backgroundColor('#ffffff')
              .fontColor('#007AFF')
              .borderRadius(4)
              .margin({ right: 16 })
              .onClick(() => this.undoDelete())
          }
          .width('100%')
          .height(50)
          .backgroundColor('#333333')
          .borderRadius(8)
          .position({
            x: '0%',
            y: '90%'
          })
        }

        // 添加笔记按钮 - 浮动操作按钮
        Button() {
          Image($r('app.media.add'))
            .width(24)
            .height(24)
            .fillColor('#ffffff')
        }
        .width(56)
        .height(56)
        .position({
          x: '85%',
          y: '85%'
        })
        .backgroundColor('#007AFF')
        .borderRadius(28)
        .shadow({
          radius: 8,
          color: '#40007AFF',
          offsetX: 0,
          offsetY: 2
        })
        .onClick(() => this.onAddNote())
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
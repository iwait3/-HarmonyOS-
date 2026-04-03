/**
 * 笔记服务 - 基于HarmonyOS最佳实践的笔记数据管理
 * 负责笔记数据的增删改查操作，使用Preferences进行持久化存储
 */

import dataPreferences from '@ohos.data.preferences';
import { NoteData } from '../model/NoteData';
import common from '@ohos.app.ability.common';

class NoteService {
  // 数据存储相关属性
  private preferences: dataPreferences.Preferences | null = null; // Preferences实例
  private readonly PREFERENCE_NAME = 'note_app_preferences';     // 存储文件名
  private readonly NOTES_KEY = 'notes';                          // 笔记数据键名
  private context: common.UIAbilityContext | null = null;         // 应用上下文
  private isInitialized: boolean = false;                         // 初始化状态

  // 缓存机制配置
  private notesCache: NoteData[] | null = null;                   // 笔记数据缓存
  private lastCacheUpdate: number = 0;                            // 最后缓存更新时间
  private readonly CACHE_TIMEOUT = 5000;                          // 5秒缓存有效期

  /**
   * 设置应用上下文
   * @param context - UIAbility上下文对象
   */
  setContext(context: common.UIAbilityContext): void {
    this.context = context;
  }

  /**
   * 初始化服务
   * 创建Preferences实例用于数据持久化
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.preferences && this.context) {
      try {
        this.preferences = await dataPreferences.getPreferences(this.context, this.PREFERENCE_NAME);
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize preferences: ' + JSON.stringify(error));
        throw new Error('Preferences initialization failed');
      }
    }
  }

  /**
   * 检查缓存是否有效
   * @returns 缓存是否在有效期内
   */
  private isCacheValid(): boolean {
    return this.notesCache !== null && 
           Date.now() - this.lastCacheUpdate < this.CACHE_TIMEOUT;
  }

  /**
   * 获取所有笔记（带缓存优化）
   * @returns 笔记数据数组
   */
  async getAllNotes(): Promise<NoteData[]> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Preferences not initialized');
      return [];
    }

    // 使用缓存机制减少IO操作
    if (this.isCacheValid()) {
      return this.notesCache!;
    }
    
    try {
      const notesJson = await this.preferences.get(this.NOTES_KEY, '[]');
      const notes = JSON.parse(notesJson as string) as NoteData[];
      
      // 更新缓存
      this.notesCache = notes;
      this.lastCacheUpdate = Date.now();
      
      return notes;
    } catch (error) {
      console.error('Failed to get notes: ' + JSON.stringify(error));
      return [];
    }
  }

  /**
   * 保存笔记
   * @param note - 笔记数据对象
   * @returns 保存是否成功
   */
  async saveNote(note: NoteData): Promise<boolean> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Preferences not initialized');
      return false;
    }
    
    try {
      const notes = await this.getAllNotes();
      const existingIndex = notes.findIndex(n => n.id === note.id);

      // 更新笔记数据，添加更新时间
      const updatedNote = {
        ...note,
        updateTime: new Date().toISOString()
      };

      // 判断是新增还是更新
      if (existingIndex >= 0) {
        notes[existingIndex] = updatedNote;
      } else {
        updatedNote.createTime = new Date().toISOString();
        notes.push(updatedNote);
      }

      // 按更新时间降序排序，最新笔记显示在最前面
      notes.sort((a, b) => {
        const timeA = new Date(a.updateTime || a.createTime).getTime();
        const timeB = new Date(b.updateTime || b.createTime).getTime();
        return timeB - timeA;
      });

      // 保存到Preferences
      await this.preferences.put(this.NOTES_KEY, JSON.stringify(notes));
      await this.preferences.flush();
      
      // 清除缓存，确保下次读取最新数据
      this.notesCache = null;
      
      return true;
    } catch (error) {
      console.error('Failed to save note: ' + JSON.stringify(error));
      return false;
    }
  }

  /**
   * 删除笔记
   * @param id - 笔记ID
   * @returns 删除是否成功
   */
  async deleteNote(id: string): Promise<boolean> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Preferences not initialized');
      return false;
    }
    
    try {
      const notes = await this.getAllNotes();
      const filteredNotes = notes.filter(note => note.id !== id);
      
      // 检查是否找到要删除的笔记
      if (filteredNotes.length === notes.length) {
        return false;
      }
      
      await this.preferences.put(this.NOTES_KEY, JSON.stringify(filteredNotes));
      await this.preferences.flush();
      
      this.notesCache = null;
      
      return true;
    } catch (error) {
      console.error('Failed to delete note: ' + JSON.stringify(error));
      return false;
    }
  }

  /**
   * 批量删除笔记
   * @param ids - 笔记ID数组
   * @returns 删除结果（成功和失败的ID列表）
   */
  async deleteNotes(ids: string[]): Promise<{ success: string[], failed: string[] }> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Preferences not initialized');
      return { success: [], failed: ids };
    }
    
    try {
      const notes = await this.getAllNotes();
      const filteredNotes = notes.filter(note => !ids.includes(note.id));
      
      // 获取实际删除的笔记ID
      const deletedIds = notes
        .filter(note => ids.includes(note.id))
        .map(note => note.id);
      
      await this.preferences.put(this.NOTES_KEY, JSON.stringify(filteredNotes));
      await this.preferences.flush();
      
      this.notesCache = null;
      
      return { 
        success: deletedIds, 
        failed: ids.filter(id => !deletedIds.includes(id)) 
      };
    } catch (error) {
      console.error('Failed to delete notes: ' + JSON.stringify(error));
      return { success: [], failed: ids };
    }
  }

  /**
   * 批量保存笔记
   * @param notes - 笔记数据数组
   * @returns 保存是否成功
   */
  async batchSaveNotes(notes: NoteData[]): Promise<boolean> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Preferences not initialized');
      return false;
    }
    
    try {
      const existingNotes = await this.getAllNotes();
      const updatedNotes = [...existingNotes];
      
      // 批量更新笔记数据
      for (const note of notes) {
        const existingIndex = updatedNotes.findIndex(n => n.id === note.id);
        if (existingIndex >= 0) {
          updatedNotes[existingIndex] = {
            ...note,
            updateTime: new Date().toISOString()
          };
        } else {
          updatedNotes.push({
            ...note,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          });
        }
      }
      
      // 排序
      updatedNotes.sort((a, b) => {
        const timeA = new Date(a.updateTime || a.createTime).getTime();
        const timeB = new Date(b.updateTime || b.createTime).getTime();
        return timeB - timeA;
      });
      
      await this.preferences.put(this.NOTES_KEY, JSON.stringify(updatedNotes));
      await this.preferences.flush();
      
      this.notesCache = null;
      
      return true;
    } catch (error) {
      console.error('Failed to batch save notes: ' + JSON.stringify(error));
      return false;
    }
  }

  /**
   * 根据ID获取笔记
   * @param id - 笔记ID
   * @returns 笔记数据或undefined
   */
  async getNoteById(id: string): Promise<NoteData | undefined> {
    await this.init();
    
    try {
      const notes = await this.getAllNotes();
      return notes.find(note => note.id === id);
    } catch (error) {
      console.error('Failed to get note by id: ' + JSON.stringify(error));
      return undefined;
    }
  }

  /**
   * 搜索笔记
   * @param query - 搜索关键词
   * @returns 匹配的笔记数组
   */
  async searchNotes(query: string): Promise<NoteData[]> {
    if (!query.trim()) {
      return await this.getAllNotes();
    }
    
    try {
      const notes = await this.getAllNotes();
      const searchTerm = query.toLowerCase();
      
      // 多维度搜索：标题、标签、文本内容
      return notes.filter(note => {
        // 搜索标题
        if (note.title && note.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // 搜索标签
        if (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
          return true;
        }
        
        // 搜索内容
        if (note.contentItems) {
          return note.contentItems.some(item => {
            if (item.type === 'text') {
              return item.content.toLowerCase().includes(searchTerm);
            }
            return false;
          });
        }
        
        return false;
      });
    } catch (error) {
      console.error('Failed to search notes: ' + JSON.stringify(error));
      return [];
    }
  }

  /**
   * 获取笔记数量统计
   * @returns 统计信息对象
   */
  async getStatistics(): Promise<{
    total: number;
    pinned: number;
    withImages: number;
    withDocuments: number;
    withAudio: number;
  }> {
    try {
      const notes = await this.getAllNotes();
      
      return {
        total: notes.length,
        pinned: notes.filter(note => note.isPinned).length,
        withImages: notes.filter(note => 
          note.contentItems?.some(item => item.type === 'image')
        ).length,
        withDocuments: notes.filter(note => 
          note.contentItems?.some(item => item.type === 'document')
        ).length,
        withAudio: notes.filter(note => 
          note.contentItems?.some(item => item.type === 'audio')
        ).length
      };
    } catch (error) {
      console.error('Failed to get statistics: ' + JSON.stringify(error));
      return { total: 0, pinned: 0, withImages: 0, withDocuments: 0, withAudio: 0 };
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.notesCache = null;
    this.lastCacheUpdate = 0;
  }
}

// 导出单例实例
export default new NoteService();
/**
 * 增强版撤销管理器 - 支持多种操作的撤销功能
 */

import { NoteData } from '../model/NoteData';

interface UndoActionData {
  notes?: NoteData[];
  old?: NoteData;
  new?: NoteData;
}

interface UndoAction {
  id: string;
  type: 'delete' | 'modify' | 'create' | 'batch_delete';
  timestamp: number;
  data: UndoActionData | NoteData;
  description: string;
  successCallback?: () => void;
  errorCallback?: (error: string) => void;
}

class EnhancedUndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private readonly MAX_STACK_SIZE = 20;
  private readonly UNDO_TIMEOUT = 15000; // 15秒超时

  /**
   * 添加删除操作到撤销栈
   */
  addDeletedNotes(notes: NoteData[]): void {
    const action: UndoAction = {
      id: this.generateId(),
      type: notes.length > 1 ? 'batch_delete' : 'delete',
      timestamp: Date.now(),
      data: { notes } as UndoActionData,
      description: `删除 ${notes.length} 个笔记`
    };
    
    this.addToStack(action);
    this.clearRedoStack(); // 执行新操作时清除重做栈
  }

  /**
   * 添加修改操作到撤销栈
   */
  addModifiedNote(oldNote: NoteData, newNote: NoteData): void {
    const action: UndoAction = {
      id: this.generateId(),
      type: 'modify',
      timestamp: Date.now(),
      data: { old: oldNote, new: newNote },
      description: `修改笔记"${oldNote.title || '未命名笔记'}"`
    };
    
    this.addToStack(action);
    this.clearRedoStack();
  }

  /**
   * 添加创建操作到撤销栈
   */
  addCreatedNote(note: NoteData): void {
    const action: UndoAction = {
      id: this.generateId(),
      type: 'create',
      timestamp: Date.now(),
      data: note,
      description: `创建笔记"${note.title || '未命名笔记'}"`
    };
    
    this.addToStack(action);
    this.clearRedoStack();
  }

  /**
   * 执行撤销操作
   */
  async undo(): Promise<{ success: boolean; notes: NoteData[]; description: string }> {
    if (!this.hasUndo()) {
      return { success: false, notes: [], description: '没有可撤销的操作' };
    }

    const action = this.undoStack.pop()!;
    
    // 检查是否超时
    if (Date.now() - action.timestamp > this.UNDO_TIMEOUT) {
      return { success: false, notes: [], description: '撤销操作已超时' };
    }

    try {
      let notesToRestore: NoteData[] = [];
      
      switch (action.type) {
        case 'delete':
        case 'batch_delete':
          notesToRestore = Array.isArray(action.data) ? action.data as NoteData[] : [];
          // 将删除操作转换为重做操作
          this.redoStack.push({
            ...action,
            type: 'delete',
            timestamp: Date.now()
          });
          break;
          
        case 'modify':
          const modifyData = action.data as UndoActionData;
          notesToRestore = modifyData.old ? [modifyData.old] : [];
          // 将修改操作转换为重做操作
          this.redoStack.push({
            ...action,
            type: 'modify',
            data: { old: modifyData.new, new: modifyData.old },
            timestamp: Date.now()
          });
          break;
          
        case 'create':
          // 对于创建操作，撤销意味着删除
          notesToRestore = [];
          this.redoStack.push({
            ...action,
            timestamp: Date.now()
          });
          break;
      }

      if (action.successCallback) {
        action.successCallback();
      }

      return { 
        success: true, 
        notes: notesToRestore, 
        description: `已撤销: ${action.description}` 
      };
    } catch (error) {
      if (action.errorCallback) {
        action.errorCallback(String(error));
      }
      return { success: false, notes: [], description: `撤销失败: ${error}` };
    }
  }

  /**
   * 执行重做操作
   */
  async redo(): Promise<{ success: boolean; notes: NoteData[]; description: string }> {
    if (!this.hasRedo()) {
      return { success: false, notes: [], description: '没有可重做的操作' };
    }

    const action = this.redoStack.pop()!;

    try {
      let notesToProcess: NoteData[] = [];
      
      switch (action.type) {
        case 'delete':
          notesToProcess = Array.isArray(action.data) ? action.data as NoteData[] : [];
          // 将重做操作添加回撤销栈
          this.undoStack.push({
            ...action,
            timestamp: Date.now()
          });
          break;
          
        case 'modify':
          const modifyData = action.data as UndoActionData;
          notesToProcess = modifyData.new ? [modifyData.new] : [];
          this.undoStack.push({
            ...action,
            data: { old: modifyData.new, new: modifyData.old },
            timestamp: Date.now()
          });
          break;
          
        case 'create':
          notesToProcess = [action.data as NoteData];
          this.undoStack.push({
            ...action,
            timestamp: Date.now()
          });
          break;
      }

      if (action.successCallback) {
        action.successCallback();
      }

      return { 
        success: true, 
        notes: notesToProcess, 
        description: `已重做: ${action.description}` 
      };
    } catch (error) {
      if (action.errorCallback) {
        action.errorCallback(String(error));
      }
      return { success: false, notes: [], description: `重做失败: ${error}` };
    }
  }

  /**
   * 检查是否有可撤销的操作
   */
  hasUndo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const latestAction = this.undoStack[this.undoStack.length - 1];
    return Date.now() - latestAction.timestamp <= this.UNDO_TIMEOUT;
  }

  /**
   * 检查是否有可重做的操作
   */
  hasRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取可撤销的操作描述
   */
  getUndoDescription(): string {
    if (!this.hasUndo()) {
      return '';
    }

    const action = this.undoStack[this.undoStack.length - 1];
    return `撤销 ${action.description}`;
  }

  /**
   * 获取可重做的操作描述
   */
  getRedoDescription(): string {
    if (!this.hasRedo()) {
      return '';
    }

    const action = this.redoStack[this.redoStack.length - 1];
    return `重做 ${action.description}`;
  }

  /**
   * 获取撤销栈中的笔记
   */
  getUndoNotes(): NoteData[] {
    if (!this.hasUndo()) {
      return [];
    }

    const action = this.undoStack[this.undoStack.length - 1];
    switch (action.type) {
      case 'delete':
      case 'batch_delete':
        return Array.isArray(action.data) ? action.data as NoteData[] : [];
      case 'modify':
        const modifyData = action.data as UndoActionData;
        return modifyData.old ? [modifyData.old] : [];
      default:
        return [];
    }
  }

  /**
   * 清除撤销栈
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * 清除重做栈
   */
  clearRedoStack(): void {
    this.redoStack = [];
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 获取撤销超时剩余时间（秒）
   */
  getRemainingTime(): number {
    if (!this.hasUndo()) {
      return 0;
    }

    const latestAction = this.undoStack[this.undoStack.length - 1];
    const remaining = this.UNDO_TIMEOUT - (Date.now() - latestAction.timestamp);
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(): Array<{
    type: string;
    description: string;
    timestamp: string;
    canUndo: boolean;
  }> {
    const now = Date.now();
    return this.undoStack.map(action => ({
      type: action.type,
      description: action.description,
      timestamp: new Date(action.timestamp).toLocaleString(),
      canUndo: now - action.timestamp <= this.UNDO_TIMEOUT
    }));
  }

  /**
   * 添加操作到栈中
   */
  private addToStack(action: UndoAction): void {
    // 清除超时的操作
    this.cleanExpiredActions();
    
    // 限制栈大小
    if (this.undoStack.length >= this.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
    
    this.undoStack.push(action);
  }

  /**
   * 清除过期的操作
   */
  private cleanExpiredActions(): void {
    const now = Date.now();
    this.undoStack = this.undoStack.filter(action => 
      now - action.timestamp <= this.UNDO_TIMEOUT
    );
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new EnhancedUndoManager();
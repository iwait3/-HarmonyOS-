import { NoteData } from '../model/NoteData';
import OperationAuditService from './OperationAuditService';

/**
 * 撤销管理器 - 管理删除操作的撤销功能
 */
class UndoManager {
  private deletedNotes: NoteData[] = [];
  private undoTimeout: number = 5000; // 5秒撤销超时
  private timeoutHandle: number | null = null;
  private undoHistory: Array<{notes: NoteData[], timestamp: number, operation: string}> = [];
  private redoHistory: Array<{notes: NoteData[], timestamp: number, operation: string}> = [];

  /**
   * 添加删除的笔记到撤销管理器
   */
  addDeletedNotes(notes: NoteData[]): void {
    // 记录到撤销历史
    this.undoHistory.push({
      notes: [...notes],
      timestamp: Date.now(),
      operation: 'delete'
    });
    
    // 清空重做历史
    this.redoHistory = [];
    
    this.deletedNotes.push(...notes);
    this.startUndoTimer();
  }

  /**
   * 获取可撤销的笔记
   */
  getUndoNotes(): NoteData[] {
    return [...this.deletedNotes];
  }

  /**
   * 执行撤销操作
   */
  async undo(): Promise<NoteData[]> {
    if (this.undoHistory.length === 0) {
      return [];
    }

    const lastOperation = this.undoHistory.pop()!;
    const notesToRestore = lastOperation.notes;
    
    // 记录到重做历史
    this.redoHistory.push(lastOperation);
    
    // 记录审计日志
    OperationAuditService.logUndoOperation(notesToRestore, true);
    
    this.clear();
    return notesToRestore;
  }

  /**
   * 执行重做操作
   */
  async redo(): Promise<NoteData[]> {
    if (this.redoHistory.length === 0) {
      return [];
    }

    const lastRedoOperation = this.redoHistory.pop()!;
    const notesToRedo = lastRedoOperation.notes;
    
    // 记录到撤销历史
    this.undoHistory.push(lastRedoOperation);
    
    // 记录审计日志
    OperationAuditService.logRedoOperation(notesToRedo, true);
    
    this.deletedNotes = [...notesToRedo];
    this.startUndoTimer();
    
    return notesToRedo;
  }

  /**
   * 清除撤销管理器
   */
  clear(): void {
    this.deletedNotes = [];
    this.clearTimer();
  }

  /**
   * 是否有可撤销的操作
   */
  hasUndo(): boolean {
    return this.deletedNotes.length > 0;
  }

  /**
   * 获取剩余撤销时间
   */
  getRemainingTime(): number {
    return this.undoTimeout;
  }

  /**
   * 设置撤销超时时间
   */
  setUndoTimeout(timeout: number): void {
    this.undoTimeout = timeout;
  }

  private startUndoTimer(): void {
    this.clearTimer();
    this.timeoutHandle = setTimeout(() => {
      this.clear();
    }, this.undoTimeout) as unknown as number;
  }

  private clearTimer(): void {
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}

export default new UndoManager();
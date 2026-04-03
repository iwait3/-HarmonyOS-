/**
 * 操作审计日志服务 - 记录用户重要操作
 */

import { NoteData } from '../model/NoteData';

interface AuditLogDetails {
  contentItemsCount?: number;
  tags?: string[];
  isPinned?: boolean;
  notes?: Array<{id: string, title: string, contentItemsCount?: number}>;
  successCount?: number;
  totalCount?: number;
  oldTitle?: string;
  newTitle?: string;
  contentItemsChanged?: boolean;
  tagsChanged?: boolean;
}

interface AuditLog {
  id: string;
  timestamp: number;
  operationType: 'delete' | 'create' | 'modify' | 'batch_delete' | 'undo' | 'redo';
  targetType: 'note' | 'content_item' | 'batch';
  targetId: string;
  targetName: string;
  details: AuditLogDetails;
  success: boolean;
  userId?: string;
}

class OperationAuditService {
  private readonly MAX_LOG_SIZE = 1000;
  private auditLogs: AuditLog[] = [];
  private readonly STORAGE_KEY = 'operation_audit_logs';

  /**
   * 记录删除操作
   */
  logDeleteOperation(note: NoteData, success: boolean = true): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'delete',
      targetType: 'note',
      targetId: note.id,
      targetName: note.title || '未命名笔记',
      details: {
        contentItemsCount: note.contentItems?.length || 0,
        tags: note.tags || [],
        isPinned: note.isPinned || false
      },
      success: success
    };
    
    this.addLog(log);
  }

  /**
   * 记录批量删除操作
   */
  logBatchDeleteOperation(notes: NoteData[], successCount: number, totalCount: number): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'batch_delete',
      targetType: 'batch',
      targetId: 'batch_' + Date.now(),
      targetName: `批量删除 ${notes.length} 个笔记`,
      details: {
        notes: notes.map(note => ({
          id: note.id,
          title: note.title || '未命名笔记',
          contentItemsCount: note.contentItems?.length || 0
        })),
        successCount: successCount,
        totalCount: totalCount
      },
      success: successCount === totalCount
    };
    
    this.addLog(log);
  }

  /**
   * 记录创建操作
   */
  logCreateOperation(note: NoteData, success: boolean = true): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'create',
      targetType: 'note',
      targetId: note.id,
      targetName: note.title || '未命名笔记',
      details: {
        contentItemsCount: note.contentItems?.length || 0
      },
      success: success
    };
    
    this.addLog(log);
  }

  /**
   * 记录修改操作
   */
  logModifyOperation(oldNote: NoteData, newNote: NoteData, success: boolean = true): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'modify',
      targetType: 'note',
      targetId: newNote.id,
      targetName: newNote.title || '未命名笔记',
      details: {
        oldTitle: oldNote.title,
        newTitle: newNote.title,
        contentItemsChanged: newNote.contentItems?.length !== oldNote.contentItems?.length,
        tagsChanged: JSON.stringify(newNote.tags) !== JSON.stringify(oldNote.tags)
      },
      success: success
    };
    
    this.addLog(log);
  }

  /**
   * 记录撤销操作
   */
  logUndoOperation(notes: NoteData[], success: boolean = true): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'undo',
      targetType: notes.length > 1 ? 'batch' : 'note',
      targetId: 'undo_' + Date.now(),
      targetName: `撤销删除 ${notes.length} 个笔记`,
      details: {
        notes: notes.map(note => ({
          id: note.id,
          title: note.title || '未命名笔记'
        }))
      },
      success: success
    };
    
    this.addLog(log);
  }

  /**
   * 记录重做操作
   */
  logRedoOperation(notes: NoteData[], success: boolean = true): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      operationType: 'redo',
      targetType: notes.length > 1 ? 'batch' : 'note',
      targetId: 'redo_' + Date.now(),
      targetName: `重做操作 ${notes.length} 个项目`,
      details: {
        notes: notes.map(note => ({
          id: note.id,
          title: note.title || '未命名笔记'
        }))
      },
      success: success
    };
    
    this.addLog(log);
  }

  /**
   * 获取操作日志
   */
  getLogs(options?: {
    startTime?: number;
    endTime?: number;
    operationType?: string;
    successOnly?: boolean;
    limit?: number;
  }): AuditLog[] {
    let filteredLogs = [...this.auditLogs];

    if (options?.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endTime!);
    }

    if (options?.operationType) {
      filteredLogs = filteredLogs.filter(log => log.operationType === options.operationType);
    }

    if (options?.successOnly) {
      filteredLogs = filteredLogs.filter(log => log.success);
    }

    if (options?.limit) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取操作统计
   */
  getOperationStats(startTime?: number, endTime?: number): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationTypes: Record<string, number>;
    recentActivity: AuditLog[];
  } {
    const logs = this.getLogs({ startTime, endTime });
    
    const stats = {
      totalOperations: logs.length,
      successfulOperations: logs.filter(log => log.success).length,
      failedOperations: logs.filter(log => !log.success).length,
      operationTypes: {} as Record<string, number>,
      recentActivity: logs.slice(0, 10)
    };

    logs.forEach(log => {
      stats.operationTypes[log.operationType] = (stats.operationTypes[log.operationType] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清除过期日志
   */
  clearExpiredLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): void { // 默认30天
    const cutoffTime = Date.now() - maxAge;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffTime);
  }

  /**
   * 导出日志
   */
  exportLogs(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalLogs: this.auditLogs.length,
      logs: this.auditLogs
    }, null, 2);
  }

  /**
   * 添加日志到存储
   */
  private addLog(log: AuditLog): void {
    // 限制日志数量
    if (this.auditLogs.length >= this.MAX_LOG_SIZE) {
      this.auditLogs.shift();
    }
    
    this.auditLogs.push(log);
    
    // 异步保存到本地存储
    this.saveToStorage();
  }

  /**
   * 保存到本地存储
   */
  private async saveToStorage(): Promise<void> {
    try {
      // 这里可以使用HarmonyOS的持久化存储API
      // 暂时使用内存存储，实际项目中应该使用@ohos.data.storage
      console.log('Audit logs saved:', this.auditLogs.length);
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
  }

  /**
   * 从存储加载
   */
  private async loadFromStorage(): Promise<void> {
    try {
      // 从本地存储加载日志
      // 暂时使用空实现
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new OperationAuditService();
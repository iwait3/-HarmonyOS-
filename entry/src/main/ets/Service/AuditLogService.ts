/**
 * 审计日志服务 - 记录重要操作日志
 */

import { NoteData } from '../model/NoteData';
import dataPreferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';

/**
 * 日志级别
 */
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'
}

/**
 * 操作类型
 */
export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BATCH_DELETE = 'BATCH_DELETE',
  PIN = 'PIN',
  UNPIN = 'UNPIN',
  SEARCH = 'SEARCH',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT'
}

/**
 * 审计日志条目
 */
interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  operation: OperationType;
  userId?: string;
  targetType: string;
  targetId: string;
  targetName: string;
  description: string;
  details?: any;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogService {
  private preferences: dataPreferences.Preferences | null = null;
  private readonly PREFERENCE_NAME = 'audit_log_preferences';
  private readonly LOGS_KEY = 'audit_logs';
  private context: common.UIAbilityContext | null = null;
  private readonly MAX_LOG_ENTRIES = 1000;

  setContext(context: common.UIAbilityContext): void {
    this.context = context;
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (!this.preferences && this.context) {
      try {
        this.preferences = await dataPreferences.getPreferences(this.context, this.PREFERENCE_NAME);
      } catch (error) {
        console.error('Failed to initialize audit log preferences: ' + JSON.stringify(error));
      }
    }
  }

  /**
   * 记录审计日志
   */
  async log(
    operation: OperationType,
    targetType: string,
    targetId: string,
    targetName: string,
    description: string,
    success: boolean = true,
    details?: any,
    level: LogLevel = LogLevel.AUDIT
  ): Promise<void> {
    await this.init();
    
    if (!this.preferences) {
      console.error('Audit log preferences not initialized');
      return;
    }

    try {
      const logEntry: AuditLogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        level,
        operation,
        targetType,
        targetId,
        targetName,
        description,
        details,
        success
      };

      const existingLogs = await this.getAllLogs();
      const updatedLogs = [logEntry, ...existingLogs];

      // 限制日志数量
      if (updatedLogs.length > this.MAX_LOG_ENTRIES) {
        updatedLogs.splice(this.MAX_LOG_ENTRIES);
      }

      await this.preferences.put(this.LOGS_KEY, JSON.stringify(updatedLogs));
      await this.preferences.flush();

      // 控制台输出（开发环境）
      this.consoleLog(logEntry);
    } catch (error) {
      console.error('Failed to log audit entry: ' + JSON.stringify(error));
    }
  }

  /**
   * 记录笔记创建
   */
  async logNoteCreation(note: NoteData): Promise<void> {
    await this.log(
      OperationType.CREATE,
      'NOTE',
      note.id,
      note.title || '未命名笔记',
      `创建笔记: ${note.title || '未命名笔记'}`,
      true
    );
  }

  /**
   * 记录笔记更新
   */
  async logNoteUpdate(note: NoteData, oldData?: Partial<NoteData>): Promise<void> {
    await this.log(
      OperationType.UPDATE,
      'NOTE',
      note.id,
      note.title || '未命名笔记',
      `更新笔记: ${note.title || '未命名笔记'}`,
      true,
      { oldData, newData: note }
    );
  }

  /**
   * 记录笔记删除
   */
  async logNoteDeletion(note: NoteData, success: boolean = true): Promise<void> {
    await this.log(
      OperationType.DELETE,
      'NOTE',
      note.id,
      note.title || '未命名笔记',
      `删除笔记: ${note.title || '未命名笔记'}`,
      success,
      { noteData: note }
    );
  }

  /**
   * 记录批量删除
   */
  async logBatchDeletion(notes: NoteData[], successCount: number, totalCount: number): Promise<void> {
    const success = successCount === totalCount;
    await this.log(
      OperationType.BATCH_DELETE,
      'NOTE',
      'BATCH',
      `${notes.length}个笔记`,
      `批量删除笔记: 成功 ${successCount}/${totalCount}`,
      success,
      { 
        noteIds: notes.map(note => note.id),
        noteTitles: notes.map(note => note.title || '未命名笔记'),
        successCount,
        totalCount 
      }
    );
  }

  /**
   * 记录置顶操作
   */
  async logPinOperation(note: NoteData, pinned: boolean): Promise<void> {
    await this.log(
      pinned ? OperationType.PIN : OperationType.UNPIN,
      'NOTE',
      note.id,
      note.title || '未命名笔记',
      `${pinned ? '置顶' : '取消置顶'}笔记: ${note.title || '未命名笔记'}`,
      true
    );
  }

  /**
   * 记录错误操作
   */
  async logError(operation: OperationType, targetType: string, error: any): Promise<void> {
    await this.log(
      operation,
      targetType,
      'ERROR',
      '错误操作',
      `操作失败: ${error?.message || '未知错误'}`,
      false,
      { error: error?.toString() },
      LogLevel.ERROR
    );
  }

  /**
   * 获取所有日志
   */
  async getAllLogs(): Promise<AuditLogEntry[]> {
    await this.init();
    
    if (!this.preferences) {
      return [];
    }
    
    try {
      const logsJson = await this.preferences.get(this.LOGS_KEY, '[]');
      return JSON.parse(logsJson as string) as AuditLogEntry[];
    } catch (error) {
      console.error('Failed to get audit logs: ' + JSON.stringify(error));
      return [];
    }
  }

  /**
   * 根据时间范围获取日志
   */
  async getLogsByTimeRange(startTime: string, endTime: string): Promise<AuditLogEntry[]> {
    const logs = await this.getAllLogs();
    return logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * 根据操作类型获取日志
   */
  async getLogsByOperation(operation: OperationType): Promise<AuditLogEntry[]> {
    const logs = await this.getAllLogs();
    return logs.filter(log => log.operation === operation);
  }

  /**
   * 清除日志
   */
  async clearLogs(): Promise<boolean> {
    await this.init();
    
    if (!this.preferences) {
      return false;
    }
    
    try {
      await this.preferences.put(this.LOGS_KEY, '[]');
      await this.preferences.flush();
      return true;
    } catch (error) {
      console.error('Failed to clear audit logs: ' + JSON.stringify(error));
      return false;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 控制台输出日志
   */
  private consoleLog(entry: AuditLogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const status = entry.success ? '✓' : '✗';
    const levelColor = this.getLevelColor(entry.level);
    
    console.log(
      `[${timestamp}] ${status} ${levelColor}${entry.level}${levelColor} ` +
      `${entry.operation} - ${entry.description}`
    );
  }

  /**
   * 获取日志级别颜色
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return '\x1b[32m'; // 绿色
      case LogLevel.WARNING:
        return '\x1b[33m'; // 黄色
      case LogLevel.ERROR:
        return '\x1b[31m'; // 红色
      case LogLevel.AUDIT:
        return '\x1b[36m'; // 青色
      default:
        return '\x1b[0m'; // 默认
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    byOperation: Record<OperationType, number>;
    successRate: number;
    last7Days: number;
  }> {
    const logs = await this.getAllLogs();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const byLevel = {} as Record<LogLevel, number>;
    const byOperation = {} as Record<OperationType, number>;
    
    Object.values(LogLevel).forEach(level => {
      byLevel[level] = logs.filter(log => log.level === level).length;
    });
    
    Object.values(OperationType).forEach(operation => {
      byOperation[operation] = logs.filter(log => log.operation === operation).length;
    });
    
    const successCount = logs.filter(log => log.success).length;
    const last7DaysCount = logs.filter(log => log.timestamp >= sevenDaysAgo).length;
    
    return {
      total: logs.length,
      byLevel,
      byOperation,
      successRate: logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100,
      last7Days: last7DaysCount
    };
  }
}

export default new AuditLogService();
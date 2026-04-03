/**
 * 笔记管理应用 - 数据模型定义
 * 定义笔记应用的核心数据结构和类型
 */

/**
 * 笔记内容类型枚举
 * 支持多种内容类型，便于扩展和管理
 */
export enum NoteContentType {
  TEXT = 'text',        // 文本内容
  IMAGE = 'image',      // 图片文件
  DOCUMENT = 'document', // 文档文件
  AUDIO = 'audio'       // 音频文件
}

/**
 * 笔记内容项接口
 * 表示笔记中的单个内容单元，支持多种类型
 */
export interface NoteContentItem {
  type: NoteContentType;                   // 内容类型
  content: string;                         // 内容数据（文本内容或文件URI）
  metadata?: Record<string, string | number>; // 元数据（文件名、大小等）
  timestamp: string;                       // 创建时间戳
}

/**
 * 笔记数据接口
 * 表示完整的笔记对象，包含所有笔记相关信息
 */
export interface NoteData {
  id: string;                     // 唯一标识符
  title: string;                  // 笔记标题
  contentItems: NoteContentItem[]; // 内容项数组
  createTime: string;             // 创建时间
  updateTime?: string;            // 更新时间（可选）
  tags?: string[];                // 标签数组（可选）
  isPinned?: boolean;             // 是否置顶（可选）
}
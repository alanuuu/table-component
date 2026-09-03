/**
 * ProTable 常量定义
 */

/** 排序循环方向 */
export const SORT_DIRECTIONS = ['ascend', 'descend', null];

/** 默认分页配置 */
export const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
};

/** 默认表格尺寸 */
export const DEFAULT_SIZE = 'middle';

/** 支持的过滤类型 */
export const FILTER_TYPES = {
  SELECT: 'select',
  MULTI_SELECT: 'multiSelect',
  ASYNC_SELECT: 'asyncSelect',
  TREE_SELECT: 'treeSelect',
  DATE_RANGE: 'dateRange',
  INPUT: 'input',
  INPUT_NUMBER: 'inputNumber',
};

/** 日期格式 */
export const DATE_FORMAT = 'YYYY-MM-DD';

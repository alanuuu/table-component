import dayjs from 'dayjs';
import { DATE_FORMAT } from './constants';

/**
 * 从列配置中提取过滤项
 * @param {Array} columns 列配置
 * @returns {Array} 过滤字段配置数组
 */
export const extractFilterItems = (columns = []) =>
  columns
    .filter((col) => col.filter)
    .map((col) => ({
      name: col.dataIndex,
      label: col.title,
      key: col.key,
      type: col.filter.type || 'select',
      options: col.filter.options,
      treeData: col.filter.treeData,
      loadOptions: col.filter.loadOptions,
      loadTreeData: col.filter.loadTreeData,
      placeholder: col.filter.placeholder,
      formItemStyle: col.filter.formItemStyle,
      ...col.filter,
    }));

/**
 * 列配置 → key→column 映射
 */
export const buildColumnKeyMap = (columns = []) => {
  const map = {};
  columns.forEach((c) => { if (c.key) map[c.key] = c; });
  return map;
};

/**
 * 列配置 → dataIndex→column 映射
 */
export const buildColumnDataIndexMap = (columns = []) => {
  const map = new Map();
  columns.forEach((c) => {
    if (c.dataIndex !== undefined) map.set(c.dataIndex, c);
  });
  return map;
};

/**
 * 扁平化树形数据 → 收集所有 value
 */
export const collectTreeValues = (nodes = []) => {
  const arr = [];
  const walk = (list) => {
    for (const n of list) {
      if (n.value !== undefined) arr.push(n.value);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return arr;
};

/**
 * 过滤值 → Form 初始值（dayjs 转换）
 */
export const filterValuesToForm = (filterValues, filterItems) => {
  if (!filterValues) return {};
  const result = {};
  filterItems.forEach((item) => {
    const val = filterValues[item.name];
    if (val === undefined || val === null) return;
    if (item.type === 'dateRange' && val.start && val.end) {
      result[item.name] = [dayjs(val.start), dayjs(val.end)];
    } else {
      result[item.name] = val;
    }
  });
  return result;
};

/**
 * Form 值 → 过滤值（dayjs 转回字符串）
 */
export const formValuesToFilter = (formValues, filterItems) => {
  const result = {};
  filterItems.forEach((item) => {
    const val = formValues[item.name];
    if (val === undefined || val === null || (Array.isArray(val) && val.length === 0)) return;
    if (item.type === 'dateRange') {
      if (Array.isArray(val) && val.length === 2) {
        result[item.name] = {
          start: val[0].format(DATE_FORMAT),
          end: val[1].format(DATE_FORMAT),
        };
      }
    } else {
      result[item.name] = val;
    }
  });
  return result;
};

/**
 * 判断过滤值是否为空
 */
export const isEmptyFilterValue = (val) => {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
};

/**
 * 简易防抖
 */
export const debounce = (fn, wait = 300) => {
  let timer;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

/**
 * 默认比较器
 */
export const defaultComparator = (a, b, field) => {
  const va = a?.[field];
  const vb = b?.[field];
  if (va === vb) return 0;
  if (va == null) return -1;
  if (vb == null) return 1;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb), 'zh-CN', { numeric: true });
};

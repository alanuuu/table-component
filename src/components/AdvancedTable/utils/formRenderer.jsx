import { useState, useEffect, useRef } from 'react';
import { Select, DatePicker, Input, Form, InputNumber, Switch, TreeSelect, Tag, Spin } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * Form 字段类型统一 schema
 *
 * type:
 *   select       - 单选下拉
 *   multiSelect  - 多选列表（支持 options / loadOptions 远程）
 *   treeSelect   - 树形多选（支持 treeData / loadTreeData 远程懒加载）
 *   dateRange    - 日期范围
 *   input        - 文本输入
 *   inputNumber  - 数字输入
 *   switch       - 开关
 */

// ============ 远程选项缓存（全局单例，FilterDrawer 内多个组件共享）============
const optionsCache = new Map();   // key: loadOptions 函数引用.toString() 或 唯一标识
const treeDataCache = new Map();  // key: filter.name + '__tree'

/**
 * 带远程加载 + 缓存的 MultiSelect（全局查询抽屉用）
 * - 打开时自动 loadOptions 一次
 * - 缓存结果，后续不再请求
 * - 支持搜索防抖
 */
const AsyncMultiSelect = ({ loadOptions, options: staticOptions, placeholder, value, onChange, ...rest }) => {
  const [options, setOptions] = useState(staticOptions || []);
  const [loading, setLoading] = useState(false);
  const loadedOnceRef = useRef(false);
  const timerRef = useRef(null);

  const cacheKey = rest.cacheKey || loadOptions?.toString?.();

  const doLoad = async (keyword) => {
    if (typeof loadOptions !== 'function') return;
    const cacheKey = rest.cacheKey || loadOptions.toString();
    const cacheHit = keyword ? null : optionsCache.get(cacheKey);
    if (cacheHit) {
      setOptions(cacheHit);
      return;
    }
    setLoading(true);
    try {
      const list = await loadOptions(keyword);
      setOptions(list || []);
      if (!keyword) optionsCache.set(cacheKey, list || []);
    } finally {
      setLoading(false);
    }
  };

  // 首次挂载自动加载一次（缓存命中则秒显）
  useEffect(() => {
    if (!loadedOnceRef.current && typeof loadOptions === 'function') {
      loadedOnceRef.current = true;
      // 用缓存值替代立即显示，让 loading 不那么突兀
      const hit = optionsCache.get(cacheKey);
      if (hit) setOptions(hit);
      else doLoad();
    }
  }, []);

  const handleSearch = (kw) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doLoad(kw), 300);
  };

  return (
    <Select
      mode="multiple"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      allowClear
      showSearch
      optionFilterProp="label"
      loading={loading}
      virtual={(options?.length || 0) > 50}
      maxTagCount="responsive"
      onSearch={handleSearch}
      options={options}
      {...rest}
    />
  );
};

/**
 * 带远程加载 + 缓存的 TreeSelect
 */
const AsyncTreeSelect = ({ treeData: staticTreeData, loadTreeData, placeholder, value, onChange, ...rest }) => {
  const [treeData, setTreeData] = useState(staticTreeData || []);
  const treeLoadedKeysRef = useRef(new Set());

  useEffect(() => {
    if (staticTreeData) setTreeData(staticTreeData);
  }, [staticTreeData]);

  const onLoadData = async (node) => {
    if (typeof loadTreeData !== 'function') return;
    if (treeLoadedKeysRef.current.has(node.value)) return;
    const children = await loadTreeData(node);
    if (!children?.length) return;
    setTreeData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const append = (list, key) => {
        for (const n of list) {
          if (n.value === key) { n.children = children; return true; }
          if (n.children?.length && append(n.children, key)) return true;
        }
        return false;
      };
      append(next, node.value);
      return next;
    });
    treeLoadedKeysRef.current.add(node.value);
  };

  return (
    <TreeSelect
      mode="multiple"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      allowClear
      treeData={treeData}
      treeCheckable={rest.treeCheckable !== false}
      treeDefaultExpandAll={rest.treeDefaultExpandAll !== false}
      treeLoadData={typeof loadTreeData === 'function' ? onLoadData : undefined}
      showSearch
      treeNodeFilterProp="label"
      maxTagCount="responsive"
      virtual
      {...rest}
    />
  );
};

/**
 * 渲染单个表单项
 * @param {object} item - 字段配置
 * @param {object} commonProps - 公共属性
 */
export const renderFormItem = (item, commonProps = {}) => {
  const { size } = commonProps;

  const baseProps = { placeholder: item.placeholder, allowClear: true };

  let child;
  switch (item.type) {
    case 'select':
      child = (
        <Select {...baseProps} options={item.options} mode={item.mode} {...(size ? { size } : {})} />
      );
      break;

    case 'multiSelect':
      if (typeof item.loadOptions === 'function') {
        child = (
          <AsyncMultiSelect
            {...baseProps}
            loadOptions={item.loadOptions}
            options={item.options}
            cacheKey={item.name}
            {...(size ? { size } : {})}
          />
        );
      } else {
        child = (
          <Select
            {...baseProps}
            mode="multiple"
            options={item.options}
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            virtual={(item.options?.length || 0) > 50}
            {...(size ? { size } : {})}
          />
        );
      }
      break;

    case 'treeSelect':
      child = (
        <AsyncTreeSelect
          {...baseProps}
          treeData={item.treeData}
          loadTreeData={item.loadTreeData}
          treeCheckable={item.treeCheckable}
          treeDefaultExpandAll={item.treeDefaultExpandAll}
          {...(size ? { size } : {})}
        />
      );
      break;

    case 'dateRange':
      child = <RangePicker style={{ width: '100%' }} {...(size ? { size } : {})} />;
      break;

    case 'input':
      child = <Input {...baseProps} {...(size ? { size } : {})} />;
      break;

    case 'inputNumber':
      child = <InputNumber style={{ width: '100%' }} {...(size ? { size } : {})} />;
      break;

    case 'switch':
      child = <Switch {...(size ? { size } : {})} />;
      break;

    default:
      child = <Input {...baseProps} {...(size ? { size } : {})} />;
  }

  return (
    <Form.Item
      key={item.name}
      label={item.label}
      name={item.name}
      rules={item.rules}
      style={{ marginBottom: 16, ...(item.formItemStyle || {}) }}
    >
      {child}
    </Form.Item>
  );
};

/** Form values → dayjs objects → filterValues（dayjs 转回字符串） */
export const filterValuesToFormValues = (filterValues, filterItems) => {
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

/** Form values（dayjs 对象） → filterValues */
export const formValuesToFilterValues = (formValues, filterItems) => {
  const result = {};
  filterItems.forEach((item) => {
    const val = formValues[item.name];
    if (val === undefined || val === null || (Array.isArray(val) && val.length === 0)) return;
    if (item.type === 'dateRange') {
      if (val && val.length === 2) {
        result[item.name] = {
          start: val[0].format('YYYY-MM-DD'),
          end: val[1].format('YYYY-MM-DD'),
        };
      }
    } else {
      result[item.name] = val;
    }
  });
  return result;
};

/** columns → filterItems */
export const extractFilterItems = (columns) => {
  if (!columns) return [];
  return columns
    .filter((col) => col.filter)
    .map((col) => ({
      name: col.dataIndex,
      label: col.title,
      type: col.filter.type || 'select',
      options: col.filter.options,
      treeData: col.filter.treeData,
      loadOptions: col.filter.loadOptions,
      loadTreeData: col.filter.loadTreeData,
      placeholder: col.filter.placeholder,
      formItemStyle: col.filter.formItemStyle,
      ...col.filter,
    }));
};
